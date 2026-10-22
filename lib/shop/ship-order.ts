/**
 * Book, label, and track a shop order through the carrier job queue.
 * The mock carrier is in-memory, so the booking job stores the label before it returns.
 */
import { Prisma } from "@prisma/client";
import { logAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api/result";
import { escapeHtml, sendEmail } from "@/lib/email";
import { enqueueJob } from "@/lib/jobs/store";
import { sendPushToUsers } from "@/lib/push";
import { getShippingConfig, getWhatsAppConfig } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import { sendWhatsApp } from "@/lib/whatsapp";
import { carrierEventAction, carrierEventKey, carrierMove } from "./carrier-event";
import { moveShopOrder } from "./order-move";
import { isShopOrderStatus, shopStatusLabel } from "./order-status";
import { providerForEstimates } from "./shipping-resolve";
import { presetForWeight, selectRate, type ShipmentDraft } from "./shipping";
import { shopStatusNotice } from "./status-notice";

type Address = {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readAddress(value: Prisma.JsonValue | null): Address | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const address = {
    name: text(row.name),
    phone: text(row.phone),
    line1: text(row.line1),
    city: text(row.city),
    state: text(row.state),
    pincode: text(row.pincode)
  };
  if (!/^\d{6}$/.test(address.pincode) || !address.line1.trim() || !address.phone.trim()) return null;
  return address;
}

function tomorrowDate() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function enqueueOrderJob(type: string, orderId: string, runAt?: Date) {
  const pending = await prisma.job.findFirst({
    where: {
      type,
      status: { in: ["PENDING", "RUNNING"] },
      payload: { path: ["orderId"], equals: orderId }
    }
  });
  if (pending) return pending;
  return enqueueJob({ type, payload: { orderId }, runAt });
}

export async function queueShopShipment(orderId: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, lines: { select: { ships: true } } }
  });
  if (!order) return fail(404, "Order not found");
  if (order.status !== "PACKED") return fail(400, "Pack the order before booking a shipment");
  if (!order.lines.some((line) => line.ships)) return fail(400, "This order does not ship");
  await enqueueOrderJob("shop.ship", order.id);
  return ok({ queued: true });
}

export async function queueShopLabels(orderIds: string[]) {
  const ids = [...new Set(orderIds.map((id) => id.trim()).filter(Boolean))].slice(0, 50);
  let queued = 0;
  for (const id of ids) {
    const row = await prisma.shopShipment.findUnique({ where: { orderId: id }, select: { labelBase64: true } });
    if (row?.labelBase64) continue;
    await enqueueOrderJob("shop.label", id);
    queued += 1;
  }
  return queued;
}

export async function shopLabelsText(orderIds: string[]) {
  const ids = [...new Set(orderIds.map((id) => id.trim()).filter(Boolean))].slice(0, 50);
  const rows = await prisma.shopShipment.findMany({
    where: { orderId: { in: ids }, labelBase64: { not: null } },
    select: { awb: true, labelBase64: true }
  });
  return rows
    .map((row) => Buffer.from(row.labelBase64 || "", "base64").toString("utf8"))
    .filter(Boolean)
    .join("\n\n");
}

async function loadOrder(orderId: string) {
  return prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: {
      lines: true,
      shipment: true,
      business: { select: { name: true, ownerId: true } },
      user: { select: { id: true, email: true, phone: true, name: true } }
    }
  });
}

export async function bookShopShipment(orderId: string) {
  const order = await loadOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (!order.lines.some((line) => line.ships)) throw new Error("This order does not ship");
  const address = readAddress(order.addressJson);
  if (!address) throw new Error("Add a shipping address first");
  const config = await getShippingConfig();
  const carrier = providerForEstimates(config, process.env.NODE_ENV);
  if (!carrier.configured) throw new Error("Not configured");

  const weight = Math.max(
    1,
    order.lines.reduce((sum, line) => sum + (line.ships ? line.weightGrams * line.qty : 0), 0)
  );
  const preset = presetForWeight(config.presets, weight);
  const box = preset ?? { lengthMm: 160, widthMm: 120, heightMm: 50 };
  const line = order.lines.find((item) => item.ships) ?? order.lines[0];
  const draft: ShipmentDraft = {
    orderId: order.id,
    name: address.name || order.buyerLegalName || "QR24x7",
    phone: address.phone,
    line1: address.line1,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    weightGrams: weight,
    lengthMm: box.lengthMm,
    widthMm: box.widthMm,
    heightMm: box.heightMm,
    paymentMode: order.cod ? "COD" : "PREPAID",
    codPaise: order.cod ? order.balancePaise : 0,
    itemName: line?.name || "QR24x7",
    sku: line?.sku || "SHOP",
    amountPaise: order.totalPaise
  };

  let shipmentId = order.shipment?.shipmentId || "";
  let awb = order.shipment?.awb || "";
  let courierName = order.shipment?.courierName || "";
  if (!shipmentId) {
    const created = await carrier.createShipment(draft);
    if (!created.ok) throw new Error(created.error);
    shipmentId = created.data.shipmentId;
    awb = created.data.awb || "";
    courierName = created.data.courierName || "";
    const rates = await carrier.getRates({
      pincode: address.pincode,
      weightGrams: weight,
      lengthMm: box.lengthMm,
      widthMm: box.widthMm,
      heightMm: box.heightMm,
      paymentMode: draft.paymentMode
    });
    if (rates.ok) {
      const chosen = selectRate(rates.data);
      if (chosen) {
        const assigned = await carrier.assignCourier({ shipmentId, courierId: chosen.courierId });
        if (assigned.ok) {
          awb = assigned.data.awb || awb;
          courierName = assigned.data.courierName || chosen.courierName;
        }
      }
    }
    await prisma.shopShipment.upsert({
      where: { orderId: order.id },
      create: { orderId: order.id, provider: carrier.id, shipmentId, awb: awb || null, courierName: courierName || null },
      update: { provider: carrier.id, shipmentId, awb: awb || null, courierName: courierName || null, lastError: null }
    });
  }

  const current = await prisma.shopShipment.findUnique({ where: { orderId: order.id } });
  if (current && !current.labelBase64) {
    let bytes: Uint8Array | null = null;
    let filename = `${shipmentId}.txt`;
    const label = await carrier.generateLabel(shipmentId);
    if (label.ok) {
      bytes = label.data.bytes;
      filename = label.data.filename;
    } else if (carrier.id === "mock" && awb) {
      bytes = new TextEncoder().encode(`MOCK LABEL ${awb}`);
    } else if (!label.ok) {
      throw new Error(label.error);
    }
    if (bytes) {
      await prisma.shopShipment.update({
        where: { orderId: order.id },
        data: { labelName: filename, labelBase64: Buffer.from(bytes).toString("base64"), lastError: null }
      });
    }
  }

  const booked = await prisma.shopShipment.findUnique({ where: { orderId: order.id } });
  if (booked && !booked.pickupId) {
    const pickup = await carrier.schedulePickup({ shipmentId, date: tomorrowDate() });
    if (!pickup.ok) throw new Error(pickup.error);
    await prisma.shopShipment.update({
      where: { orderId: order.id },
      data: { pickupId: pickup.data.pickupId, lastError: null }
    });
  }

  if (order.status === "PACKED") {
    const moved = await moveShopOrder({
      orderId: order.id,
      to: "PICKUP_SCHEDULED",
      actor: "admin",
      userId: order.userId,
      via: "carrier"
    });
    if (!moved.ok) throw new Error(moved.error);
  }
  await enqueueOrderJob("shop.track", order.id, new Date(Date.now() + 15 * 60 * 1000));
  return { ok: true };
}

export async function labelShopShipment(orderId: string) {
  const shipment = await prisma.shopShipment.findUnique({ where: { orderId } });
  if (!shipment?.shipmentId) throw new Error("Book the shipment before printing a label");
  if (shipment.labelBase64) return { ok: true };
  const config = await getShippingConfig();
  const carrier = providerForEstimates(config, process.env.NODE_ENV);
  if (!carrier.configured) throw new Error("Not configured");
  const label = await carrier.generateLabel(shipment.shipmentId);
  if (!label.ok) {
    if (carrier.id === "mock" && shipment.awb) {
      await prisma.shopShipment.update({
        where: { orderId },
        data: {
          labelName: `${shipment.shipmentId}.txt`,
          labelBase64: Buffer.from(`MOCK LABEL ${shipment.awb}`).toString("base64")
        }
      });
      return { ok: true };
    }
    throw new Error(label.error);
  }
  await prisma.shopShipment.update({
    where: { orderId },
    data: { labelName: label.data.filename, labelBase64: Buffer.from(label.data.bytes).toString("base64"), lastError: null }
  });
  return { ok: true };
}

async function applyCarrierStatus(orderId: string, from: string, statusText: string, detail: string, userId: string) {
  if (!isShopOrderStatus(from)) return;
  const action = carrierEventAction(statusText);
  const decision = carrierMove(from, action);
  if (decision.ndr) {
    const note = detail.trim() || statusText.trim();
    await prisma.shopShipment.update({ where: { orderId }, data: { ndrNote: note } });
    await logAudit({
      userId,
      action: "shop.order.ndr",
      entity: "ShopOrder",
      entityId: orderId,
      metadata: { from, to: from, comment: note }
    });
    await enqueueJob({
      type: "shop.notify",
      payload: { orderId, status: from, ndr: note },
      idempotencyKey: `shop.notify:${orderId}:ndr:${note}`.slice(0, 180)
    });
    return;
  }
  if (!decision.to) return;
  const moved = await moveShopOrder({
    orderId,
    to: decision.to,
    actor: "admin",
    userId,
    via: "carrier"
  });
  if (!moved.ok) throw new Error(moved.error);
}

export async function trackShopShipment(orderId: string) {
  const order = await loadOrder(orderId);
  if (!order?.shipment?.awb) return { ok: true };
  const config = await getShippingConfig();
  const carrier = providerForEstimates(config, process.env.NODE_ENV);
  if (!carrier.configured || carrier.id === "mock") return { ok: true };
  const tracked = await carrier.trackShipment(order.shipment.awb);
  if (!tracked.ok) throw new Error(tracked.error);
  const detail = tracked.data.events[tracked.data.events.length - 1]?.detail || "";
  await applyCarrierStatus(order.id, order.status, tracked.data.status, detail, order.userId);
  const action = carrierEventAction(tracked.data.status);
  if (action === "shipped" || action === "ignore") {
    await enqueueOrderJob("shop.track", order.id, new Date(Date.now() + 60 * 60 * 1000));
  }
  return { ok: true };
}

export async function acceptCarrierWebhook(input: { token: string | null; eventId: string; awb: string; status: string; detail?: string }) {
  const config = await getShippingConfig();
  const carrier = providerForEstimates(config, process.env.NODE_ENV);
  if (!carrier.verifyWebhook(input.token)) return fail(401, "Invalid token");
  if (!input.eventId.trim() || !input.awb.trim() || !input.status.trim()) {
    return fail(400, "Event id, AWB, and status are required");
  }
  const eventKey = carrierEventKey(input.eventId, input.awb, input.status);
  try {
    await prisma.shopCarrierEvent.create({
      data: { eventKey, awb: input.awb.trim(), status: input.status.trim(), orderId: null }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return ok({ duplicate: true });
    }
    throw error;
  }
  const shipment = await prisma.shopShipment.findFirst({
    where: { awb: input.awb.trim() },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { id: true, status: true, userId: true } } }
  });
  if (!shipment) return ok({ duplicate: false });
  try {
    await prisma.shopCarrierEvent.update({ where: { eventKey }, data: { orderId: shipment.orderId } });
    await applyCarrierStatus(shipment.order.id, shipment.order.status, input.status, input.detail || "", shipment.order.userId);
  } catch (error) {
    await prisma.shopCarrierEvent.delete({ where: { eventKey } }).catch(() => undefined);
    throw error;
  }
  return ok({ duplicate: false });
}

export async function notifyShopStatus(orderId: string, status: string, ndr?: string) {
  const order = await loadOrder(orderId);
  if (!order) throw new Error("Order not found");
  const label = isShopOrderStatus(status) ? shopStatusLabel(status) : status;
  const trackingUrl = absoluteUrl(`/dashboard/shop/orders/${order.id}`);
  const notice = shopStatusNotice({
    statusLabel: label,
    businessName: order.business?.name || order.buyerLegalName || "QR24x7",
    trackingUrl,
    awb: order.shipment?.awb,
    ndr
  });
  if (order.user.email) {
    await sendEmail({
      to: order.user.email,
      subject: notice.subject,
      text: notice.text,
      html: `<p>${escapeHtml(notice.text).replaceAll("\n", "<br>")}</p>`
    });
  }
  const whatsapp = await getWhatsAppConfig();
  const phone = order.user.phone;
  if (phone && (whatsapp.provider === "cloud-api" || whatsapp.provider === "baileys")) {
    try {
      await sendWhatsApp({ to: phone, message: notice.text });
    } catch (error) {
      console.warn("[shop] WhatsApp status notice failed", error);
    }
  }
  const userIds = [order.user.id];
  if (order.business?.ownerId && order.business.ownerId !== order.user.id) userIds.push(order.business.ownerId);
  await sendPushToUsers(userIds, { title: notice.subject, body: notice.text, data: { url: trackingUrl } });
  return { ok: true };
}

export async function runShopJob(type: string, payload: Record<string, unknown>) {
  const orderId = text(payload.orderId);
  if (!orderId) throw new Error("Job payload is empty");
  if (type === "shop.ship") return bookShopShipment(orderId);
  if (type === "shop.label") return labelShopShipment(orderId);
  if (type === "shop.track") return trackShopShipment(orderId);
  if (type === "shop.notify") return notifyShopStatus(orderId, text(payload.status), text(payload.ndr) || undefined);
  throw new Error(`Unknown job type ${type}`);
}

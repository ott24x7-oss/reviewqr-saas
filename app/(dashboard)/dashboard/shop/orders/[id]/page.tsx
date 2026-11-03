import Link from "next/link";
import { notFound } from "next/navigation";
import { ProofReply } from "@/components/shop/proof-reply";
import { ReprintRequest } from "@/components/shop/reprint-request";
import { ShopOrderActions } from "@/components/shop/order-actions";
import { ShopManualUpiPayment } from "@/components/shop/manual-upi-payment";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shopCopy } from "@/lib/shop/i18n";
import { canManageShopOrder } from "@/lib/shop/order-access";
import { isShopOrderStatus, shopStatusLabel } from "@/lib/shop/order-status";
import { canChangeShopAddress, shopCancelDecision } from "@/lib/shop/owner-actions";
import { getSiteConfig } from "@/lib/settings";
import { getPaymentsConfig } from "@/lib/settings";
import { absoluteUrl, formatINR } from "@/lib/utils";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export default async function ShopOrderPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const found = await prisma.shopOrder.findUnique({
    where: { id: params.id },
    include: { lines: true, shipment: true, creditNotes: { orderBy: { createdAt: "desc" } }, cancellationRequest: { select: { status: true, refundAmountPaise: true } } }
  });
  if (!found || !(await canManageShopOrder(user.id, found))) notFound();
  const order = found;
  const pendingReprint = await prisma.shopReprintRequest.findFirst({
    where: { orderId: order.id, status: "PENDING" },
    select: { id: true }
  });
  const copy = shopCopy("en");
  const [site, payments] = await Promise.all([getSiteConfig(), getPaymentsConfig()]);
  const events = await prisma.auditLog.findMany({
    where: { entity: "ShopOrder", entityId: order.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, action: true, metadata: true, createdAt: true }
  });
  const printed = order.lines.some((line) => line.needsDesign);
  const status = isShopOrderStatus(order.status) ? shopStatusLabel(order.status) : order.status;
  const cancelDecision = shopCancelDecision(order.status, order.paymentStatus, order.totalPaise, order.cod ? order.advancePaise : order.totalPaise);
  const canCancel = order.userId === user.id && cancelDecision.allowed && !order.cancellationRequest;
  const canPay = order.status === "PENDING_PAYMENT" && order.paymentStatus === "PENDING";
  const gstRegistered = Boolean(order.sellerGstin?.trim());
  const manualUpi = canPay && payments.upiGateway === "manual" && payments.upiEnabled && !!payments.upiId && !!order.expiresAt;
  const amountRupees = (order.advancePaise / 100).toFixed(2);
  const upiLink = manualUpi
    ? `upi://pay?pa=${encodeURIComponent(payments.upiId)}&pn=${encodeURIComponent(payments.upiPayeeName || "QR24x7")}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(`QR24x7 ${order.id.slice(-8)}`)}`
    : "";
  const upiQr = manualUpi ? await QRCode.toDataURL(upiLink, { margin: 1, width: 360, errorCorrectionLevel: "M" }) : "";
  const canChangeAddress = order.userId === user.id && canChangeShopAddress(order.status, Boolean(order.shipment?.awb || order.shipment?.shipmentId));
  const address = order.addressJson && typeof order.addressJson === "object" && !Array.isArray(order.addressJson) ? order.addressJson as Record<string, unknown> : null;
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-ink">
      <Link href="/dashboard/shop/orders" className="text-sm text-muted-ink">{copy.orders}</Link>
      <h1 className="font-display text-2xl font-bold">{status}</h1>
      {order.paymentStatus === "PAID_AFTER_CANCELLATION" && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Payment arrived after cancellation. Support will review whether to refund or reinstate this order.
        </p>
      )}
      <section className="space-y-2 rounded-[20px] bg-white p-4 shadow-sm">
        <h2 className="font-semibold">{gstRegistered ? "Tax invoice" : "Bill of supply"}</h2>
        <p className="text-sm">{order.invoiceNumber || "Invoice number is issued after payment."}</p>
        <p className="text-sm">{order.sellerName}{gstRegistered ? ` · ${order.sellerGstin}` : ""}</p>
        {order.buyerLegalName && <p className="text-sm">{order.buyerLegalName}</p>}
        {gstRegistered && order.buyerGstin && <p className="text-sm">GSTIN {order.buyerGstin}</p>}
        {gstRegistered && <p className="text-sm">Place of supply {order.buyerState || order.sellerState || "Same as seller"}</p>}
        <ul className="space-y-2 pt-2 text-sm">
          {order.lines.map((line) => (
            <li key={line.id}>
              <p className="font-medium">{line.name} × {line.qty}</p>
              <p>{gstRegistered ? `HSN ${line.hsn} · ${line.gstPercent}% · ` : ""}{formatINR(line.netPaise)}</p>
              {line.proofUrl && (
                <p>
                  <a className="font-semibold underline" href={`/api/v1/shop/orders/${order.id}/proof?line=${line.id}`}>{copy.proof}</a>
                </p>
              )}
              {line.changeComment && <p>{line.changeComment}</p>}
            </li>
          ))}
        </ul>
        {gstRegistered && <>
          <p className="text-sm">Taxable {formatINR(order.taxablePaise)}</p>
          <p className="text-sm">CGST {formatINR(order.cgstPaise)} · SGST {formatINR(order.sgstPaise)} · IGST {formatINR(order.igstPaise)}</p>
        </>}
        <p className="text-lg font-semibold">{copy.total} {formatINR(order.totalPaise)}</p>
        {order.balancePaise > 0 && <p className="text-sm">Paid now {formatINR(order.advancePaise)} · Balance {formatINR(order.balancePaise)}</p>}
        {order.creditNotes.length > 0 && (
          <ul className="space-y-1 pt-2">
            {order.creditNotes.map((note) => (
              <li key={note.id}>Credit note {note.number} · {formatINR(note.amountPaise)} · {note.reason}</li>
            ))}
          </ul>
        )}
      </section>
      <ShopOrderActions
        orderId={order.id}
        status={status}
        paymentStatus={order.paymentStatus}
        canPay={canPay && !manualUpi}
        canCancel={canCancel}
        cancellationStatus={order.cancellationRequest?.status ?? null}
        refundAmountPaise={order.cancellationRequest?.refundAmountPaise ?? (order.paymentStatus === "PAID" ? order.cod ? order.advancePaise : order.totalPaise : 0)}
        canChangeAddress={canChangeAddress}
        addressPincode={typeof address?.pincode === "string" ? address.pincode : null}
        addressState={typeof address?.state === "string" ? address.state : null}
        supportWhatsappNumber={site.supportWhatsappNumber}
      />
      {manualUpi && order.expiresAt && <ShopManualUpiPayment
        orderId={order.id}
        amountPaise={order.advancePaise}
        expiresAt={order.expiresAt.toISOString()}
        upiId={payments.upiId}
        payee={payments.upiPayeeName || "QR24x7"}
        qrDataUrl={upiQr}
        upiLink={upiLink}
      />}
      {order.status === "DELIVERED" && <ReprintRequest orderId={order.id} pending={Boolean(pendingReprint)} />}
      {order.status === "PROOF_SENT" && (
        <section className="space-y-3 rounded-[20px] bg-white p-4 shadow-sm">
          <ProofReply orderId={order.id} />
        </section>
      )}
      <section className="space-y-2 rounded-[20px] bg-white p-4 text-sm shadow-sm">
        <h2 className="font-semibold">{copy.timeline}</h2>
        {events.length === 0 && <p>No updates yet.</p>}
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id}>{timelineText(event.action, event.metadata)}</li>
          ))}
        </ul>
      </section>
      {order.shipment?.awb && (
        <section className="space-y-1 rounded-[20px] bg-white p-4 text-sm shadow-sm">
          <h2 className="font-semibold">{copy.tracking}</h2>
          <p>{copy.awb} {order.shipment.awb}</p>
          {order.shipment.courierName && <p>{order.shipment.courierName}</p>}
          {order.shipment.ndrNote && <p>{copy.ndr}: {order.shipment.ndrNote}</p>}
          <p>{absoluteUrl(`/dashboard/shop/orders/${order.id}`)}</p>
        </section>
      )}
      {printed && <p className="rounded-[20px] bg-white p-4 text-sm shadow-sm">{copy.policy}</p>}
    </div>
  );
}

function timelineText(action: string, metadata: unknown) {
  if (action === "shop.order.cancel.request") return "Cancellation requested · waiting for admin review";
  if (action === "shop.order.address.change") return "Delivery address updated";
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const row = metadata as { from?: unknown; to?: unknown; comment?: unknown };
  const from = typeof row.from === "string" && isShopOrderStatus(row.from) ? shopStatusLabel(row.from) : "";
  const to = typeof row.to === "string" && isShopOrderStatus(row.to) ? shopStatusLabel(row.to) : "";
  const comment = typeof row.comment === "string" ? row.comment : "";
  return [from && to ? `${from} → ${to}` : "", comment].filter(Boolean).join(" · ");
}

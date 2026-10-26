import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminShopActionSchema } from "@reviewqr/shared";
import { parseJson, v1Data, v1Error, v1From } from "@/lib/api/v1";
import { writeAdminAudit } from "@/lib/admin/audit-write";
import { requireAdminActor } from "@/lib/admin/guard";
import { approveAdminShopProof, loadAdminShopOrder, moveAdminShopOrder, trackAdminShopOrder } from "@/lib/admin/shop-admin";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  return v1From(await loadAdminShopOrder(context?.params.id || ""));
}

async function postHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminShopActionSchema);
  if (!parsed.ok) return parsed.response;
  const id = context?.params.id || "";
  const audit = { userId: auth.actor.user.id, deviceId: auth.actor.device.id, ip: auth.actor.ip };
  if (parsed.data.action === "approve-proof") return v1From(await approveAdminShopProof(id, audit));
  if (parsed.data.action === "move") {
    if (!parsed.data.to) return v1Error(400, "VALIDATION", "Choose the next status");
    return v1From(await moveAdminShopOrder(id, parsed.data.to, parsed.data.comment, audit));
  }
  const tracked = await trackAdminShopOrder(id, parsed.data.awb || "", parsed.data.courierName, audit);
  if (!tracked.ok) return v1From(tracked);
  if (!tracked.data.moved) {
    await writeAdminAudit(auth.actor, req, {
      action: "shop.order.track",
      entity: "ShopOrder",
      entityId: id,
      after: { awb: tracked.data.awb, status: tracked.data.status }
    });
  }
  return v1Data(tracked.data);
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);

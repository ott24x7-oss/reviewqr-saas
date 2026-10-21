import { observe } from "@/lib/api/observe";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJson, requireV1User, v1Error, v1From } from "@/lib/api/v1";
import { prisma } from "@/lib/db";
import { canManageShopOrder } from "@/lib/shop/order-access";
import { moveShopOrder } from "@/lib/shop/order-move";
import { proofPdf } from "@/lib/shop/proof";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["approve", "changes"]),
  comment: z.string().max(500).optional()
});

async function loadOrder(id: string) {
  return prisma.shopOrder.findUnique({
    where: { id },
    select: { id: true, userId: true, businessId: true }
  });
}

async function postHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const order = await loadOrder(context?.params.id || "");
  if (!order) return v1Error(404, "NOT_FOUND", "Order not found");
  if (!(await canManageShopOrder(auth.user.id, order))) {
    return v1Error(403, "FORBIDDEN", "You cannot update this order");
  }
  const result = await moveShopOrder({
    orderId: order.id,
    to: parsed.data.action === "approve" ? "APPROVED" : "CHANGES_REQUESTED",
    actor: "owner",
    userId: auth.user.id,
    comment: parsed.data.comment
  });
  return v1From(result);
}

async function getHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const order = await loadOrder(context?.params.id || "");
  if (!order) return v1Error(404, "NOT_FOUND", "Order not found");
  if (!(await canManageShopOrder(auth.user.id, order))) {
    return v1Error(403, "FORBIDDEN", "You cannot update this order");
  }
  const bytes = await proofPdf(order.id, req.nextUrl.searchParams.get("line") || "");
  if (!bytes) return v1Error(404, "NOT_FOUND", "Proof not found");
  const res = new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="proof.pdf"',
      "cache-control": "private, no-store"
    }
  });
  return res;
}

export const POST = observe(postHandler);
export const GET = observe(getHandler);

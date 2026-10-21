import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireAdminApi } from "@/lib/admin";
import type { CatalogProductInput } from "@/lib/shop/catalog";
import { updateCatalogProduct } from "@/lib/shop/catalog-store";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const body = (await req.json().catch(() => ({}))) as Partial<CatalogProductInput>;
  const result = await updateCatalogProduct(params.id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await logAudit({
    userId: admin.user.id,
    action: "catalog.update",
    entity: "CatalogProduct",
    entityId: params.id
  });
  return NextResponse.json({ product: result.product });
}

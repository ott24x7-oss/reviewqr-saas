import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireAdminApi } from "@/lib/admin";
import type { CatalogVariantInput } from "@/lib/shop/catalog";
import { addCatalogVariant } from "@/lib/shop/catalog-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const body = (await req.json().catch(() => ({}))) as { productId?: string; variant?: CatalogVariantInput };
  if (!body.productId || !body.variant) {
    return NextResponse.json({ error: "Product and variant are required" }, { status: 400 });
  }
  const result = await addCatalogVariant(body.productId, body.variant).catch((err: Error) => ({
    ok: false as const,
    error: err.message || "Could not add the variant"
  }));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await logAudit({
    userId: admin.user.id,
    action: "catalog.update",
    entity: "CatalogVariant",
    entityId: result.variant.id
  });
  return NextResponse.json({ variant: result.variant });
}

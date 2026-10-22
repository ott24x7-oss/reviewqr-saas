import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireAdminApi } from "@/lib/admin";
import type { CatalogProductInput, CatalogVariantInput } from "@/lib/shop/catalog";
import { createCatalogProduct, listCatalog } from "@/lib/shop/catalog-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const products = await listCatalog();
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminApi();
  if ("error" in admin && admin.error) return admin.error;
  const body = (await req.json().catch(() => ({}))) as { product?: CatalogProductInput; variant?: CatalogVariantInput };
  if (!body.product || !body.variant) {
    return NextResponse.json({ error: "Product and variant are required" }, { status: 400 });
  }
  const result = await createCatalogProduct(body.product, body.variant).catch((err: Error) => ({
    ok: false as const,
    error: err.message || "Could not create the product"
  }));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  await logAudit({
    userId: admin.user.id,
    action: "catalog.update",
    entity: "CatalogProduct",
    entityId: result.product.id
  });
  return NextResponse.json({ product: result.product });
}

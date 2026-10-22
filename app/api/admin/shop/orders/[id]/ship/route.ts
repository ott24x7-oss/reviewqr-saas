import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { getShippingConfig } from "@/lib/settings";
import { queueShopShipment } from "@/lib/shop/ship-order";
import { adminCarrierState } from "@/lib/shop/shipping";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const state = adminCarrierState(await getShippingConfig(), process.env.NODE_ENV);
  if (state === "Not configured") return NextResponse.json({ error: "Not configured" }, { status: 400 });
  const result = await queueShopShipment(params.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

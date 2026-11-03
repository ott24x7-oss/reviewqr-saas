import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { readShopOrder } from "@/lib/shop/order-detail";
import { matchPendingBankCreditsForShopOrder } from "@/lib/bank-credit-ledger";

export const dynamic = "force-dynamic";
const lastBankMatch = new Map<string, number>();

async function getHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const last = lastBankMatch.get(params.id) || 0;
  if (Date.now() - last > 5_000) {
    lastBankMatch.set(params.id, Date.now());
    await matchPendingBankCreditsForShopOrder(params.id).catch(() => false);
  }
  return v1From(await readShopOrder(auth.user.id, params.id));
}

export const GET = observe(getHandler);

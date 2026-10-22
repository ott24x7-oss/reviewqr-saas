import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadDaySummary, loadOrderCards, ownedStoreBlock } from "@/lib/store/order-feed";

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locked = await ownedStoreBlock(user.id);
  if (locked) return NextResponse.json({ error: locked }, { status: 403 });
  const [orders, summary] = await Promise.all([loadOrderCards(user.id), loadDaySummary(user.id)]);
  return NextResponse.json({ orders, summary });
}

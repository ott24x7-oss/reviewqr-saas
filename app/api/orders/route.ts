import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadOrderCards } from "@/lib/store/order-feed";

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ orders: await loadOrderCards(user.id) });
}

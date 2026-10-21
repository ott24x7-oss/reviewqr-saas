import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { setOrderStatus } from "@/lib/store/order-command";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => ({}));
  return v1From(await setOrderStatus(auth.user.id, params.id, raw));
}

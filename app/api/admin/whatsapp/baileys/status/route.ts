import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { getBaileys } from "@/lib/whatsapp-baileys";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const mgr = getBaileys();
  return NextResponse.json(mgr.getInfo());
}

import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { v1From } from "@/lib/api/v1";
import { loadAdminDashboard } from "@/lib/admin/dashboard";
import { requireAdminActor } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  return v1From(await loadAdminDashboard(req.nextUrl.searchParams));
}
export const GET = observe(getHandler);

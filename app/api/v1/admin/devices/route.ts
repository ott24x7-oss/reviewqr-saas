import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { v1Data } from "@/lib/api/v1";
import { adminDeviceRows } from "@/lib/admin/devices";
import { requireAdminActor } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  return v1Data({ devices: await adminDeviceRows() });
}
export const GET = observe(getHandler);

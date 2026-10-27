import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { v1Data } from "@/lib/api/v1";
import { requireAdminActor } from "@/lib/admin/guard";
import { maskPhone } from "@/lib/admin/mask";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  return v1Data({
    name: auth.actor.user.name || "",
    phoneMasked: maskPhone(auth.actor.user.phone),
    device: { name: auth.actor.device.name, status: auth.actor.device.status }
  });
}
export const GET = observe(getHandler);

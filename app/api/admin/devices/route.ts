import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { adminDeviceRows, setAdminDeviceStatus, signOutAllAdminDevices } from "@/lib/admin/devices";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  action: z.enum(["approve", "revoke", "signout"]),
  deviceId: z.string().optional()
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const ip = getClientIp(req.headers);
  if (parsed.data.action === "signout") {
    await signOutAllAdminDevices(guard.user.id, ip, null);
    return NextResponse.json({ ok: true, devices: await adminDeviceRows() });
  }
  if (!parsed.data.deviceId) return NextResponse.json({ error: "Choose a device" }, { status: 400 });
  const result = await setAdminDeviceStatus({
    deviceId: parsed.data.deviceId,
    action: parsed.data.action,
    actorId: guard.user.id,
    ip
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, devices: await adminDeviceRows() });
}

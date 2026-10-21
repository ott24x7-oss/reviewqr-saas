import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { getShippingConfig, setShippingConfig } from "@/lib/settings";
import { pickupError, presetError, type PackagingPreset, type ShippingConfig } from "@/lib/shop/shipping";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const incoming = (await req.json().catch(() => ({}))) as Partial<ShippingConfig>;
  const current = await getShippingConfig();
  const provider = incoming.provider === "shiprocket" || incoming.provider === "delhivery" || incoming.provider === "mock"
    ? incoming.provider
    : current.provider;
  const presets = Array.isArray(incoming.presets) ? incoming.presets.map(cleanPreset) : current.presets;
  for (const preset of presets) {
    const error = presetError(preset);
    if (error) return NextResponse.json({ error }, { status: 400 });
  }
  const pickup = {
    name: String(incoming.pickup?.name ?? current.pickup.name).trim(),
    phone: String(incoming.pickup?.phone ?? current.pickup.phone).replace(/\s+/g, ""),
    line1: String(incoming.pickup?.line1 ?? current.pickup.line1).trim(),
    city: String(incoming.pickup?.city ?? current.pickup.city).trim(),
    state: String(incoming.pickup?.state ?? current.pickup.state).trim(),
    pincode: String(incoming.pickup?.pincode ?? current.pickup.pincode).trim()
  };
  const pickupProblem = pickupError(pickup);
  if (pickupProblem) return NextResponse.json({ error: pickupProblem }, { status: 400 });
  const next: ShippingConfig = {
    provider,
    shiprocketEmail: String(incoming.shiprocketEmail ?? current.shiprocketEmail).trim(),
    shiprocketPassword: typeof incoming.shiprocketPassword === "string" ? incoming.shiprocketPassword : current.shiprocketPassword,
    delhiveryToken: typeof incoming.delhiveryToken === "string" ? incoming.delhiveryToken : current.delhiveryToken,
    webhookSecret: typeof incoming.webhookSecret === "string" ? incoming.webhookSecret : current.webhookSecret,
    pickup,
    presets
  };
  await setShippingConfig(next, guard.user.id);
  await logAudit({
    userId: guard.user.id,
    action: "settings.shipping.update",
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}

function cleanPreset(row: PackagingPreset): PackagingPreset {
  return {
    id: String(row?.id || "").trim(),
    name: String(row?.name || "").trim(),
    lengthMm: Math.floor(Number(row?.lengthMm)),
    widthMm: Math.floor(Number(row?.widthMm)),
    heightMm: Math.floor(Number(row?.heightMm)),
    weightGrams: Math.floor(Number(row?.weightGrams))
  };
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { setPricingConfig, getPricingConfig, type PricingConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";

const TIERS = ["FREE", "STARTER", "GROWTH", "AGENCY"] as const;

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  return NextResponse.json(await getPricingConfig());
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => ({}))) as Partial<PricingConfig>;
  const next = await getPricingConfig();
  for (const t of TIERS) {
    const incoming = body[t];
    if (!incoming) continue;
    next[t] = {
      ...next[t],
      name: String(incoming.name ?? next[t].name).slice(0, 60),
      tagline: String(incoming.tagline ?? next[t].tagline).slice(0, 200),
      monthly: Math.max(0, Math.floor(Number(incoming.monthly ?? next[t].monthly))),
      yearly: Math.max(0, Math.floor(Number(incoming.yearly ?? next[t].yearly))),
      features: Array.isArray(incoming.features)
        ? incoming.features.map((s) => String(s).slice(0, 200)).filter(Boolean).slice(0, 30)
        : next[t].features,
      visible: incoming.visible ?? next[t].visible,
      highlighted: !!incoming.highlighted,
      limits: {
        businesses: Math.max(
          0,
          Math.floor(Number(incoming.limits?.businesses ?? next[t].limits.businesses))
        ),
        locations: Math.max(
          0,
          Math.floor(Number(incoming.limits?.locations ?? next[t].limits.locations))
        ),
        staff: Math.max(0, Math.floor(Number(incoming.limits?.staff ?? next[t].limits.staff))),
        qrCodes: Math.max(
          0,
          Math.floor(Number(incoming.limits?.qrCodes ?? next[t].limits.qrCodes))
        ),
        reviews: Math.max(
          0,
          Math.floor(Number(incoming.limits?.reviews ?? next[t].limits.reviews))
        )
      }
    };
  }

  await setPricingConfig(next, guard.user.id);
  await logAudit({
    userId: guard.user.id,
    action: "pricing.update",
    ip: getClientIp(req.headers)
  });
  return NextResponse.json({ ok: true });
}

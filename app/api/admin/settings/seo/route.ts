import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getSeoConfig, setSeoConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";
import { SEO_STATIC_ROUTES } from "@/lib/seo";

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const incoming = await req.json().catch(() => null);
  const before = await getSeoConfig();
  const saved = await setSeoConfig(incoming, guard.user.id);
  if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 });

  const config = saved.config;
  const auditSummary = (value: typeof config) => ({
    defaultTitleTemplate: value.defaultTitleTemplate,
    defaultDescriptionEn: value.defaultDescriptionEn,
    defaultDescriptionHi: value.defaultDescriptionHi,
    defaultOgImageUrl: value.defaultOgImageUrl,
    twitterHandle: value.twitterHandle,
    organization: value.organization,
    verificationConfigured: Object.fromEntries(Object.entries(value.verification).map(([key, token]) => [key, Boolean(token)])),
    analytics: { ga4MeasurementId: value.analytics.ga4MeasurementId, gtmId: value.analytics.gtmId, respectDnt: value.analytics.respectDnt },
    overrides: value.overrides,
    localPages: value.localPages
  });
  await logAudit({
    userId: guard.user.id,
    action: "settings.seo.update",
    ip: getClientIp(req.headers),
    metadata: { routeOverrides: Object.keys(config.overrides), changedAt: new Date().toISOString() },
    before: auditSummary(before),
    after: auditSummary(config)
  });

  for (const route of SEO_STATIC_ROUTES) {
    revalidatePath(route.path);
    revalidatePath(route.path === "/" ? "/hi" : `/hi${route.path}`);
  }
  for (const path of new Set([...Object.keys(before.overrides), ...Object.keys(config.overrides)])) revalidatePath(path);
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
  revalidateTag("local-directory");
  revalidatePath("/in/[category]/[city]", "page");
  revalidatePath("/hi/in/[category]/[city]", "page");
  revalidatePath("/in/[category]", "page");
  revalidatePath("/hi/in/[category]", "page");
  revalidatePath("/in/city/[city]", "page");
  revalidatePath("/hi/in/city/[city]", "page");
  revalidatePath("/qr-code-for-google-reviews/[city]", "page");
  revalidatePath("/hi/qr-code-for-google-reviews/[city]", "page");
  return NextResponse.json({ ok: true });
}

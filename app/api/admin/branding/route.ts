import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DATA_URL_RE = /^data:image\/(svg\+xml|png|jpeg|jpg|webp);base64,/;
const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
const MAX_LOGO_BYTES = 614400; // 600 KB

const EMPTY = {
  logoDataUrl: "",
  brandName: "",
  tagline: "",
  footerText: "",
  primaryColor: ""
};

async function read() {
  try {
    const row = await prisma.platformBranding.findUnique({ where: { id: "singleton" } });
    return row ?? { id: "singleton", ...EMPTY, updatedAt: new Date() };
  } catch {
    return { id: "singleton", ...EMPTY, updatedAt: new Date() };
  }
}

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const row = await read();
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const incoming = (await req.json().catch(() => ({}))) as Partial<{
    logoDataUrl: string;
    brandName: string;
    tagline: string;
    footerText: string;
    primaryColor: string;
  }>;

  const logoDataUrl = (incoming.logoDataUrl ?? "").trim();
  if (logoDataUrl) {
    if (!DATA_URL_RE.test(logoDataUrl)) {
      return NextResponse.json(
        { error: "Logo must be a data URL of type svg+xml, png, jpeg, jpg, or webp" },
        { status: 400 }
      );
    }
    if (logoDataUrl.length > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { error: `Logo too large (${logoDataUrl.length} bytes; max ${MAX_LOGO_BYTES})` },
        { status: 400 }
      );
    }
  }

  const primaryColor = (incoming.primaryColor ?? "").trim();
  if (primaryColor && !COLOR_RE.test(primaryColor)) {
    return NextResponse.json(
      { error: "primaryColor must be a hex color like #2563eb" },
      { status: 400 }
    );
  }

  const data = {
    logoDataUrl,
    brandName: String(incoming.brandName ?? "").slice(0, 80).trim(),
    tagline: String(incoming.tagline ?? "").slice(0, 300),
    footerText: String(incoming.footerText ?? "").slice(0, 500),
    primaryColor
  };

  const saved = await prisma.platformBranding.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data }
  });

  await logAudit({
    userId: guard.user.id,
    action: "settings.site.update",
    entity: "PlatformBranding",
    entityId: "singleton",
    metadata: {
      brandName: data.brandName,
      hasLogo: !!data.logoDataUrl,
      primaryColor: data.primaryColor
    },
    ip: getClientIp(req.headers)
  });

  return NextResponse.json(saved);
}

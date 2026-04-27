import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public branding endpoint.
 *
 * Read-only. Returns the platform-level branding overrides set by the
 * super-admin in /admin/branding. Cached for 60s by the runtime patcher
 * (`/js/branding.js`) so we keep the marketing pages snappy without
 * hammering Postgres.
 *
 * NOTE: this is the WatShop Review platform brand, NOT per-tenant
 * business branding (which lives on the Business model).
 */
export async function GET() {
  try {
    const row = await prisma.platformBranding.findUnique({ where: { id: "singleton" } });
    const body = {
      logo: row?.logoDataUrl || "",
      brandName: row?.brandName || "",
      tagline: row?.tagline || "",
      footer: row?.footerText || "",
      primaryColor: row?.primaryColor || ""
    };
    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch {
    // Table missing (migration not yet run) — fall back to empty so the
    // patcher leaves the static markup alone.
    return NextResponse.json(
      { logo: "", brandName: "", tagline: "", footer: "", primaryColor: "" },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  }
}

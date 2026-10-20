import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { assertSafeOutboundUrl } from "@/lib/ssrf";
import { paletteFromImage } from "@/lib/tap/palette";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = await prisma.business.findUnique({ where: { id: business.id }, select: { logo: true } });
  if (!row?.logo) return NextResponse.json({ error: "Add a logo first" }, { status: 400 });
  try {
    const bytes = await logoBytes(row.logo);
    const palette = await paletteFromImage(bytes);
    return NextResponse.json(palette);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not read the logo" }, { status: 400 });
  }
}

async function logoBytes(logo: string) {
  if (logo.startsWith("data:image/")) {
    const body = logo.split(",")[1] || "";
    return Buffer.from(body, "base64");
  }
  const url = await assertSafeOutboundUrl(logo);
  if (url.protocol !== "https:") throw new Error("Logo URL must be https");
  const res = await fetch(url, { redirect: "error" });
  if (!res.ok) throw new Error("Could not read the logo");
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > 2_000_000) throw new Error("Logo is too large");
  return bytes;
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateQrSvg } from "@/lib/qr";
import { absoluteUrl } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "svg";
  const color = url.searchParams.get("color") || undefined;

  const qr = await prisma.qRCode.findUnique({
    where: { shortCode: params.code },
    include: { business: { select: { primaryColor: true, isActive: true } } }
  });
  if (!qr || !qr.business.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const targetUrl = absoluteUrl(`/q/${params.code}`);
  const c = color || qr.business.primaryColor || "#1a73e8";

  if (format === "svg") {
    const svg = await generateQrSvg(targetUrl, { color: c });
    return new NextResponse(svg, {
      headers: {
        "content-type": "image/svg+xml",
        "cache-control": "public, max-age=86400"
      }
    });
  }
  // PNG via dataURL conversion
  const QRCode = (await import("qrcode")).default;
  const buf = await QRCode.toBuffer(targetUrl, {
    margin: 1,
    width: 1024,
    errorCorrectionLevel: "H",
    color: { dark: c, light: "#ffffff" }
  });
  return new NextResponse(buf, {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400"
    }
  });
}

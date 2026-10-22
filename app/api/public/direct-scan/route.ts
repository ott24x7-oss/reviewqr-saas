import { NextRequest, NextResponse } from "next/server";
import { decideDirectScan } from "@/lib/tap/direct-scan";
import { ownHostsFrom } from "@/lib/tap/direct-http";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const channel = req.nextUrl.searchParams.get("channel") === "t" ? "t" : "q";
  const code = req.nextUrl.searchParams.get("code") || "";
  const host = req.headers.get("x-scan-host") || req.headers.get("host") || "";
  try {
    const decision = await decideDirectScan({
      code,
      channel,
      page: req.nextUrl.searchParams.get("page"),
      src: req.nextUrl.searchParams.get("src"),
      ownHosts: ownHostsFrom(host, process.env.NEXT_PUBLIC_APP_URL),
      headers: req.headers
    });
    if (decision.action === "redirect") {
      return NextResponse.json({ redirect: decision.location, target: decision.targetType }, { headers: noStore });
    }
  } catch {
    // A failed write must not become a dead link. The tap page still opens.
  }
  return NextResponse.json({ redirect: null }, { headers: noStore });
}

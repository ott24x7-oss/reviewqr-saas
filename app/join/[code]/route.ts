import { NextRequest, NextResponse } from "next/server";
import { JOIN_COOKIE } from "@/lib/plans/attribution";
import { normalizeCode } from "@/lib/plans/codes";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = normalizeCode(params.code);
  const url = new URL("/register", req.url);
  const res = NextResponse.redirect(url);
  if (code) {
    res.cookies.set(JOIN_COOKIE, `agent:${code}`, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }
  return res;
}

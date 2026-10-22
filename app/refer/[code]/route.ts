import { NextRequest, NextResponse } from "next/server";
import { JOIN_COOKIE } from "@/lib/plans/attribution";
import { normalizeCode } from "@/lib/plans/codes";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = normalizeCode(params.code);
  const res = NextResponse.redirect(new URL("/register", req.url));
  if (code) {
    res.cookies.set(JOIN_COOKIE, `owner:${code}`, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }
  return res;
}

import { NextRequest, NextResponse } from "next/server";
import { JOIN_COOKIE, joinCookieUpdate } from "@/lib/plans/attribution";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const res = NextResponse.redirect(new URL("/register", req.url));
  const next = joinCookieUpdate(req.cookies.get(JOIN_COOKIE)?.value, { kind: "owner", code: params.code });
  if (next) {
    res.cookies.set(JOIN_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }
  return res;
}

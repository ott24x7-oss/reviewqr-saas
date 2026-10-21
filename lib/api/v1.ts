import { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";
import { getSessionUser } from "@/lib/auth";
import { accessSecret, readBearer, verifyAccessToken } from "@/lib/auth/access-token";
import { prisma } from "@/lib/db";
import { isPageError, readPage } from "./cursor";
import { codeForStatus, type ServiceResult } from "./result";

export type V1User = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  pushEnabled: boolean;
};

export function v1Error(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function v1Data<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function v1From<T>(result: ServiceResult<T>) {
  if (!result.ok) return v1Error(result.status, codeForStatus(result.status), result.error);
  return v1Data(result.data);
}

export function v1Page(req: NextRequest) {
  const page = readPage(req.nextUrl.searchParams);
  if (isPageError(page)) return { ok: false as const, response: v1Error(400, "VALIDATION", page.error) };
  return { ok: true as const, page };
}

export async function resolveV1User(req: NextRequest): Promise<V1User | null | "bad-bearer"> {
  const authorization = req.headers.get("authorization");
  if (authorization) {
    const token = readBearer(authorization);
    if (!token || !accessSecret()) return "bad-bearer";
    const claims = verifyAccessToken(token);
    if (!claims) return "bad-bearer";
    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, name: true, phone: true, role: true, pushEnabled: true, deletedAt: true }
    });
    if (!user || user.deletedAt) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      pushEnabled: user.pushEnabled
    };
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
    phone: sessionUser.phone,
    role: sessionUser.role,
    pushEnabled: sessionUser.pushEnabled
  };
}

export async function requireV1User(req: NextRequest) {
  const user = await resolveV1User(req);
  if (user === "bad-bearer" || !user) {
    return { ok: false as const, response: v1Error(401, "UNAUTHORIZED", "Sign in required") };
  }
  return { ok: true as const, user };
}

export async function parseJson<T>(req: NextRequest, schema: ZodType<T>) {
  let body: unknown = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return { ok: false as const, response: v1Error(400, "VALIDATION", "Invalid request") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Invalid request";
    return { ok: false as const, response: v1Error(400, "VALIDATION", message) };
  }
  return { ok: true as const, data: parsed.data };
}

export function deviceMeta(req: NextRequest, deviceName?: string) {
  return {
    deviceName: deviceName ?? null,
    userAgent: req.headers.get("user-agent")
  };
}

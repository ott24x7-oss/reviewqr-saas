import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { readOnboarding, saveOnboarding } from "@/lib/onboarding/progress";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await readOnboarding(auth.user.id));
}

async function putHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => ({}));
  return v1From(await saveOnboarding(auth.user.id, raw, { phone: auth.user.phone, email: auth.user.email }));
}

export const GET = observe(getHandler);
export const PUT = observe(putHandler);

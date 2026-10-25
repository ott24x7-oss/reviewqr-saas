import { mePreferencesSchema } from "@reviewqr/shared";
import { observe } from "@/lib/api/observe";
import { parseJson, requireV1User, v1Data } from "@/lib/api/v1";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const preferences = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { appTheme: true, cinematicAccent: true }
  });
  return v1Data({
    appTheme: preferences?.appTheme ?? "emerald",
    cinematicAccent: preferences?.cinematicAccent ?? "gold"
  });
}

async function putHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, mePreferencesSchema);
  if (!parsed.ok) return parsed.response;
  const preferences = await prisma.user.update({
    where: { id: auth.user.id },
    data: parsed.data,
    select: { appTheme: true, cinematicAccent: true }
  });
  return v1Data(preferences);
}

export const GET = observe(getHandler);
export const PUT = observe(putHandler);

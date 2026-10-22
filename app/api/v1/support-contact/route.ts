import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data } from "@/lib/api/v1";
import { getInsightSettings } from "@/lib/reports/settings";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const settings = await getInsightSettings();
  return v1Data({ whatsappNumber: settings.whatsappNumber });
}

export const GET = observe(getHandler);

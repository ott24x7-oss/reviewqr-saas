import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data } from "@/lib/api/v1";
import { getSupportWhatsApp } from "@/lib/settings";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const whatsappNumber = await getSupportWhatsApp();
  return v1Data({ whatsappNumber: whatsappNumber || null });
}

export const GET = observe(getHandler);

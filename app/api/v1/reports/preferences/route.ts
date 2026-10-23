import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { prisma } from "@/lib/db";
import { preferenceUpdate } from "@/lib/reports/preferences";

export const dynamic = "force-dynamic";

function present(row: { emailOptIn: boolean; whatsappOptIn: boolean; unsubscribedAt: Date | null } | null) {
  return {
    emailOptIn: row ? row.emailOptIn && !row.unsubscribedAt : false,
    whatsappOptIn: row ? row.whatsappOptIn && !row.unsubscribedAt : false,
    unsubscribedAt: row?.unsubscribedAt?.toISOString() || null
  };
}

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const row = await prisma.reportPreference.findUnique({ where: { userId: auth.user.id } });
  return v1Data(present(row));
}

async function putHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = preferenceUpdate(await req.json().catch(() => ({})));
  if (!parsed.ok) return v1Error(400, "VALIDATION", "Preferences must be true or false");
  if (parsed.empty) {
    const row = await prisma.reportPreference.findUnique({ where: { userId: auth.user.id } });
    return v1Data(present(row));
  }
  const email = parsed.patch.emailOptIn;
  const whatsapp = parsed.patch.whatsappOptIn;
  const row = await prisma.reportPreference.upsert({
    where: { userId: auth.user.id },
    create: {
      userId: auth.user.id,
      emailOptIn: email === true,
      whatsappOptIn: whatsapp === true,
      unsubscribedAt: null
    },
    update: {
      ...(email !== undefined ? { emailOptIn: email } : {}),
      ...(whatsapp !== undefined ? { whatsappOptIn: whatsapp } : {}),
      ...(parsed.patch.clearUnsubscribed ? { unsubscribedAt: null } : {})
    }
  });
  return v1Data(present(row));
}

export const GET = observe(getHandler);
export const PUT = observe(putHandler);

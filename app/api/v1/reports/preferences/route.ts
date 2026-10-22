import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data } from "@/lib/api/v1";
import { prisma } from "@/lib/db";

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
  const body = (await req.json().catch(() => ({}))) as { emailOptIn?: boolean; whatsappOptIn?: boolean };
  const row = await prisma.reportPreference.upsert({
    where: { userId: auth.user.id },
    create: {
      userId: auth.user.id,
      emailOptIn: body.emailOptIn === true,
      whatsappOptIn: body.whatsappOptIn === true,
      unsubscribedAt: null
    },
    update: {
      emailOptIn: body.emailOptIn === true,
      whatsappOptIn: body.whatsappOptIn === true,
      unsubscribedAt: null
    }
  });
  return v1Data(present(row));
}

export const GET = observe(getHandler);
export const PUT = observe(putHandler);

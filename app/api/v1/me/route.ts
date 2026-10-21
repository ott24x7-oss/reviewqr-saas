import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { deleteAccountSchema, mePatchSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { eraseAccount } from "@/lib/account";
import { logAudit } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/utils";

export const dynamic = "force-dynamic";

function meBody(user: { id: string; email: string; name: string | null; phone: string | null; role: string; pushEnabled: boolean }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    pushEnabled: user.pushEnabled
  };
}

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1Data(meBody(auth.user));
}

async function patchHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, mePatchSchema);
  if (!parsed.ok) return parsed.response;
  const updated = await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.pushEnabled !== undefined ? { pushEnabled: parsed.data.pushEnabled } : {})
    },
    select: { id: true, email: true, name: true, phone: true, role: true, pushEnabled: true }
  });
  return v1Data(meBody(updated));
}

async function deleteHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  if (auth.user.role === "ADMIN") {
    return v1Error(403, "FORBIDDEN", "Admin accounts cannot be deleted here.");
  }
  const parsed = await parseJson(req, deleteAccountSchema);
  if (!parsed.ok) return parsed.response;
  await eraseAccount(auth.user.id);
  await logAudit({
    userId: auth.user.id,
    action: "account.delete",
    entity: "User",
    entityId: auth.user.id,
    ip: getClientIp(req.headers)
  });
  return v1Data({ ok: true as const });
}
export const GET = observe(getHandler);
export const PATCH = observe(patchHandler);
export const DELETE = observe(deleteHandler);

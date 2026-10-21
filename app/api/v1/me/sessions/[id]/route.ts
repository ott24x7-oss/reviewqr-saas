import { NextRequest } from "next/server";
import { requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { revokeSession } from "@/lib/auth/sessions";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const ok = await revokeSession(auth.user.id, params.id);
  if (!ok) return v1Error(404, "NOT_FOUND", "Session not found");
  return v1Data({ ok: true as const });
}

import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminSupportActionSchema } from "@reviewqr/shared";
import { parseJson, v1From } from "@/lib/api/v1";
import { commitAdminWrite } from "@/lib/admin/finish";
import { requireAdminActor } from "@/lib/admin/guard";
import { loadAdminTicket, replyToTicket } from "@/lib/admin/support-admin";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  return v1From(await loadAdminTicket(context?.params.id || ""));
}

async function postHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminSupportActionSchema);
  if (!parsed.ok) return parsed.response;
  const id = context?.params.id || "";
  return commitAdminWrite(
    auth.actor,
    req,
    await replyToTicket({
      ticketId: id,
      authorId: auth.actor.user.id,
      body: parsed.data.body,
      status: parsed.data.status
    }),
    { action: "support.reply", entity: "SupportTicket", entityId: id }
  );
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);

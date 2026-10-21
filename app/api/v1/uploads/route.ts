import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { receiveUpload } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const form = await req.formData().catch(() => null);
  return v1From(await receiveUpload(auth.user.id, form?.get("file"), form?.get("variant")));
}
export const POST = observe(postHandler);

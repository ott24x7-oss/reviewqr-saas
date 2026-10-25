import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { testimonialVisibilitySchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { listTestimonials, setTestimonialPublic } from "@/lib/owner/mobile-extra";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await listTestimonials(auth.user.id, params.id));
}

async function postHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, testimonialVisibilitySchema);
  if (!parsed.ok) return parsed.response;
  return v1From(await setTestimonialPublic(auth.user.id, params.id, parsed.data.id, parsed.data.isPublic));
}
export const GET = observe(getHandler);
export const POST = observe(postHandler);

import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { archiveBusiness, getBusiness, updateBusiness } from "@/lib/business/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await getBusiness(auth.user.id, params.id));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => ({}));
  return v1From(await updateBusiness(auth.user.id, params.id, raw));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await archiveBusiness(auth.user.id, params.id));
}

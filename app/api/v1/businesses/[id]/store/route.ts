import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { readStoreSettings, saveStoreSettings } from "@/lib/store/store-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await readStoreSettings(auth.user.id, params.id));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => ({}));
  return v1From(await saveStoreSettings(auth.user.id, params.id, raw));
}

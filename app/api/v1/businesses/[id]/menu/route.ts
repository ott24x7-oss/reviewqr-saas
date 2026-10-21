import { NextRequest } from "next/server";
import { requireV1User, v1From, v1Page } from "@/lib/api/v1";
import { runMenuAction } from "@/lib/store/menu-action";
import { listMenu } from "@/lib/store/menu-read";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const page = v1Page(req);
  if (!page.ok) return page.response;
  return v1From(await listMenu(auth.user.id, params.id, page.page));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const raw = await req.json().catch(() => ({}));
  return v1From(await runMenuAction(auth.user.id, params.id, raw));
}

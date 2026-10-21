import { NextRequest } from "next/server";
import { requireV1User, v1Data } from "@/lib/api/v1";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const { id, email, name, phone, role } = auth.user;
  return v1Data({ id, email, name, phone, role });
}

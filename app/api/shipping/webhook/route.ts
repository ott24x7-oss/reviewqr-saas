import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { acceptCarrierWebhook } from "@/lib/shop/ship-order";

export const dynamic = "force-dynamic";

const schema = z.object({
  eventId: z.string().min(1).max(120),
  awb: z.string().min(1).max(80),
  status: z.string().min(1).max(80),
  detail: z.string().max(500).optional()
});

export async function POST(req: NextRequest) {
  const header = req.headers.get("x-shipping-token");
  const authorization = req.headers.get("authorization");
  const bearer = authorization?.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : null;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Event id, AWB, and status are required" }, { status: 400 });
  const result = await acceptCarrierWebhook({
    token: header || bearer,
    eventId: parsed.data.eventId,
    awb: parsed.data.awb,
    status: parsed.data.status,
    detail: parsed.data.detail
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { rateLimitDb } from "@/lib/rate-limit";
import { getAiConfig } from "@/lib/settings";
import { cleanPastedItems } from "@/lib/ai";
import { AiQuotaError } from "@/lib/entitlements";

const schema = z.object({
  text: z.string().min(3).max(4000)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.apiKey) {
    return NextResponse.json(
      { error: "A suggestion isn't available right now. You can type the items yourself." },
      { status: 503 }
    );
  }
  const limit = await rateLimitDb({ key: `menu-clean:${user.id}`, limit: 20, windowSeconds: 3600 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many clean-ups. Type the items for now." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Paste the items first" }, { status: 400 });

  try {
    const items = await cleanPastedItems(cfg, parsed.data.text, business.id);
    if (!items.length) {
      return NextResponse.json({ error: "No priced lines were found. You can type them yourself." }, { status: 422 });
    }
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof AiQuotaError) return NextResponse.json({ error: error.message }, { status: 402 });
    return NextResponse.json({ error: "Could not clean that up. You can type the items yourself." }, { status: 502 });
  }
}

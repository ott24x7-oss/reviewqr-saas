import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { getAiConfig } from "@/lib/settings";
import { testConnection } from "@/lib/ai";

/** Test: ping chat/completions with the given (or stored) url/key/model. */
export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => ({}))) as any;
  const stored = await getAiConfig();
  const cfg = {
    enabled: true,
    apiUrl: String(body.apiUrl || stored.apiUrl).trim().replace(/\/$/, ""),
    apiKey:
      typeof body.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : stored.apiKey,
    model: String(body.model || stored.model)
  };

  try {
    const reply = await testConnection(cfg);
    return NextResponse.json({ ok: true, model: cfg.model, reply });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Connection failed" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { getAiConfig } from "@/lib/settings";
import { listModels } from "@/lib/ai";

/** Auto-detect: list available models for the given (or stored) API url/key. */
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
    const models = await listModels(cfg);
    return NextResponse.json({ models });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to list models" }, { status: 400 });
  }
}

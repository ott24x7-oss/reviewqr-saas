import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { getImageAiConfig, setImageAiConfig } from "@/lib/settings";
import { getClientIp } from "@/lib/utils";

export async function GET() {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const cfg = await getImageAiConfig();
  return NextResponse.json({
    ...cfg,
    apiKey: cfg.apiKey ? `${cfg.apiKey.slice(0, 3)}${"•".repeat(Math.max(4, cfg.apiKey.length - 6))}${cfg.apiKey.slice(-3)}` : ""
  });
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const incoming = await req.json().catch(() => ({})) as Record<string, unknown>;
  const current = await getImageAiConfig();
  const next = {
    enabled: typeof incoming.enabled === "boolean" ? incoming.enabled : current.enabled,
    apiUrl: String(incoming.apiUrl ?? current.apiUrl).trim().replace(/\/$/, ""),
    apiKey: typeof incoming.apiKey === "string" && incoming.apiKey.trim() && !incoming.apiKey.includes("•")
      ? incoming.apiKey.trim()
      : current.apiKey,
    model: String(incoming.model ?? current.model).trim().slice(0, 120),
    size: ["1024x1024", "1536x1024", "1024x1536"].includes(String(incoming.size)) ? String(incoming.size) : current.size,
    stylePrompt: String(incoming.stylePrompt ?? current.stylePrompt).trim().slice(0, 1000),
    estimatePaisePerImage: Math.max(0, Math.floor(Number(incoming.estimatePaisePerImage ?? current.estimatePaisePerImage) || 0)),
    dailyCapPaise: Math.max(0, Math.floor(Number(incoming.dailyCapPaise ?? current.dailyCapPaise) || 0))
  };
  let parsed: URL;
  try { parsed = new URL(next.apiUrl); }
  catch { return NextResponse.json({ error: "Enter a valid image API base URL" }, { status: 400 }); }
  if (parsed.protocol !== "https:") return NextResponse.json({ error: "Image API URL must use HTTPS" }, { status: 400 });
  if (!next.model) return NextResponse.json({ error: "Enter an image model" }, { status: 400 });
  await setImageAiConfig(next, guard.user.id);
  await logAudit({ userId: guard.user.id, action: "settings.ai.images.update", ip: getClientIp(req.headers) });
  return NextResponse.json({ ok: true });
}

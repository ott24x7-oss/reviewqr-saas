import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { sendWhatsApp } from "@/lib/whatsapp";
import { getClientIp } from "@/lib/utils";

const schema = z.object({
  to: z.string().min(8).max(20),
  message: z.string().max(500).optional()
});

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const result = await sendWhatsApp({
      to: parsed.data.to,
      message:
        parsed.data.message ||
        `🟢 ReviewQR test message — sent at ${new Date().toLocaleTimeString("en-IN")}.`
    });
    await logAudit({
      userId: guard.user.id,
      action: "settings.whatsapp.update",
      metadata: { action: "test.send", to: parsed.data.to, via: (result as any).via },
      ip: getClientIp(req.headers)
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Send failed" }, { status: 500 });
  }
}

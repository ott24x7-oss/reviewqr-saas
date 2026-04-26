import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, logAudit } from "@/lib/admin";
import { sendEmail } from "@/lib/email";
import { getClientIp } from "@/lib/utils";

const schema = z.object({ to: z.string().email() });

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  try {
    const result = await sendEmail({
      to: parsed.data.to,
      subject: "ReviewQR — test email",
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:24px">
        <h2 style="color:#1a73e8">ReviewQR test email</h2>
        <p>This is a test from your admin panel. If you received this, your email transport works.</p>
        <p style="color:#888;font-size:12px">Sent ${new Date().toISOString()}</p>
      </body></html>`
    });
    await logAudit({
      userId: guard.user.id,
      action: "email.test",
      metadata: { to: parsed.data.to, via: (result as any).via },
      ip: getClientIp(req.headers)
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Send failed" }, { status: 500 });
  }
}

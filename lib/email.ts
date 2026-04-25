/**
 * Email helper.
 *
 * Two transports are supported:
 *  - PHP relay (set MAILER_RELAY_URL) — bypasses Railway/host SMTP egress blocks.
 *    Same protocol as the wa-Invoice-bot relay so the existing send.php works.
 *  - Direct SMTP via nodemailer — used when MAILER_RELAY_URL is empty.
 *
 * Auto-falls-back from port 587 -> 465 (or vice versa) on transient errors.
 */
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

const RELAY_URL = process.env.MAILER_RELAY_URL || "";
const RELAY_SECRET = process.env.MAILER_SECRET || "";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || `ReviewQR <${SMTP_USER}>`;
const SMTP_SECURE = SMTP_PORT === 465;

export type EmailPayload = {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
};

function isTransient(e: any) {
  const code = e?.code || e?.errno || "";
  const msg = String(e?.message || "").toLowerCase();
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "ENOTFOUND" ||
    msg.includes("connection timeout") ||
    msg.includes("greeting never received")
  );
}

function buildTransport(port = SMTP_PORT, secure = SMTP_SECURE) {
  const opts: SMTPTransport.Options & { family?: number } = {
    host: SMTP_HOST,
    port,
    secure,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    family: 4,
    connectionTimeout: 20_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000
  };
  return nodemailer.createTransport(opts);
}

async function sendDirect(payload: EmailPayload) {
  const opts = {
    from: payload.from || SMTP_FROM,
    to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
    cc: Array.isArray(payload.cc) ? payload.cc.join(", ") : payload.cc,
    subject: payload.subject,
    html: payload.html,
    text: payload.text || stripHtml(payload.html),
    attachments: payload.attachments
  };
  try {
    const info = await buildTransport().sendMail(opts);
    return { ok: true, messageId: info.messageId, via: "smtp" };
  } catch (e: any) {
    if (!isTransient(e)) throw e;
    const altPort = SMTP_PORT === 465 ? 587 : 465;
    const info = await buildTransport(altPort, altPort === 465).sendMail(opts);
    return { ok: true, messageId: info.messageId, via: "smtp-fallback" };
  }
}

async function sendViaRelay(payload: EmailPayload) {
  const fromMatch = String(payload.from || SMTP_FROM).match(/<([^>]+)>/);
  const fromEmail = fromMatch ? fromMatch[1] : SMTP_USER;
  const fromName = String(payload.from || SMTP_FROM).split("<")[0].trim().replace(/"/g, "") || "ReviewQR";
  const body = {
    secret: RELAY_SECRET,
    smtp_host: SMTP_HOST,
    smtp_port: SMTP_PORT,
    smtp_secure: SMTP_SECURE,
    smtp_user: SMTP_USER,
    smtp_pass: SMTP_PASS,
    smtp_email: SMTP_USER,
    smtp_password: SMTP_PASS,
    from_email: fromEmail,
    from_name: fromName,
    to: Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
    cc: Array.isArray(payload.cc) ? payload.cc : payload.cc ? [payload.cc] : [],
    subject: payload.subject,
    html: payload.html,
    body: payload.html,
    text: payload.text || stripHtml(payload.html),
    attachments: (payload.attachments || []).map((a) => ({
      filename: a.filename,
      content_type: a.contentType || "application/octet-stream",
      content_base64: Buffer.isBuffer(a.content) ? a.content.toString("base64") : String(a.content)
    }))
  };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(RELAY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(RELAY_SECRET ? { "x-mailer-token": RELAY_SECRET } : {})
      },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}
    const failed = json && (json.ok === false || json.success === false);
    if (!res.ok || failed) {
      throw new Error(`Relay ${res.status}: ${json?.error || text.slice(0, 200)}`);
    }
    return { ok: true, messageId: json?.messageId, via: "relay" };
  } finally {
    clearTimeout(t);
  }
}

export async function sendEmail(payload: EmailPayload) {
  if (!SMTP_USER && !RELAY_URL) {
    console.warn("[email] not configured — printing to console");
    console.log("---EMAIL---", payload.subject, "to", payload.to);
    return { ok: true, via: "console" as const };
  }
  if (RELAY_URL) return sendViaRelay(payload);
  return sendDirect(payload);
}

function stripHtml(s: string) {
  return String(s || "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(s: string) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

/* ============== Templates ============== */

export function negativeFeedbackEmail(opts: {
  businessName: string;
  rating: number;
  message: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  dashboardUrl: string;
}) {
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f4f6f8;padding:24px;color:#1f2937">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:linear-gradient(135deg,#1a73e8,#34a853);color:#fff;padding:18px 24px">
        <h2 style="margin:0;font-size:18px">⚠️ Negative feedback received</h2>
        <p style="margin:4px 0 0;opacity:0.9;font-size:13px">${escapeHtml(opts.businessName)}</p>
      </div>
      <div style="padding:24px">
        <div style="display:inline-block;background:#fef2f2;color:#991b1b;padding:6px 12px;border-radius:999px;font-size:13px;font-weight:600">
          ${"⭐".repeat(opts.rating)}${"☆".repeat(5 - opts.rating)} ${opts.rating}/5
        </div>
        <p style="margin-top:16px;font-size:15px;line-height:1.6;background:#f9fafb;padding:14px 16px;border-left:4px solid #ef4444;border-radius:6px">
          ${escapeHtml(opts.message)}
        </p>
        ${
          opts.customerName || opts.customerPhone || opts.customerEmail
            ? `<table style="margin-top:16px;font-size:14px;border-collapse:collapse">
            ${opts.customerName ? `<tr><td style="padding:4px 16px 4px 0;color:#6b7280">Name</td><td><b>${escapeHtml(opts.customerName)}</b></td></tr>` : ""}
            ${opts.customerPhone ? `<tr><td style="padding:4px 16px 4px 0;color:#6b7280">Phone</td><td>${escapeHtml(opts.customerPhone)}</td></tr>` : ""}
            ${opts.customerEmail ? `<tr><td style="padding:4px 16px 4px 0;color:#6b7280">Email</td><td>${escapeHtml(opts.customerEmail)}</td></tr>` : ""}
          </table>`
            : ""
        }
        <p style="margin-top:24px;text-align:center">
          <a href="${escapeHtml(opts.dashboardUrl)}" style="display:inline-block;background:#1a73e8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Reply in Dashboard</a>
        </p>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px">— ReviewQR</p>
      </div>
    </div>
  </body></html>`;
}

export function welcomeEmail(opts: { name: string; email: string; loginUrl: string }) {
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f4f6f8;padding:24px;color:#1f2937">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:linear-gradient(135deg,#1a73e8,#34a853);color:#fff;padding:24px">
        <h2 style="margin:0;font-size:20px">Welcome to ReviewQR ${escapeHtml(opts.name.split(" ")[0])}!</h2>
      </div>
      <div style="padding:24px">
        <p style="font-size:15px;line-height:1.6">Your free trial is active. Start collecting Google reviews from happy customers in minutes.</p>
        <ul style="font-size:14px;line-height:1.8;color:#374151;padding-left:20px">
          <li>Add your business and Google review link</li>
          <li>Generate a QR code for your counter / table / bills</li>
          <li>Watch real-time reviews come in</li>
        </ul>
        <p style="text-align:center;margin-top:24px">
          <a href="${escapeHtml(opts.loginUrl)}" style="display:inline-block;background:#1a73e8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Open Dashboard</a>
        </p>
      </div>
    </div>
  </body></html>`;
}

export function dailyReportEmail(opts: {
  businessName: string;
  range: string;
  totalReviews: number;
  avgRating: number;
  positive: number;
  negative: number;
  redirected: number;
  dashboardUrl: string;
}) {
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f4f6f8;padding:24px;color:#1f2937">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:linear-gradient(135deg,#1a73e8,#34a853);color:#fff;padding:18px 24px">
        <h2 style="margin:0;font-size:18px">${escapeHtml(opts.businessName)} — ${escapeHtml(opts.range)} report</h2>
      </div>
      <div style="padding:24px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="padding:14px;background:#eff6ff;border-radius:8px"><div style="font-size:12px;color:#1e40af">Total reviews</div><div style="font-size:24px;font-weight:700;color:#1a73e8">${opts.totalReviews}</div></div>
          <div style="padding:14px;background:#f0fdf4;border-radius:8px"><div style="font-size:12px;color:#166534">Avg rating</div><div style="font-size:24px;font-weight:700;color:#34a853">${opts.avgRating.toFixed(1)} ⭐</div></div>
          <div style="padding:14px;background:#f0fdf4;border-radius:8px"><div style="font-size:12px;color:#166534">Sent to Google</div><div style="font-size:24px;font-weight:700;color:#34a853">${opts.redirected}</div></div>
          <div style="padding:14px;background:#fef2f2;border-radius:8px"><div style="font-size:12px;color:#991b1b">Negative</div><div style="font-size:24px;font-weight:700;color:#ef4444">${opts.negative}</div></div>
        </div>
        <p style="text-align:center;margin-top:24px">
          <a href="${escapeHtml(opts.dashboardUrl)}" style="display:inline-block;background:#1a73e8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">View dashboard</a>
        </p>
      </div>
    </div>
  </body></html>`;
}

export function passwordResetEmail(opts: { resetUrl: string; email: string }) {
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f4f6f8;padding:24px;color:#1f2937">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:linear-gradient(135deg,#1a73e8,#34a853);color:#fff;padding:18px 24px"><h2 style="margin:0;font-size:18px">Reset your ReviewQR password</h2></div>
      <div style="padding:24px">
        <p>Reset request for <b>${escapeHtml(opts.email)}</b>. The link is valid for 30 minutes.</p>
        <p style="text-align:center;margin:24px 0"><a href="${escapeHtml(opts.resetUrl)}" style="display:inline-block;background:#1a73e8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>
        <p style="color:#9ca3af;font-size:12px;word-break:break-all">${escapeHtml(opts.resetUrl)}</p>
      </div>
    </div>
  </body></html>`;
}

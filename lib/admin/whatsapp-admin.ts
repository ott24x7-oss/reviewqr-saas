import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { otpDeliveryStats } from "@/lib/otp";
import { getWhatsAppConfig } from "@/lib/settings";
import { cloudTemplateStatus } from "./cloud-templates";
import { maskPhone } from "./mask";

async function baileysInfo() {
  try {
    const { getBaileys } = await import("@/lib/whatsapp-baileys");
    return getBaileys().getInfo();
  } catch {
    return {
      status: "idle" as const,
      qrPng: null,
      phoneNumber: null,
      error: null,
      connectedAt: null,
      lastEvent: null
    };
  }
}

export async function adminWhatsAppStatus() {
  const [info, delivery, cfg] = await Promise.all([baileysInfo(), otpDeliveryStats(), getWhatsAppConfig()]);
  const cloud = await cloudTemplateStatus(cfg);
  return ok({ ...info, delivery, cloud });
}

export async function reconnectAdminWhatsApp() {
  try {
    const { getBaileys } = await import("@/lib/whatsapp-baileys");
    const manager = getBaileys();
    void manager.start();
    return ok(manager.getInfo());
  } catch {
    return ok({
      status: "idle" as const,
      qrPng: null,
      phoneNumber: null,
      error: "WhatsApp is unavailable",
      connectedAt: null,
      lastEvent: null
    });
  }
}

/** Sends only to the signed-in admin's own number. */
export async function sendAdminWhatsAppTest(userId: string, message?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  if (!user?.phone) return fail(400, "Add a phone number on the web first");
  const text = message?.trim() || `QR24x7 admin test at ${new Date().toLocaleTimeString("en-IN")}.`;
  try {
    const { sendWhatsApp } = await import("@/lib/whatsapp");
    const result = await sendWhatsApp({ to: user.phone, message: text });
    return ok({ via: result.via, to: maskPhone(user.phone) });
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Send failed");
  }
}

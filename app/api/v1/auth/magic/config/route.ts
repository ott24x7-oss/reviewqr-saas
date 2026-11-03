import { NextResponse } from "next/server";
import { MAGIC_LINK_KEYWORD } from "@/lib/auth/magic-link";
import { getSiteConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  let connected = false;
  let phoneNumber: string | null = null;
  try {
    const { getBaileys } = await import("@/lib/whatsapp-baileys");
    const manager = getBaileys();
    connected = manager.isConnected();
    phoneNumber = manager.getInfo().phoneNumber;
  } catch {
    /* A missing Baileys runtime keeps the email login available. */
  }

  let fallbackNumber = "";
  try {
    fallbackNumber = (await getSiteConfig()).supportWhatsappNumber;
  } catch {
    /* The connected Baileys number is enough when public settings are unavailable. */
  }

  const digits = [phoneNumber, fallbackNumber]
    .map((number) => (number || "").replace(/\D/g, ""))
    .find((number) => number.length >= 10 && number.length <= 15) || "";
  const validNumber = !!digits;
  const waUrl = validNumber
    ? `https://wa.me/${digits}?text=${encodeURIComponent(MAGIC_LINK_KEYWORD)}`
    : "";
  return NextResponse.json(
    { enabled: connected && validNumber, waUrl },
    { headers: { "Cache-Control": "no-store" } }
  );
}

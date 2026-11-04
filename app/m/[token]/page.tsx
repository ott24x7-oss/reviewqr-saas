import type { Metadata } from "next";
import { headers } from "next/headers";
import MagicLoginClient from "./magic-login-client";
import { AuthFrame } from "@/components/brand/auth-frame";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log in to QR24x7",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer"
};

export default function MagicLoginPage({ params }: { params: { token: string } }) {
  const android = /android/i.test(headers().get("user-agent") || "");
  return (
    <AuthFrame showLanguageToggle>
      <MagicLoginClient token={params.token} android={android} />
    </AuthFrame>
  );
}

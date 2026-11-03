import type { Metadata } from "next";
import MagicLoginClient from "./magic-login-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log in to QR24x7",
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer"
};

export default function MagicLoginPage({ params }: { params: { token: string } }) {
  return <MagicLoginClient token={params.token} />;
}

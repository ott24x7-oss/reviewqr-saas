import { AuthFrame } from "@/components/brand/auth-frame";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthFrame showLanguageToggle>{children}</AuthFrame>;
}

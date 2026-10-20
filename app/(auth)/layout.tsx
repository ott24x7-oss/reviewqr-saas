import { AuthFrame } from "@/components/brand/auth-frame";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}

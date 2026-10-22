import Link from "next/link";
import { DEFAULT_BRAND_NAME } from "@/lib/brand-defaults";
import { BRAND_ICON } from "@/lib/brand-assets";
import { authFontClass } from "./fonts";

/** Dark glass frame for login, register, reset, and invite. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={`auth-shell ${authFontClass}`}>
      <div className="auth-glow" aria-hidden />
      <div className="auth-glow auth-glow-b" aria-hidden />
      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center px-4 py-8">
        <Link href="/" className="auth-mark" aria-label={`${DEFAULT_BRAND_NAME} home`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND_ICON} alt="" width={40} height={40} className="h-10 w-10 rounded-xl object-cover" />
        </Link>
        <div className="mt-4 w-full">{children}</div>
      </div>
    </div>
  );
}

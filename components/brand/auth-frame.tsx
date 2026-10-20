import Link from "next/link";
import { authFontClass } from "./fonts";

/** Dark glass frame for login, register, reset, and invite. */
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={`auth-shell ${authFontClass}`}>
      <div className="auth-glow" aria-hidden />
      <div className="auth-glow auth-glow-b" aria-hidden />
      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center px-4 py-8">
        <Link href="/" className="auth-mark" aria-label="ReviewQR home">
          <span>RQ</span>
        </Link>
        <div className="mt-4 w-full">{children}</div>
      </div>
    </div>
  );
}

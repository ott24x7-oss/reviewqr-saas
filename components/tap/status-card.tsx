import Link from "next/link";
import { tapFontClass } from "@/components/brand/tap-font";

export function StatusCard({
  title,
  detail,
  action
}: {
  title: string;
  detail?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className={`tap-page ${tapFontClass}`}>
      <div className="tap-card">
        <h1>{title}</h1>
        {detail ? <p className="tap-bio">{detail}</p> : null}
        {action ? (
          <a className="tap-primary" href={action.href}>
            {action.label}
          </a>
        ) : null}
        <p className="tap-privacy">
          <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

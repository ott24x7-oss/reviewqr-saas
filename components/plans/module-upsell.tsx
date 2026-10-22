import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ModuleUpsell({
  title,
  body,
  href
}: {
  title: string;
  body: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-5">
        <Link href={href}>See plans</Link>
      </Button>
    </div>
  );
}

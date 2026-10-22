import { Check } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function PriceCard({
  name,
  description,
  badge,
  pricePaise,
  mrpPaise,
  periodLabel,
  savings,
  modules,
  href,
  cta
}: {
  name: string;
  description: string;
  badge?: string | null;
  pricePaise: number;
  mrpPaise?: number | null;
  periodLabel: string;
  savings?: number;
  modules: string[];
  href?: string;
  cta: string;
}) {
  return (
    <article className={cn("relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-900", badge && "ring-2 ring-primary")}>
      {badge ? (
        <span className="absolute -top-3 left-4 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {badge}
        </span>
      ) : null}
      <h3 className="font-display text-lg font-bold">{name}</h3>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold">{pricePaise <= 0 ? "Free" : formatINR(pricePaise)}</span>
        {mrpPaise && mrpPaise > pricePaise ? (
          <span className="text-sm text-muted-foreground line-through">{formatINR(mrpPaise)}</span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{periodLabel}</p>
      {savings ? <p className="mt-1 text-xs font-medium text-emerald-700">Save {savings}%</p> : null}
      <ul className="mt-4 space-y-1 text-sm">
        {modules.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            {item}
          </li>
        ))}
      </ul>
      {href ? (
        <a href={href} className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          {cta}
        </a>
      ) : (
        <span className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-muted px-4 text-sm font-medium">{cta}</span>
      )}
    </article>
  );
}

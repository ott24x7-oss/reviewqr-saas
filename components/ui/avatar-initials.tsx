import { cn } from "@/lib/utils";

/**
 * Self-contained initials avatar — a colored circle with a person's initials.
 * No external image service (dependency-free, always renders), deterministic
 * per name so each person keeps a stable color.
 */
const COLORS = ["#1a73e8", "#34a853", "#ea4335", "#f59e0b", "#7c3aed", "#0891b2"];

function initialsOf(name: string) {
  const cleaned = name.replace(/^(Dr|Mr|Ms|Mrs|Prof)\.?\s+/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase() || name.slice(0, 2).toUpperCase();
}

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function AvatarInitials({
  name,
  className
}: {
  name: string;
  className?: string;
}) {
  const bg = COLORS[hash(name) % COLORS.length];
  return (
    <span
      aria-hidden
      style={{ backgroundColor: bg }}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white select-none",
        className
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

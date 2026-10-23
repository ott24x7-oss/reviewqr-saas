import Link from "next/link";

export const PAGE_STEP = 20;
const MAX_SHOWN = 500;

/** How many rows to show, from ?show=. Always a multiple of the step, between one page and the cap. */
export function shownCount(raw: string | undefined) {
  const value = Math.floor(Number(raw) || PAGE_STEP);
  return Math.min(MAX_SHOWN, Math.max(PAGE_STEP, Math.ceil(value / PAGE_STEP) * PAGE_STEP));
}

/** "Load more" keeps the current filters and asks for one more page. */
export function LoadMore({
  basePath,
  params,
  shown
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  shown: number;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "show") query.set(key, value);
  }
  query.set("show", String(shown + PAGE_STEP));
  return (
    <div className="flex justify-center pt-2">
      <Link
        href={`${basePath}?${query.toString()}`}
        scroll={false}
        className="inline-flex min-h-11 items-center rounded-full border bg-card px-5 text-sm font-medium hover:bg-secondary"
      >
        Load {PAGE_STEP} more
      </Link>
    </div>
  );
}

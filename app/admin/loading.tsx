import { Skeleton } from "@/components/admin/ui/primitives";

export default function AdminLoading() {
  return (
    <div className="space-y-5" aria-label="Loading admin page" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-[14px]" />)}
      </div>
      <Skeleton className="h-72 rounded-[14px]" />
    </div>
  );
}

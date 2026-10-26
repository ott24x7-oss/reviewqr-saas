import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { featureBlock } from "@/lib/plans/feature-gate";
import { listBookings } from "@/lib/store/bookings";
import { readableBusinessWhere } from "@/lib/tenant";
import { AppText } from "@/components/app-ui/i18n";
import { EmptyState, InlineError, PageHeader, PlanLockNotice } from "@/components/app-ui/primitives";
import { BookingsBoard, type BookingCard } from "./bookings-board";

export const dynamic = "force-dynamic";

const FILTERS: Array<[string, string, string]> = [
  ["", "All", "सभी"],
  ["NEW", "New", "नया"],
  ["CONFIRMED", "Confirmed", "पुष्ट"],
  ["DONE", "Done", "हो गया"],
  ["CANCELLED", "Cancelled", "रद्द"],
  ["NO_SHOW", "No show", "नहीं आए"]
];

export default async function BookingsPage({
  searchParams
}: {
  searchParams: { businessId?: string; status?: string; date?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const businesses = await prisma.business.findMany({
    where: readableBusinessWhere(user.id),
    select: { id: true, name: true, ownerId: true },
    orderBy: { createdAt: "asc" }
  });
  const selected = businesses.find((business) => business.id === searchParams.businessId) || businesses[0];
  if (!selected) {
    return (
      <EmptyState
        title={<AppText en="Add a business first" hi="पहले कारोबार जोड़ें" />}
        description={<AppText en="Booking requests will appear here." hi="बुकिंग अनुरोध यहाँ दिखेंगे।" />}
        action={<Link href="/dashboard/businesses/new" className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"><AppText en="Add business" hi="कारोबार जोड़ें" /></Link>}
      />
    );
  }
  const locked = await featureBlock(selected.ownerId, "services-booking");
  const status = FILTERS.some((row) => row[0] === searchParams.status) ? searchParams.status || "" : "";
  const date = searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : "";
  return (
    <div className="space-y-5">
      <PageHeader
        title={<AppText en="Bookings" hi="बुकिंग" />}
        description={selected.name}
        actions={
          <div className="flex flex-wrap gap-2">
            {businesses.map((business) => (
              <Link
                key={business.id}
                href={`/dashboard/sell/bookings?businessId=${business.id}`}
                aria-current={business.id === selected.id ? "page" : undefined}
                className={`inline-flex min-h-9 items-center rounded-md border px-3 text-sm ${business.id === selected.id ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"}`}
              >
                {business.name}
              </Link>
            ))}
          </div>
        }
      />
      {locked ? (
        <PlanLockNotice title={<AppText en="Services and bookings" hi="सेवाएँ और बुकिंग" />} body={locked.error} />
      ) : (
        <BookingList userId={user.id} businessId={selected.id} status={status} date={date} />
      )}
    </div>
  );
}

async function BookingList({
  userId,
  businessId,
  status,
  date
}: {
  userId: string;
  businessId: string;
  status: string;
  date: string;
}) {
  const result = await listBookings(userId, { limit: 40, cursorId: null }, {
    businessId,
    status: status || null,
    date: date || null
  });
  if (!result.ok) return <InlineError title={result.error} />;
  const href = (nextStatus: string) => {
    const params = new URLSearchParams({ businessId });
    if (nextStatus) params.set("status", nextStatus);
    if (date) params.set("date", date);
    return `/dashboard/sell/bookings?${params}`;
  };
  return (
    <>
      <form action="/dashboard/sell/bookings" className="app-ui-panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <input type="hidden" name="businessId" value={businessId} />
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <input name="date" type="date" defaultValue={date} aria-label="Booking date" className="h-10 rounded-md border bg-background px-3 text-sm" />
        <button className="min-h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          <AppText en="Filter by date" hi="तारीख से छानें" />
        </button>
        {date || status ? (
          <Link href={`/dashboard/sell/bookings?businessId=${businessId}`} className="inline-flex min-h-10 items-center justify-center rounded-md border px-3 text-sm">
            <AppText en="Clear filters" hi="फ़िल्टर हटाएँ" />
          </Link>
        ) : null}
      </form>
      <nav className="flex gap-2 overflow-x-auto" aria-label="Booking status">
        {FILTERS.map(([key, en, hi]) => (
          <Link
            key={key || "all"}
            href={href(key)}
            aria-current={status === key ? "page" : undefined}
            className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-sm ${status === key ? "border-primary bg-primary/10 font-medium" : "bg-card text-muted-foreground"}`}
          >
            <AppText en={en} hi={hi} />
          </Link>
        ))}
      </nav>
      <BookingsBoard items={result.data.items as BookingCard[]} />
    </>
  );
}

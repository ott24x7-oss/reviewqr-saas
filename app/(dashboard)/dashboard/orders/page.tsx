import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadOrderCardPage } from "@/lib/store/order-feed";
import { moduleBlock, upsellOffer } from "@/lib/plans/entitlements";
import { ModuleUpsell } from "@/components/plans/module-upsell";
import { prisma } from "@/lib/db";
import { OrdersBoard } from "./orders-board";
import { decodeCursor } from "@/lib/api/cursor";
import Link from "next/link";
import { PageHeader, KpiCard } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import { InlineError } from "@/components/app-ui/primitives";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string; q?: string; cursor?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const owned = await prisma.business.findFirst({ where: { ownerId: user.id, archived: false }, select: { id: true } });
  if (owned) {
    const locked = await moduleBlock(user.id, "STORE");
    if (locked) {
      const offer = await upsellOffer("STORE");
      return <ModuleUpsell title={offer.title} body={locked} href={offer.href} />;
    }
  }
  const cursor = decodeCursor(searchParams.cursor);
  if (cursor === "bad") return <InlineError title={<AppText en="This page link is invalid. Start from the first page." hi="यह पेज लिंक सही नहीं है। पहले पेज से शुरू करें।" />} />;
  const status = searchParams.status || null;
  const query = (searchParams.q || "").trim();
  const result = await loadOrderCardPage(user.id, { limit: 25, cursorId: cursor, status, search: query });
  if (!result.ok) return <InlineError title={result.error} />;
  const { items: orders, summary, nextCursor } = result.data;
  const keep = new URLSearchParams();
  if (query) keep.set("q", query);
  const filterHref = (nextStatus: string) => {
    const params = new URLSearchParams(keep);
    if (nextStatus) params.set("status", nextStatus);
    return `/dashboard/sell/orders${params.size ? `?${params}` : ""}`;
  };
  return (
    <div className="space-y-5">
      <PageHeader title={<AppText en="Orders" hi="ऑर्डर" />} description={<AppText en="See what customers ordered and update each order." hi="ग्राहकों के ऑर्डर देखें और उनकी स्थिति अपडेट करें।" />} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label={<AppText en="Orders today" hi="आज के ऑर्डर" />} value={summary.count} delta={<AppText en="Excluding rejected orders" hi="रद्द ऑर्डर शामिल नहीं" />} />
        <KpiCard label={<AppText en="Sales today" hi="आज की बिक्री" />} value={summary.totalPaise / 100} format="inr" delta={<AppText en="Open and paid orders" hi="खुले और भुगतान किए ऑर्डर" />} />
        <KpiCard label={<AppText en="Showing" hi="दिखाए जा रहे हैं" />} value={orders.length} delta={<AppText en="Latest matching orders" hi="नए मिलते-जुलते ऑर्डर" />} />
        <KpiCard label={<AppText en="Needs attention" hi="ध्यान देना है" />} value={orders.filter((order) => order.status === "NEW").length} delta={<AppText en="New orders on this page" hi="इस पेज पर नए ऑर्डर" />} />
      </div>
      <form action="/dashboard/sell/orders" className="app-ui-panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <input name="q" defaultValue={query} aria-label="Search orders" placeholder="Search order, customer or phone" className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" />
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <button className="min-h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"><AppText en="Search orders" hi="ऑर्डर खोजें" /></button>
        {query || status ? <Link href="/dashboard/sell/orders" className="inline-flex min-h-10 items-center justify-center rounded-md border px-3 text-sm"><AppText en="Clear filters" hi="फ़िल्टर हटाएँ" /></Link> : null}
      </form>
      <nav className="flex gap-2 overflow-x-auto" aria-label="Order status filters">
        {[ ["", "All", "सभी"], ["NEW", "New", "नए"], ["ACCEPTED", "Accepted", "स्वीकार किए"], ["PREPARING", "Preparing", "तैयार हो रहे"], ["READY", "Ready", "तैयार"], ["COMPLETED", "Completed", "पूरे"], ["REJECTED", "Rejected", "रद्द"] ].map(([key, en, hi]) => <Link key={key} href={filterHref(key)} aria-current={(status || "") === key ? "page" : undefined} className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-sm ${(status || "") === key ? "border-primary bg-primary/10 font-medium" : "bg-card text-muted-foreground hover:text-foreground"}`}><AppText en={en} hi={hi} /></Link>)}
      </nav>
      <OrdersBoard initial={orders} summary={summary} live={!cursor && !status && !query} />
      {nextCursor ? <div className="flex justify-end"><Link href={`/dashboard/sell/orders?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(status ? { status } : {}), cursor: nextCursor })}`} className="inline-flex min-h-10 items-center rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted"><AppText en="Next page" hi="अगला पेज" /></Link></div> : null}
    </div>
  );
}

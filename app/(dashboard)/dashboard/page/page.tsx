import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, ExternalLink, Link2, Palette, Quote, Settings2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readableBusinessWhere } from "@/lib/tenant";
import { PageHeader, EmptyState } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import TapEditorPage from "@/app/(dashboard)/dashboard/businesses/[id]/tap/page";
import ThemeEditorPage from "@/app/(dashboard)/dashboard/businesses/[id]/theme/page";
import TestimonialsPage from "@/app/(dashboard)/dashboard/businesses/[id]/testimonials/page";

export const dynamic = "force-dynamic";

export default async function MyPage({ searchParams }: { searchParams: { businessId?: string; tab?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const businesses = await prisma.business.findMany({
    where: readableBusinessWhere(user.id),
    select: { id: true, name: true, slug: true, description: true, logo: true, _count: { select: { qrCodes: true, menuItems: true, reviews: true } } },
    orderBy: { createdAt: "asc" }
  });
  const business = businesses.find((item) => item.id === searchParams.businessId) || businesses[0];
  if (!business) return <EmptyState title={<AppText en="Add a business first" hi="पहले कारोबार जोड़ें" />} action={<Link href="/dashboard/businesses/new" className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"><AppText en="Add business" hi="कारोबार जोड़ें" /></Link>} />;

  const tab = searchParams.tab || "overview";
  const tabs = [
    ["overview", "Overview", "झलक", Settings2],
    ["buttons", "Buttons", "बटन", Link2],
    ["theme", "Theme", "थीम", Palette],
    ["testimonials", "Testimonials", "प्रशंसापत्र", Quote],
    ["link", "Page link", "पेज लिंक", ExternalLink]
  ] as const;
  const content = tab === "buttons" ? <TapEditorPage params={{ id: business.id }} />
    : tab === "theme" ? <ThemeEditorPage params={{ id: business.id }} />
    : tab === "testimonials" ? <TestimonialsPage params={{ id: business.id }} />
    : null;

  return (
    <div className="space-y-5">
      <PageHeader title={<AppText en="My page" hi="मेरा पेज" />} description={business.name} actions={businesses.length > 1 ? <div className="flex flex-wrap gap-2">{businesses.map((item) => <Link key={item.id} href={`/dashboard/page?businessId=${item.id}&tab=${tab}`} aria-current={item.id === business.id ? "page" : undefined} className={`inline-flex min-h-9 items-center rounded-md border px-3 text-sm ${item.id === business.id ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"}`}>{item.name}</Link>)}</div> : undefined} />
      <nav className="flex gap-1 overflow-x-auto border-b" aria-label="My page sections">
        {tabs.map(([key, en, hi, Icon]) => <Link key={key} href={`/dashboard/page?businessId=${business.id}&tab=${key}`} aria-current={tab === key ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium ${tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}><Icon className="h-4 w-4" /><AppText en={en} hi={hi} /></Link>)}
      </nav>
      {tab === "overview" || tab === "link" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <section className="space-y-4">
            <div className="app-ui-panel p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"><AppText en="Your public page" hi="आपका पब्लिक पेज" /></p>
              <h2 className="mt-2 text-xl font-semibold">{business.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{business.description || <AppText en="Add a short description to help customers know what you offer." hi="ग्राहकों को अपनी सेवाओं के बारे में बताने के लिए छोटा विवरण जोड़ें।" />}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href={`/r/${business.slug}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"><AppText en="Open live page" hi="लाइव पेज खोलें" /><ExternalLink className="h-4 w-4" /></a>
                <Link href={`/dashboard/businesses/${business.id}/edit`} className="inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted"><AppText en="Edit business details" hi="कारोबार की जानकारी बदलें" /><ArrowUpRight className="h-4 w-4" /></Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Metric label={<AppText en="QR codes" hi="QR कोड" />} value={business._count.qrCodes} />
              <Metric label={<AppText en="Menu items" hi="मेन्यू आइटम" />} value={business._count.menuItems} />
              <Metric label={<AppText en="Reviews" hi="रिव्यू" />} value={business._count.reviews} />
            </div>
          </section>
          <aside className="app-ui-panel mx-auto w-full max-w-[360px] overflow-hidden p-3">
            <p className="mb-2 px-1 text-sm font-medium"><AppText en="Live page preview" hi="लाइव पेज प्रीव्यू" /></p>
            <div className="overflow-hidden rounded-[28px] border bg-background p-2 shadow-sm">
              <div className="mx-auto mb-2 h-1.5 w-14 rounded-full bg-muted-foreground/30" />
              <iframe src={`/r/${business.slug}`} title={`Live preview for ${business.name}`} className="h-[600px] w-full rounded-[20px] bg-background" loading="lazy" />
            </div>
          </aside>
        </div>
      ) : content}
    </div>
  );
}

function Metric({ label, value }: { label: React.ReactNode; value: number }) {
  return <div className="app-ui-panel p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>;
}

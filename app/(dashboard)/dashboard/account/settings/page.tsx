import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readableBusinessWhere } from "@/lib/tenant";
import { PageHeader, EmptyState } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import SettingsPage from "@/app/(dashboard)/dashboard/settings/page";
import BusinessesPage from "@/app/(dashboard)/dashboard/businesses/page";
import NewBusinessPage from "@/app/(dashboard)/dashboard/businesses/new/page";
import EditBusinessPage from "@/app/(dashboard)/dashboard/businesses/[id]/edit/page";
import StoreSettingsPage from "@/app/(dashboard)/dashboard/businesses/[id]/store/page";
import StaffPage from "@/app/(dashboard)/dashboard/businesses/[id]/staff/page";
import LocationsPage from "@/app/(dashboard)/dashboard/businesses/[id]/locations/page";

export const dynamic = "force-dynamic";

const sections = [
  ["profile", "Profile", "प्रोफ़ाइल"],
  ["businesses", "Businesses", "कारोबार"],
  ["business-details", "Business details", "कारोबार की जानकारी"],
  ["store", "Store hours & UPI", "दुकान का समय और UPI"],
  ["staff", "Team & staff", "टीम और कर्मचारी"],
  ["locations", "Locations", "लोकेशन"]
] as const;

export default async function AccountSettingsPage({ searchParams }: { searchParams: { section?: string; businessId?: string; new?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const businesses = await prisma.business.findMany({ where: readableBusinessWhere(user.id), select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
  const business = businesses.find((item) => item.id === searchParams.businessId) || businesses[0];
  const section = searchParams.new === "1" ? "business-details" : searchParams.section || "profile";
  const params = new URLSearchParams();
  params.set("section", section);
  if (business) params.set("businessId", business.id);
  const href = (next: string) => {
    const query = new URLSearchParams(params);
    query.set("section", next);
    query.delete("new");
    return `/dashboard/account/settings?${query}`;
  };

  let content: React.ReactNode;
  if (searchParams.new === "1") content = <NewBusinessPage />;
  else if (section === "businesses") content = <BusinessesPage />;
  else if (!business && section !== "profile") content = <EmptyState title={<AppText en="Add a business first" hi="पहले कारोबार जोड़ें" />} description={<AppText en="Business settings will show here once you add one." hi="कारोबार जोड़ने के बाद उसकी सेटिंग यहाँ दिखेगी।" />} action={<Link href="/dashboard/businesses/new" className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"><AppText en="Add business" hi="कारोबार जोड़ें" /></Link>} />;
  else if (section === "business-details" && business) content = <EditBusinessPage params={{ id: business.id }} />;
  else if (section === "store" && business) content = <StoreSettingsPage params={{ id: business.id }} />;
  else if (section === "staff" && business) content = <StaffPage params={{ id: business.id }} />;
  else if (section === "locations" && business) content = <LocationsPage params={{ id: business.id }} />;
  else content = <SettingsPage />;

  return (
    <div className="space-y-5">
      <PageHeader title={<AppText en="Settings" hi="सेटिंग" />} description={<AppText en="Your account, business details and team." hi="आपका खाता, कारोबार की जानकारी और टीम।" />} actions={businesses.length > 1 ? <BusinessSelect businesses={businesses} selected={business?.id || ""} section={section} /> : undefined} />
      <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Settings sections">
        {sections.map(([key, en, hi]) => <Link key={key} href={href(key)} aria-current={section === key ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center border-b-2 px-3 text-sm font-medium ${section === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}><AppText en={en} hi={hi} /></Link>)}
      </nav>
      {content}
    </div>
  );
}

function BusinessSelect({ businesses, selected, section }: { businesses: Array<{ id: string; name: string }>; selected: string; section: string }) {
  return <form action="/dashboard/account/settings" className="flex items-center gap-2">
    <input type="hidden" name="section" value={section} />
    <label><span className="sr-only">Business</span><select aria-label="Business" name="businessId" defaultValue={selected} className="h-10 max-w-52 rounded-md border bg-card px-3">
      {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
    </select></label>
    <button className="min-h-10 rounded-md border px-3 text-sm"><AppText en="Open" hi="खोलें" /></button>
  </form>;
}

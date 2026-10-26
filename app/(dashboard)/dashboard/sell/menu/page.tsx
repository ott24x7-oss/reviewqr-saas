import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readableBusinessWhere } from "@/lib/tenant";
import { PageHeader, EmptyState } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import MenuPage from "@/app/(dashboard)/dashboard/businesses/[id]/menu/page";

export const dynamic = "force-dynamic";

export default async function MenuAndProductsPage({ searchParams }: { searchParams: { businessId?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const businesses = await prisma.business.findMany({ where: readableBusinessWhere(user.id), select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
  const selected = businesses.find((business) => business.id === searchParams.businessId) || businesses[0];
  if (!selected) return <EmptyState title={<AppText en="Add a business first" hi="पहले कारोबार जोड़ें" />} description={<AppText en="Your menu and products will appear here." hi="आपका मेन्यू और उत्पाद यहाँ दिखेंगे।" />} action={<Link href="/dashboard/businesses/new" className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"><AppText en="Add business" hi="कारोबार जोड़ें" /></Link>} />;
  return <div className="space-y-5"><PageHeader title={<AppText en="Menu & products" hi="मेन्यू और उत्पाद" />} description={selected.name} actions={<BusinessSelect businesses={businesses} selected={selected.id} />} /><MenuPage params={{ id: selected.id }} /></div>;
}

function BusinessSelect({ businesses, selected }: { businesses: Array<{ id: string; name: string }>; selected: string }) {
  return <div className="flex flex-wrap gap-2">{businesses.map((business) => <Link key={business.id} href={`/dashboard/sell/menu?businessId=${business.id}`} aria-current={business.id === selected ? "page" : undefined} className={`inline-flex min-h-9 items-center rounded-md border px-3 text-sm ${business.id === selected ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"}`}>{business.name}</Link>)}</div>;
}

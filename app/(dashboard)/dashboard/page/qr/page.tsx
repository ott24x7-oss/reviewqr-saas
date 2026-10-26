import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readableBusinessWhere } from "@/lib/tenant";
import { PageHeader, EmptyState } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import QrCodesPage from "@/app/(dashboard)/dashboard/qr-codes/page";
import QrDetailPage from "@/app/(dashboard)/dashboard/qr-codes/[code]/page";
import BusinessQrPage from "@/app/(dashboard)/dashboard/businesses/[id]/qr/page";
import ActivatePage from "@/app/(dashboard)/dashboard/activate/page";

export const dynamic = "force-dynamic";

export default async function QrAndNfcPage({ searchParams }: { searchParams: { tab?: string; businessId?: string; code?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const businesses = await prisma.business.findMany({ where: readableBusinessWhere(user.id), select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
  const selected = businesses.find((business) => business.id === searchParams.businessId) || businesses[0];
  const tab = searchParams.tab || (searchParams.code ? "detail" : "codes");
  const tabs = [
    ["codes", "QR codes", "QR कोड"],
    ["create", "Create a code", "कोड बनाएँ"],
    ["activate", "Activate NFC", "NFC चालू करें"]
  ] as const;
  const content = tab === "detail" && searchParams.code ? <QrDetailPage params={{ code: searchParams.code }} />
    : tab === "create" && selected ? <BusinessQrPage params={{ id: selected.id }} />
    : tab === "activate" ? <ActivatePage searchParams={{ code: searchParams.code }} />
    : <QrCodesPage searchParams={{ business: selected?.id }} />;
  return <div className="space-y-5">
    <PageHeader title={<AppText en="QR codes & NFC" hi="QR कोड और NFC" />} description={selected?.name} actions={businesses.length > 1 ? <BusinessLinks businesses={businesses} selected={selected?.id || ""} /> : undefined} />
    <nav className="flex gap-2 overflow-x-auto border-b" aria-label="QR and NFC tools">
      {tabs.map(([key, en, hi]) => <Link key={key} href={`/dashboard/page/qr?tab=${key}${selected ? `&businessId=${selected.id}` : ""}`} aria-current={tab === key ? "page" : undefined} className={`inline-flex min-h-10 items-center border-b-2 px-3 text-sm font-medium ${tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}><AppText en={en} hi={hi} /></Link>)}
    </nav>
    {businesses.length ? content : <EmptyState title={<AppText en="Add a business first" hi="पहले कारोबार जोड़ें" />} description={<AppText en="Your QR codes will appear here." hi="आपके QR कोड यहाँ दिखेंगे।" />} action={<Link href="/dashboard/businesses/new" className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"><AppText en="Add business" hi="कारोबार जोड़ें" /></Link>} />}
  </div>;
}

function BusinessLinks({ businesses, selected }: { businesses: Array<{ id: string; name: string }>; selected: string }) {
  return <div className="flex flex-wrap gap-2">{businesses.map((business) => <Link key={business.id} href={`/dashboard/page/qr?businessId=${business.id}`} aria-current={business.id === selected ? "page" : undefined} className={`inline-flex min-h-9 items-center rounded-md border px-3 text-sm ${business.id === selected ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"}`}>{business.name}</Link>)}</div>;
}

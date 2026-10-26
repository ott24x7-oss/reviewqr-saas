import Link from "next/link";
import { PageHeader } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import CampaignsPage from "@/app/(dashboard)/dashboard/campaigns/page";
import OffersPage from "@/app/(dashboard)/dashboard/businesses/[id]/offers/page";

export const dynamic = "force-dynamic";

export default function OffersAndCampaignsPage({ searchParams }: { searchParams: { businessId?: string; tab?: string } }) {
  const showOffers = searchParams.tab === "offers" && !!searchParams.businessId;
  const href = (tab: string) => `/dashboard/sell/campaigns?${new URLSearchParams({ ...(searchParams.businessId ? { businessId: searchParams.businessId } : {}), tab })}`;
  return (
    <div className="space-y-5">
      <PageHeader title={<AppText en="Offers & campaigns" hi="ऑफ़र और अभियान" />} description={<AppText en="Share useful offers and customer messages from one place." hi="उपयोगी ऑफ़र और ग्राहक संदेश एक जगह से साझा करें।" />} />
      <nav className="flex gap-2 overflow-x-auto border-b" aria-label="Offers and campaigns">
        <Tab href={href("campaigns")} active={!showOffers}><AppText en="Campaigns" hi="अभियान" /></Tab>
        {searchParams.businessId ? <Tab href={href("offers")} active={showOffers}><AppText en="Offers" hi="ऑफ़र" /></Tab> : null}
      </nav>
      {showOffers ? <OffersPage params={{ id: searchParams.businessId! }} /> : <CampaignsPage />}
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-10 items-center border-b-2 px-3 text-sm font-medium ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{children}</Link>;
}

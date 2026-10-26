import Link from "next/link";
import { PageHeader } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import ReferPage from "@/app/(dashboard)/dashboard/refer/page";
import ShopCommissionPage from "@/app/(dashboard)/dashboard/shop/commission/page";

export const dynamic = "force-dynamic";

export default function ReferAndEarnPage({ searchParams }: { searchParams: { tab?: string } }) {
  const hardware = searchParams.tab === "hardware";
  return <div className="space-y-5">
    <PageHeader title={<AppText en="Refer & earn" hi="रेफ़र करें और कमाएँ" />} description={<AppText en="Share QR24x7 with another business and follow your rewards." hi="QR24x7 को दूसरे कारोबार के साथ साझा करें और अपना इनाम देखें।" />} />
    <nav className="flex gap-2 overflow-x-auto border-b" aria-label="Referral earnings">
      <Tab href="/dashboard/account/refer" active={!hardware}><AppText en="Referral link" hi="रेफ़रल लिंक" /></Tab>
      <Tab href="/dashboard/account/refer?tab=hardware" active={hardware}><AppText en="Hardware rewards" hi="हार्डवेयर इनाम" /></Tab>
    </nav>
    {hardware ? <ShopCommissionPage /> : <ReferPage />}
  </div>;
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-10 items-center border-b-2 px-3 text-sm font-medium ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{children}</Link>;
}

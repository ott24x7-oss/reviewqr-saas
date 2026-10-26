import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readableBusinessWhere } from "@/lib/tenant";
import { PageHeader } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import BusinessPrintPage from "@/app/(dashboard)/dashboard/businesses/[id]/print/page";
import PrintPaperPage from "@/app/(dashboard)/dashboard/print/paper/page";
import ShopPage from "@/app/(dashboard)/dashboard/shop/page";
import ShopOrdersPage from "@/app/(dashboard)/dashboard/shop/orders/page";
import ShopCartPage from "@/app/(dashboard)/dashboard/shop/cart/page";
import ShopProductPage from "@/app/(dashboard)/dashboard/shop/[slug]/page";
import ShopOrderDetailPage from "@/app/(dashboard)/dashboard/shop/orders/[id]/page";

export const dynamic = "force-dynamic";

export default async function PrintAndStandsPage({ searchParams }: { searchParams: { businessId?: string; tab?: string; slug?: string; orderId?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const businesses = await prisma.business.findMany({ where: readableBusinessWhere(user.id), select: { id: true, name: true }, orderBy: { createdAt: "asc" } });
  const business = businesses.find((item) => item.id === searchParams.businessId) || businesses[0];
  const tab = searchParams.tab || "print";
  const destinations = [
    ["print", "Print my QR", "अपना QR प्रिंट करें"],
    ["paper", "Print sheets", "प्रिंट शीट"],
    ["shop", "Order stands", "स्टैंड ऑर्डर करें"],
    ["orders", "My orders", "मेरे ऑर्डर"]
  ] as const;
  let content: React.ReactNode;
  if (tab === "paper") content = <PrintPaperPage />;
  else if (tab === "shop") content = <ShopPage />;
  else if (tab === "orders") content = <ShopOrdersPage />;
  else if (tab === "cart") content = <ShopCartPage />;
  else if (tab === "product" && searchParams.slug) content = <ShopProductPage params={{ slug: searchParams.slug }} />;
  else if (tab === "order" && searchParams.orderId) content = <ShopOrderDetailPage params={{ id: searchParams.orderId }} />;
  else content = business ? <BusinessPrintPage params={{ id: business.id }} /> : <div className="app-ui-panel p-5"><p className="text-sm text-muted-foreground"><AppText en="Add a business before printing its QR code." hi="QR कोड प्रिंट करने से पहले कारोबार जोड़ें।" /></p></div>;
  return <div className="space-y-5">
    <PageHeader title={<AppText en="Print & order stands" hi="प्रिंट और ऑर्डर स्टैंड" />} description={business?.name} />
    <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Print and stands">
      {destinations.map(([key, en, hi]) => <Link key={key} href={`/dashboard/page/print?tab=${key}${business ? `&businessId=${business.id}` : ""}`} aria-current={tab === key ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center border-b-2 px-3 text-sm font-medium ${tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}><AppText en={en} hi={hi} /></Link>)}
    </nav>
    {businesses.length ? content : tab === "shop" || tab === "orders" ? content : <Link href="/dashboard/businesses/new" className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"><AppText en="Add your business" hi="अपना कारोबार जोड़ें" /></Link>}
  </div>;
}

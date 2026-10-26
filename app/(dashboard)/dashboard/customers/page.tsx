import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadCustomerPage } from "@/lib/store/customer-list";
import { PageHeader, EmptyState } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import { CustomersTable } from "./customers-table";
import { Download, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string; page?: string; sort?: string; dir?: "asc" | "desc"; businessId?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const pageIndex = Math.max(0, Math.min(500, Number(searchParams.page || 0) || 0));
  const page = await loadCustomerPage(user.id, { query: searchParams.q, pageIndex, pageSize: 20, sort: searchParams.sort, direction: searchParams.dir, businessId: searchParams.businessId });
  return <div className="space-y-5">
    <PageHeader
      title={<AppText en="Customers" hi="ग्राहक" />}
      description={<AppText en="People who chose to share their contact details with your business." hi="वे लोग जिन्होंने आपके कारोबार के साथ अपनी संपर्क जानकारी साझा करने की अनुमति दी।" />}
      actions={<a href="/api/customers/export" className="inline-flex min-h-10 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><Download className="h-4 w-4" /><AppText en="Download CSV" hi="CSV डाउनलोड करें" /></a>}
    />
    {page.total === 0 ? <div className="app-ui-panel"><EmptyState icon={<Users className="h-5 w-5" />} title={<AppText en={searchParams.q ? "No matching customers" : "No customers yet"} hi={searchParams.q ? "कोई मिलता-जुलता ग्राहक नहीं" : "अभी कोई ग्राहक नहीं"} />} description={<AppText en={searchParams.q ? "Try another name or phone number." : "Customers appear after they choose to share their phone number."} hi={searchParams.q ? "दूसरा नाम या फ़ोन नंबर खोजें।" : "ग्राहक तब दिखेंगे जब वे अपना फ़ोन नंबर साझा करने की अनुमति देंगे।"} />} action={!searchParams.q ? <Link href="/dashboard/sell/orders" className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium"><AppText en="View orders" hi="ऑर्डर देखें" /></Link> : undefined} /></div> : <CustomersTable rows={page.rows} total={page.total} pageIndex={page.pageIndex} pageSize={page.pageSize} query={searchParams.q || ""} sort={searchParams.sort || "lastOrderAt"} direction={searchParams.dir || "desc"} />}
  </div>;
}

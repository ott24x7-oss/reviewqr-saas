import Link from "next/link";
import { PageHeader } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import ReviewsPage from "@/app/(dashboard)/dashboard/reviews/page";
import TemplatesPage from "@/app/(dashboard)/dashboard/businesses/[id]/review-templates/page";

export const dynamic = "force-dynamic";

export default function ReviewsHub({ searchParams }: { searchParams: { business?: string; businessId?: string; rating?: string; show?: string; tab?: string } }) {
  const businessId = searchParams.businessId || searchParams.business;
  const showTemplates = searchParams.tab === "templates" && !!businessId;
  const params = new URLSearchParams();
  if (businessId) params.set("businessId", businessId);
  const reviewsHref = `/dashboard/reputation/reviews?${params.toString()}`;
  const templatesHref = `/dashboard/reputation/reviews?${new URLSearchParams({ ...(businessId ? { businessId } : {}), tab: "templates" })}`;
  return <div className="space-y-5">
    <PageHeader title={<AppText en="Reviews" hi="रिव्यू" />} description={<AppText en="Read customer reviews, spot patterns and reply." hi="ग्राहक रिव्यू पढ़ें, पैटर्न समझें और जवाब दें।" />} />
    <nav className="flex gap-2 overflow-x-auto border-b" aria-label="Reviews sections">
      <Tab href={reviewsHref} active={!showTemplates}><AppText en="All reviews" hi="सभी रिव्यू" /></Tab>
      {businessId ? <Tab href={templatesHref} active={showTemplates}><AppText en="Reply templates" hi="जवाब के टेम्पलेट" /></Tab> : null}
    </nav>
    {showTemplates ? <TemplatesPage params={{ id: businessId! }} /> : <ReviewsPage searchParams={{ rating: searchParams.rating, business: businessId, show: searchParams.show }} />}
  </div>;
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-10 items-center border-b-2 px-3 text-sm font-medium ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{children}</Link>;
}

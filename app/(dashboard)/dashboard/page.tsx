import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Activity, ArrowUpRight, Building2, CircleHelp,
  Clock3, MessageSquare, Package, QrCode, ShoppingBag, Star, Users
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readableBusinessWhere } from "@/lib/tenant";
import { hasModule } from "@/lib/plans/entitlements";
import { setupChecklist } from "@/lib/growth/setup";
import { addIstDays, istDayKey, istDayRange } from "@/lib/analytics/ist";
import { kolkataDayWindow } from "@/lib/store/day";
import { PageHeader, KpiCard, SetupStepper, type SetupStep, EmptyState, RelativeTime, StatusBadge } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import { GrowthCard } from "@/components/dashboard/growth-card";

export const dynamic = "force-dynamic";

type ActivityRow = {
  id: string;
  kind: "order" | "review" | "feedback";
  titleEn: string;
  titleHi: string;
  detail: string;
  createdAt: Date;
  href: string;
  status?: string;
  tone?: "success" | "warning" | "info";
};

function countEnabledLinks(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  const links = (value as { links?: unknown }).links;
  if (!Array.isArray(links)) return 0;
  return links.filter((link) => !!link && typeof link === "object" && (link as { enabled?: boolean }).enabled !== false).length;
}

function valueArray(rows: Array<{ day: Date; scans: number; orderCount: number; ratingCount: number; orderPaise: number }>, field: "scans" | "orderCount" | "ratingCount" | "orderPaise", days: number) {
  const totals = new Map(rows.map((row) => [row.day.toISOString().slice(0, 10), row[field]]));
  return Array.from({ length: days }, (_, index) => totals.get(addIstDays(istDayKey(new Date()), index - (days - 1))) || 0);
}

export default async function DashboardOverview({
  searchParams
}: {
  searchParams: { businessId?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const businesses = await prisma.business.findMany({
    where: readableBusinessWhere(user.id),
    select: {
      id: true,
      ownerId: true,
      name: true,
      slug: true,
      phone: true,
      address: true,
      city: true,
      logo: true,
      tapPage: { select: { published: true, draft: true } },
      storeSettings: { select: { hours: true, upiId: true } },
      _count: { select: { qrCodes: true, menuItems: true } }
    },
    orderBy: { createdAt: "asc" }
  });
  const skip = cookies().get("rq_onboarding_skip")?.value === "1";
  const memberCount = await prisma.businessMember.count({ where: { userId: user.id } });
  if (businesses.length === 0 && memberCount === 0 && !skip) redirect("/dashboard/onboarding");
  if (businesses.length === 0) {
    return <EmptyState
      icon={<Building2 className="h-5 w-5" />}
      title={<AppText en="Welcome to QR24x7" hi="QR24x7 में आपका स्वागत है" />}
      description={<AppText en="Add a business to get your page, QR codes and customer reviews in one place." hi="अपना पेज, QR कोड और ग्राहक रिव्यू एक जगह पाने के लिए कारोबार जोड़ें।" />}
      action={<Link href="/dashboard/businesses/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"><Building2 className="h-4 w-4" /><AppText en="Add your business" hi="अपना कारोबार जोड़ें" /></Link>}
    />;
  }

  const activeBusiness = businesses.find((business) => business.id === searchParams.businessId) || businesses[0];
  const businessIds = searchParams.businessId && businesses.some((business) => business.id === searchParams.businessId)
    ? [searchParams.businessId]
    : businesses.map((business) => business.id);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { start: todayStart, end: tomorrowStart } = kolkataDayWindow();
  const todayKey = istDayKey(new Date());
  const weekFrom = istDayRange(addIstDays(todayKey, -6)).start;

  const [userPlan, menuOn, printedMark, scannedQr, todayScans, todayOrders, todayReviews, todaySales, openOrders, openFeedback, lowRatings, weeklyDays, recentOrderRows, recentReviewRows, recentFeedbackRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { subscriptionEndsAt: true, subscriptionStatus: true } }),
    hasModule(activeBusiness.ownerId, "MENU"),
    prisma.onboardingMark.findUnique({ where: { userId_kind: { userId: user.id, kind: "printed_qr" } }, select: { id: true } }),
    prisma.qRCode.count({ where: { businessId: activeBusiness.id, scans: { gt: 0 } } }),
    prisma.qrScan.count({ where: { createdAt: { gte: todayStart, lt: tomorrowStart }, qrCode: { businessId: { in: businessIds } } } }),
    prisma.menuOrder.count({ where: { businessId: { in: businessIds }, createdAt: { gte: todayStart, lt: tomorrowStart }, status: { not: "REJECTED" } } }),
    prisma.review.count({ where: { businessId: { in: businessIds }, createdAt: { gte: todayStart, lt: tomorrowStart } } }),
    prisma.menuOrder.aggregate({ where: { businessId: { in: businessIds }, createdAt: { gte: todayStart, lt: tomorrowStart }, status: { not: "REJECTED" } }, _sum: { totalPaise: true } }),
    prisma.menuOrder.count({ where: { businessId: { in: businessIds }, status: "NEW" } }),
    prisma.feedback.count({ where: { businessId: { in: businessIds }, status: "NEW" } }),
    prisma.review.count({ where: { businessId: { in: businessIds }, rating: { lte: 3 }, createdAt: { gte: since } } }),
    prisma.analyticsDaily.findMany({ where: { businessId: { in: businessIds }, day: { gte: weekFrom } }, select: { day: true, scans: true, orderCount: true, ratingCount: true, orderPaise: true }, orderBy: { day: "asc" } }),
    prisma.menuOrder.findMany({ where: { businessId: { in: businessIds } }, select: { id: true, number: true, status: true, createdAt: true, business: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.review.findMany({ where: { businessId: { in: businessIds } }, select: { id: true, customerName: true, rating: true, createdAt: true, business: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.feedback.findMany({ where: { businessId: { in: businessIds } }, select: { id: true, message: true, createdAt: true, business: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 4 })
  ]);

  const hours = activeBusiness.storeSettings?.hours;
  const hasHours = !!hours && typeof hours === "object" && !Array.isArray(hours) && Object.keys(hours).length > 0;
  const setup = setupChecklist({
    hasDetails: [activeBusiness.phone, activeBusiness.address, activeBusiness.city].some((value) => !!value?.trim()),
    hasLink: !!activeBusiness.slug.trim(),
    hasMenu: activeBusiness._count.menuItems > 0,
    menuOn,
    hasButtons: Math.max(countEnabledLinks(activeBusiness.tapPage?.published), countEnabledLinks(activeBusiness.tapPage?.draft)) > 0,
    hasHours,
    hasUpi: !!activeBusiness.storeSettings?.upiId.trim(),
    printed: !!printedMark || scannedQr > 0
  });
  const setupSteps: SetupStep[] = [
    { id: "details", title: <AppText en="Business details" hi="कारोबार की जानकारी" />, detail: <AppText en="Add your phone number and address so customers can recognise and contact your business." hi="अपना फ़ोन नंबर और पता जोड़ें, ताकि ग्राहक आपके कारोबार को पहचानें और संपर्क कर सकें।" />, done: setup[0].done, href: `/dashboard/businesses/${activeBusiness.id}/edit` },
    { id: "link", title: <AppText en="Page link" hi="पेज लिंक" />, detail: <AppText en="Your page link gives customers one simple place to find your business online." hi="आपका पेज लिंक ग्राहकों को ऑनलाइन आपका कारोबार आसानी से ढूँढ़ने देता है।" />, done: setup[1].done, href: `/dashboard/page?businessId=${activeBusiness.id}&tab=link` },
    { id: "menu", title: <AppText en="Menu & products" hi="मेन्यू और उत्पाद" />, detail: <AppText en="Add the items or services customers can browse and order from your page." hi="वे आइटम या सेवाएँ जोड़ें जिन्हें ग्राहक आपके पेज पर देखकर ऑर्डर कर सकते हैं।" />, done: setup[2].done, href: `/dashboard/sell/menu?businessId=${activeBusiness.id}` },
    { id: "buttons", title: <AppText en="Page buttons" hi="पेज बटन" />, detail: <AppText en="Choose the actions customers can take, such as calling, messaging or viewing your menu." hi="चुनें कि ग्राहक क्या कर सकें, जैसे कॉल करना, संदेश भेजना या मेन्यू देखना।" />, done: setup[3].done, href: `/dashboard/page?businessId=${activeBusiness.id}&tab=buttons` },
    { id: "store", title: <AppText en="Store hours & UPI" hi="दुकान का समय और UPI" />, detail: <AppText en="Show when you are open and how customers can pay when they place an order." hi="दुकान खुलने का समय और ऑर्डर पर भुगतान का तरीका दिखाएँ।" />, done: setup[4].done, href: `/dashboard/account/settings?businessId=${activeBusiness.id}&section=store` },
    { id: "print", title: <AppText en="Print your QR" hi="अपना QR प्रिंट करें" />, detail: <AppText en="Put your QR where customers can scan it to open your page and leave a review." hi="अपना QR ऐसी जगह लगाएँ जहाँ ग्राहक पेज खोलने और रिव्यू देने के लिए स्कैन कर सकें।" />, done: setup[5].done, href: `/dashboard/page/print?businessId=${activeBusiness.id}` }
  ];

  const activity: ActivityRow[] = [
    ...recentOrderRows.map((row) => ({ id: `order-${row.id}`, kind: "order" as const, titleEn: `Order ${row.number}`, titleHi: `ऑर्डर ${row.number}`, detail: row.business.name, status: row.status, createdAt: row.createdAt, href: "/dashboard/sell/orders", tone: row.status === "NEW" ? "warning" as const : "info" as const })),
    ...recentReviewRows.map((row) => ({ id: `review-${row.id}`, kind: "review" as const, titleEn: `${row.rating}★ · ${row.customerName || "Customer review"}`, titleHi: `${row.rating}★ · ${row.customerName || "ग्राहक का रिव्यू"}`, detail: row.business.name, createdAt: row.createdAt, href: "/dashboard/reputation/reviews", tone: row.rating >= 4 ? "success" as const : "warning" as const })),
    ...recentFeedbackRows.map((row) => ({ id: `feedback-${row.id}`, kind: "feedback" as const, titleEn: row.message?.trim().slice(0, 90) || "New private feedback", titleHi: row.message?.trim().slice(0, 90) || "नया निजी फ़ीडबैक", detail: row.business.name, createdAt: row.createdAt, href: "/dashboard/reputation/feedback", tone: "info" as const }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 7);
  const todo = [
    ...(openOrders ? [{ href: "/dashboard/sell/orders", icon: ShoppingBag, title: <AppText en="New orders" hi="नए ऑर्डर" />, detail: <AppText en={`${openOrders} waiting for a response`} hi={`${openOrders} ऑर्डर जवाब का इंतज़ार कर रहे हैं`} />, count: openOrders }] : []),
    ...(openFeedback ? [{ href: "/dashboard/reputation/feedback", icon: MessageSquare, title: <AppText en="Unanswered feedback" hi="बिना जवाब का फ़ीडबैक" />, detail: <AppText en={`${openFeedback} customers are waiting`} hi={`${openFeedback} ग्राहक जवाब का इंतज़ार कर रहे हैं`} />, count: openFeedback }] : []),
    ...(lowRatings ? [{ href: "/dashboard/reputation/reviews?rating=3", icon: Star, title: <AppText en="Recent low ratings" hi="हाल की कम रेटिंग" />, detail: <AppText en={`${lowRatings} reviews need a look`} hi={`${lowRatings} रिव्यू देखने हैं`} />, count: lowRatings }] : []),
    ...(userPlan?.subscriptionEndsAt && userPlan.subscriptionEndsAt.getTime() - Date.now() < 14 * 86400000 && userPlan.subscriptionEndsAt.getTime() > Date.now()
      ? [{ href: "/dashboard/account/plan", icon: Clock3, title: <AppText en="Plan ending soon" hi="प्लान जल्द खत्म होगा" />, detail: <AppText en="Review your plan and renewal date" hi="अपने प्लान और नवीनीकरण की तारीख देखें" />, count: 1 }]
      : [])
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={<AppText en={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user.name?.split(" ")[0] || "there"}`} hi={`नमस्ते, ${user.name?.split(" ")[0] || "जी"}`} />}
        description={<><span className="font-medium text-foreground">{activeBusiness.name}</span><span className="mx-2">·</span><AppText en={`${businesses.length} ${businesses.length === 1 ? "business" : "businesses"}`} hi={`${businesses.length} कारोबार`} /></>}
        actions={<Link href="/dashboard/businesses/new" className="inline-flex min-h-10 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted"><Building2 className="h-4 w-4" /><AppText en="Add business" hi="कारोबार जोड़ें" /></Link>}
      />

      {setupSteps.some((step) => !step.done) ? (
        <SetupStepper steps={setupSteps} title={<AppText en="Get your page ready" hi="अपना पेज तैयार करें" />} completeLabel={<AppText en="steps done" hi="कदम पूरे" />} />
      ) : null}

      <section aria-label="Today's business activity">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold"><AppText en="Today" hi="आज" /></h2>
            <p className="mt-0.5 text-xs text-muted-foreground"><AppText en="A quick look at your business" hi="आपके कारोबार की एक झलक" /></p>
          </div>
          <Link href="/dashboard/insights" className="app-ui-focus inline-flex min-h-9 items-center gap-1 text-sm font-medium text-primary"><AppText en="View analytics" hi="एनालिटिक्स देखें" /><ArrowUpRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiCard label={<AppText en="Scans" hi="स्कैन" />} value={todayScans} delta={<AppText en="QR and NFC visits" hi="QR और NFC विज़िट" />} data={valueArray(weeklyDays, "scans", 7)} />
          <KpiCard label={<AppText en="Orders" hi="ऑर्डर" />} value={todayOrders} delta={<AppText en="Today" hi="आज" />} data={valueArray(weeklyDays, "orderCount", 7)} />
          <KpiCard label={<AppText en="Reviews" hi="रिव्यू" />} value={todayReviews} delta={<AppText en="New today" hi="आज के नए" />} data={valueArray(weeklyDays, "ratingCount", 7)} />
          <KpiCard label={<AppText en="Sales" hi="बिक्री" />} value={Number(todaySales._sum.totalPaise || 0) / 100} format="inr" delta={<AppText en="Paid and open orders" hi="भुगतान और खुले ऑर्डर" />} data={valueArray(weeklyDays, "orderPaise", 7).map((value) => value / 100)} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="app-ui-panel overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
            <div><h2 className="font-semibold"><AppText en="Your to-do list" hi="आपके काम" /></h2><p className="mt-0.5 text-sm text-muted-foreground"><AppText en="The next things that need your attention" hi="अगले काम जिन पर ध्यान देना है" /></p></div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums">{todo.length}</span>
          </header>
          {todo.length ? <ul className="divide-y px-4 sm:px-5">
            {todo.map((item) => <li key={item.href}>
              <Link href={item.href} className="app-ui-focus flex min-h-[68px] items-center gap-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><item.icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="block truncate text-xs text-muted-foreground">{item.detail}</span></span>
                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">{item.count}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>)}
          </ul> : <EmptyState icon={<Activity className="h-5 w-5" />} title={<AppText en="You're all caught up" hi="आपके सभी काम पूरे हैं" />} description={<AppText en="We'll show new orders and customer messages here." hi="नए ऑर्डर और ग्राहक संदेश यहाँ दिखेंगे।" />} />}
        </section>
        <GrowthCard businessId={activeBusiness.id} />
      </div>

      <section className="app-ui-panel overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
          <div><h2 className="font-semibold"><AppText en="Recent activity" hi="हाल की गतिविधि" /></h2><p className="mt-0.5 text-sm text-muted-foreground"><AppText en="Orders, reviews and messages from your customers" hi="ग्राहकों के ऑर्डर, रिव्यू और संदेश" /></p></div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/sell/orders" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted"><ShoppingBag className="h-3.5 w-3.5" /><AppText en="Orders" hi="ऑर्डर" /></Link>
            <Link href="/dashboard/reputation/reviews" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted"><Star className="h-3.5 w-3.5" /><AppText en="Reviews" hi="रिव्यू" /></Link>
          </div>
        </header>
        {activity.length ? <ul className="divide-y px-4 sm:px-5">
          {activity.map((item) => <li key={item.id}>
            <Link href={item.href} className="app-ui-focus flex min-h-[68px] items-center gap-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">{item.kind === "order" ? <ShoppingBag className="h-4 w-4" /> : item.kind === "review" ? <Star className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium"><AppText en={item.titleEn} hi={item.titleHi} /></span><span className="block truncate text-xs text-muted-foreground">{item.detail}</span></span>
              {item.kind === "order" ? <StatusBadge tone={item.tone}>{item.status === "NEW" ? <AppText en="New" hi="नया" /> : <AppText en="Order" hi="ऑर्डर" />}</StatusBadge> : null}
              <span className="shrink-0 text-xs text-muted-foreground"><RelativeTime date={item.createdAt} /></span>
            </Link>
          </li>)}
        </ul> : <EmptyState icon={<Activity className="h-5 w-5" />} title={<AppText en="No activity yet" hi="अभी कोई गतिविधि नहीं" />} description={<AppText en="Share your QR code to welcome your first customer." hi="पहले ग्राहक का स्वागत करने के लिए अपना QR कोड शेयर करें।" />} action={<Link href={`/dashboard/page/qr?businessId=${activeBusiness.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium"><QrCode className="h-4 w-4" /><AppText en="Open QR codes" hi="QR कोड खोलें" /></Link>} />}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <BusinessShortcut href="/dashboard/sell/menu" icon={<Package className="h-4 w-4" />} title={<AppText en="Menu & products" hi="मेन्यू और उत्पाद" />} description={<AppText en={`${activeBusiness._count.menuItems} items in your menu`} hi={`मेन्यू में ${activeBusiness._count.menuItems} आइटम`} />} />
        <BusinessShortcut href="/dashboard/account/settings" icon={<Users className="h-4 w-4" />} title={<AppText en="Your business" hi="आपका कारोबार" />} description={<AppText en="Details, team and store hours" hi="जानकारी, टीम और खुलने का समय" />} />
        <BusinessShortcut href="/dashboard/account/help" icon={<CircleHelp className="h-4 w-4" />} title={<AppText en="Need a hand?" hi="मदद चाहिए?" />} description={<AppText en="Find answers or contact support" hi="जवाब पाएँ या सहायता से संपर्क करें" />} />
      </section>

    </div>
  );
}

function BusinessShortcut({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: React.ReactNode; description: React.ReactNode }) {
  return <Link href={href} className="app-ui-focus app-ui-panel flex min-h-[76px] items-center gap-3 p-4 transition-colors hover:bg-muted/40">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">{icon}</span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span></span>
    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
  </Link>;
}

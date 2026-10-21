import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { OffersEditor, type OfferBannerRow, type OfferCoupon } from "./offers-editor";

export const dynamic = "force-dynamic";

export default async function OffersPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const access = await requireBusinessRole(user.id, params.id, "read");
  if (!access) notFound();
  const [coupons, banners] = await Promise.all([
    prisma.coupon.findMany({ where: { businessId: access.id }, orderBy: { createdAt: "desc" } }),
    prisma.offerBanner.findMany({
      where: { businessId: access.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    })
  ]);
  const couponRows: OfferCoupon[] = coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    kind: coupon.kind,
    amount: coupon.kind === "PERCENT" ? coupon.amount : coupon.amount / 100,
    minRupees: coupon.minSubtotalPaise / 100,
    expiresOn: coupon.expiresAt
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(coupon.expiresAt)
      : "",
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    active: coupon.active
  }));
  const bannerRows: OfferBannerRow[] = banners.map((banner) => ({
    id: banner.id,
    title: banner.title,
    body: banner.body,
    expiresOn: banner.expiresAt
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(banner.expiresAt)
      : "",
    active: banner.active
  }));
  return (
    <OffersEditor
      businessId={access.id}
      businessName={access.name}
      canEdit={access.accessRole !== "STAFF"}
      coupons={couponRows}
      banners={bannerRows}
    />
  );
}

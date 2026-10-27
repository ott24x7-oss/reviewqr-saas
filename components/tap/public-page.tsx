import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { tapFontClass } from "@/components/brand/tap-font";
import { getBrand } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { generateQrDataUrl } from "@/lib/qr";
import { getAiConfig, getTurnstileConfig } from "@/lib/settings";
import { recordQrScan } from "@/lib/scans";
import { remindExpiredOwner } from "@/lib/tap/expiry-notice";
import { closeTimeAt } from "@/lib/tap/hours";
import { tapText } from "@/lib/tap/i18n";
import { isLookupCode } from "@/lib/tap/ids";
import { landingChips, landingFamily } from "@/lib/tap/landing";
import { hoursFromPublished, presentBusiness, whatsAppNumberUrl, type PublicLink } from "@/lib/tap/links";
import { loadEntitlement } from "@/lib/plans/entitlements";
import { orderedReviewTargets } from "@/lib/review-policy";
import { loadPublicTap, type TapRecord } from "@/lib/tap/resolve";
import { scanSource } from "@/lib/tap/source";
import { readAdminThemes } from "@/lib/tap/theme-store";
import { resolveTheme, tokensToStyle } from "@/lib/tap/themes";
import { LandingPlaceholder } from "./landing-placeholder";
import { StatusCard } from "./status-card";
import { TapExperience } from "./tap-experience";

async function upiImages(links: PublicLink[]) {
  const images: Record<string, string> = {};
  for (const link of links) {
    if (link.type !== "upi" || !link.href) continue;
    images[link.key] = await generateQrDataUrl(link.href, { size: 220 });
  }
  return images;
}

export async function PublicTap({
  code,
  channel,
  src,
  countScan,
  record: prepared
}: {
  code: string;
  channel: "q" | "t";
  src?: string;
  countScan: boolean;
  record?: TapRecord;
}) {
  if (!prepared && !isLookupCode(code)) notFound();
  const record = prepared || (await loadPublicTap(code));
  if (record.status === "not_found") notFound();

  const source = scanSource(channel, src);
  if (countScan && (record.status === "active" || record.status === "limited")) {
    await recordQrScan(record.qrId, headers(), source).catch(() => {});
  }

  if (record.status === "unassigned") {
    const brand = await getBrand().catch(() => null);
    const email = brand?.supportEmail || "hello@qr24x7.in";
    return (
      <StatusCard
        title={tapText("en", "unassignedTitle")}
        detail={`Ask ${email} or sign in to activate this code.`}
        action={{ href: `/dashboard/activate?code=${encodeURIComponent(code)}`, label: "Activate this code" }}
      />
    );
  }

  if (record.status === "disabled") {
    return <StatusCard title={tapText("en", "disabledTitle")} />;
  }

  const view = presentBusiness(record.business, channel, code);
  const extra = await readAdminThemes().catch(() => []);
  const theme = resolveTheme({ published: record.business.published, paid: record.paid, extra });
  const themeProps = {
    themeStyle: tokensToStyle(theme.tokens),
    buttons: theme.tokens.buttons,
    avatar: theme.tokens.avatar,
    entrance: theme.tokens.entrance,
    video: theme.video
  };
  if (record.status === "limited") {
    await remindExpiredOwner(record.ownerId, view.name).catch(() => {});
    const review = orderedReviewTargets(record.business)[0];
    const chat = whatsAppNumberUrl(record.business.whatsappNumber);
    const family = landingFamily(view.industry);
    return (
      <div
        className={`tap-page tap-landing ${tapFontClass}`}
        style={themeProps.themeStyle}
        data-buttons={themeProps.buttons}
        data-family={family}
        data-testid="public-basic"
      >
        <div className="tap-stage">
          <div className="tap-landing-hero">
            <div className="tap-landing-media">
              {view.cover ? <img src={view.cover} alt="" /> : <LandingPlaceholder family={family} />}
            </div>
            <div className="tap-landing-sheet">
              <h1>{view.name}</h1>
              {view.open === null ? null : (
                <p className="tap-hours" data-open={view.open ? "true" : "false"}>
                  <span aria-hidden="true" />
                  {view.open ? "Open now" : "Closed now"}
                </p>
              )}
              <div className="tap-actions">
                {view.call ? (
                  <a className="tap-primary" href={view.call}>
                    Call
                  </a>
                ) : null}
                {chat ? (
                  <a className="tap-primary" href={chat} rel="noreferrer">
                    WhatsApp
                  </a>
                ) : null}
                {review ? (
                  <a className="tap-primary" href={review.href} rel="noreferrer">
                    {review.labelEn}
                  </a>
                ) : null}
                {view.directions ? (
                  <a className="tap-primary" href={view.directions} rel="noreferrer">
                    Map
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <p className="tap-footer">
            Powered by <a href="/">QR24x7</a>
          </p>
        </div>
      </div>
    );
  }

  const entitlement = await loadEntitlement(record.ownerId).catch(() => null);
  const modules = entitlement?.modules ?? [];
  const showMenu = modules.includes("MENU") || modules.includes("STORE");
  const showStore = modules.includes("STORE");
  const links = view.links.filter((item) => {
    if (!showMenu && (item.type === "menu" || item.type === "whatsapp_order")) return false;
    if (!showStore && item.type === "whatsapp_order") return false;
    return true;
  });
  const family = landingFamily(view.industry);
  const closesAt = view.open ? closeTimeAt(hoursFromPublished(record.business.published)) : null;
  const [turnstile, aiCfg, reviewStats, store, serviceTotal, productTotal, menuItems] = await Promise.all([
    getTurnstileConfig().catch(() => ({ siteKey: "" })),
    getAiConfig().catch(() => ({ enabled: false, apiKey: "" })),
    prisma.review.aggregate({
      where: { businessId: record.businessId },
      _avg: { rating: true },
      _count: { _all: true }
    }),
    prisma.storeSettings.findUnique({
      where: { businessId: record.businessId },
      select: { dineIn: true, takeaway: true, delivery: true }
    }),
    prisma.menuItem.count({ where: { businessId: record.businessId, available: true, kind: "SERVICE" } }),
    prisma.menuItem.count({ where: { businessId: record.businessId, available: true, kind: "PRODUCT" } }),
    showMenu
      ? prisma.menuItem.findMany({
          where: { businessId: record.businessId, available: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          take: 12,
          select: { id: true, name: true, pricePaise: true }
        })
      : Promise.resolve([])
  ]);
  const reviewCount = reviewStats._count._all;
  const rating =
    reviewCount > 0 && typeof reviewStats._avg.rating === "number"
      ? { average: reviewStats._avg.rating, count: reviewCount }
      : null;
  const turnstileSiteKey = turnstile.siteKey || "";
  const upiQr = await upiImages(view.links).catch(() => ({}));
  return (
    <div className={tapFontClass}>
      <TapExperience
        code={code}
        channel={channel}
        src={source}
        name={view.name}
        slug={view.slug}
        logo={view.logo}
        cover={view.cover}
        bio={view.bio}
        bioHi={view.bioHi}
        open={view.open}
        links={links}
        gallery={view.gallery}
        upiQr={upiQr}
        locationSlug={record.locationSlug}
        staffSlug={record.staffSlug}
        turnstileSiteKey={turnstileSiteKey}
        reviewLinks={orderedReviewTargets(record.business)}
        reviewGating={record.business.reviewGating === true}
        ratingThreshold={record.business.ratingThreshold || 4}
        aiEnabled={aiCfg.enabled === true && !!aiCfg.apiKey && record.business.aiReviewsEnabled === true}
        family={family}
        closesAt={closesAt}
        rating={rating}
        serviceCount={showMenu ? serviceTotal : 0}
        productCount={showMenu ? productTotal : 0}
        chips={landingChips(family, {
          dineIn: store?.dineIn ?? true,
          takeaway: store?.takeaway ?? true,
          delivery: store?.delivery ?? false
        })}
        highlights={menuItems}
        {...themeProps}
      />
    </div>
  );
}

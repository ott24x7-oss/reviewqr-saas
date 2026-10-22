import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { tapFontClass } from "@/components/brand/tap-font";
import { getBrand } from "@/lib/brand";
import { prisma } from "@/lib/db";
import { generateQrDataUrl } from "@/lib/qr";
import { getAiConfig, getTurnstileConfig } from "@/lib/settings";
import { recordQrScan } from "@/lib/scans";
import { remindExpiredOwner } from "@/lib/tap/expiry-notice";
import { tapText } from "@/lib/tap/i18n";
import { isLookupCode } from "@/lib/tap/ids";
import { presentBusiness, whatsAppNumberUrl, type PublicLink } from "@/lib/tap/links";
import { loadEntitlement } from "@/lib/plans/entitlements";
import { orderedReviewTargets } from "@/lib/review-policy";
import { loadPublicTap, type TapRecord } from "@/lib/tap/resolve";
import { scanSource } from "@/lib/tap/source";
import { readAdminThemes } from "@/lib/tap/theme-store";
import { resolveTheme, tokensToStyle } from "@/lib/tap/themes";
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
    return (
      <div className={`tap-page ${tapFontClass}`} style={themeProps.themeStyle} data-buttons={themeProps.buttons} data-testid="public-basic">
        <div className="tap-card">
          <h1>{view.name}</h1>
          {view.open === null ? null : <p className="tap-hours">{view.open ? "Open now" : "Closed now"}</p>}
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
  const menuItems = showMenu
    ? await prisma.menuItem.findMany({
        where: { businessId: record.businessId, available: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: 12,
        select: { id: true, name: true, pricePaise: true }
      })
    : [];

  const [turnstile, aiCfg] = await Promise.all([
    getTurnstileConfig().catch(() => ({ siteKey: "" })),
    getAiConfig().catch(() => ({ enabled: false, apiKey: "" }))
  ]);
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
        {...themeProps}
      />
      {menuItems.length ? (
        <section className="tap-page" data-testid="public-menu">
          <div className="tap-card">
            <h2>Menu</h2>
            <ul>
              {menuItems.map((item) => (
                <li key={item.id}>
                  {item.name} · ₹{Math.round(item.pricePaise / 100)}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

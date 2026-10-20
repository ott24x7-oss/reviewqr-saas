import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { tapFontClass } from "@/components/brand/tap-font";
import { getBrand } from "@/lib/brand";
import { generateQrDataUrl } from "@/lib/qr";
import { getTurnstileConfig } from "@/lib/settings";
import { recordQrScan } from "@/lib/scans";
import { remindExpiredOwner } from "@/lib/tap/expiry-notice";
import { tapText } from "@/lib/tap/i18n";
import { isLookupCode } from "@/lib/tap/ids";
import { presentBusiness, type PublicLink } from "@/lib/tap/links";
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
    const email = brand?.supportEmail || "hello@reviewqr.in";
    return (
      <StatusCard
        title={tapText("en", "unassignedTitle")}
        detail={`Ask ${email} or sign in to activate this code.`}
        action={{ href: "/login", label: "Sign in to activate" }}
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
    return (
      <div className={`tap-page ${tapFontClass}`} style={themeProps.themeStyle} data-buttons={themeProps.buttons}>
        <div className="tap-card">
          <h1>{view.name}</h1>
          <p className="tap-bio">This page is limited until the business renews.</p>
          <div className="tap-actions">
            {view.call ? (
              <a className="tap-primary" href={view.call}>
                Call
              </a>
            ) : null}
            {view.directions ? (
              <a className="tap-primary" href={view.directions} rel="noreferrer">
                Directions
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const turnstileSiteKey = (await getTurnstileConfig().catch(() => ({ siteKey: "" }))).siteKey || "";
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
        links={view.links}
        gallery={view.gallery}
        upiQr={upiQr}
        locationSlug={record.locationSlug}
        staffSlug={record.staffSlug}
        turnstileSiteKey={turnstileSiteKey}
        {...themeProps}
      />
    </div>
  );
}

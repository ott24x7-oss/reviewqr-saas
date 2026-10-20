import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { tapFontClass } from "@/components/brand/tap-font";
import { getBrand } from "@/lib/brand";
import { getTurnstileConfig } from "@/lib/settings";
import { recordQrScan } from "@/lib/scans";
import { remindExpiredOwner } from "@/lib/tap/expiry-notice";
import { tapText } from "@/lib/tap/i18n";
import { isLookupCode } from "@/lib/tap/ids";
import { presentBusiness } from "@/lib/tap/links";
import { loadPublicTap } from "@/lib/tap/resolve";
import { scanSource } from "@/lib/tap/source";
import { StatusCard } from "./status-card";
import { TapExperience } from "./tap-experience";

export async function PublicTap({
  code,
  channel,
  src,
  countScan
}: {
  code: string;
  channel: "q" | "t";
  src?: string;
  countScan: boolean;
}) {
  if (!isLookupCode(code)) notFound();
  const record = await loadPublicTap(code);
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
  if (record.status === "limited") {
    await remindExpiredOwner(record.ownerId, view.name).catch(() => {});
    return (
      <div className={`tap-page ${tapFontClass}`}>
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
        locationSlug={record.locationSlug}
        staffSlug={record.staffSlug}
        turnstileSiteKey={turnstileSiteKey}
      />
    </div>
  );
}

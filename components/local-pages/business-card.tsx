import Link from "next/link";
import { whatsAppNumberUrl } from "@/lib/tap/links";
import type { DirectoryBusiness, SeoLocale } from "@/lib/local-seo";

function safeImage(value: string | null) {
  if (!value || (value.startsWith("/") && value.startsWith("//")) || (!value.startsWith("/") && !/^https?:\/\//i.test(value))) return undefined;
  return `url("${value.replace(/["\\]/g, "\\$&")}")`;
}

export function BusinessCard({ business, locale }: { business: DirectoryBusiness; locale: SeoLocale }) {
  const hi = locale === "hi";
  const pageHref = `/${business.slug}`;
  const menuHref = `${pageHref}/store`;
  const cover = safeImage(business.coverImage || business.logo);
  const logo = safeImage(business.logo);
  const whatsapp = whatsAppNumberUrl(business.whatsappNumber);
  const location = [business.address, business.normalizedCity[locale], business.pincode].filter(Boolean).join(" · ");
  const hasRating = business.ratingAverage != null && business.reviewCount > 0;
  const ratingLabel = hasRating
    ? `${business.ratingAverage!.toFixed(1)} ${hi ? "में से 5" : "out of 5"}, ${business.reviewCount} ${hi ? "समीक्षाएँ" : business.reviewCount === 1 ? "review" : "reviews"}`
    : (hi ? "अभी कोई सार्वजनिक समीक्षा नहीं" : "No public reviews yet");
  const filledStars = hasRating ? Math.round(business.ratingAverage!) : 0;

  return (
    <article className="local-business-card">
      {cover ? <div className="local-business-cover" role="img" aria-label={business.name} style={{ backgroundImage: cover }} /> : <div className="local-business-cover local-business-cover-empty" aria-hidden="true" />}
      <div className="local-business-card-body">
        <div className="local-business-card-heading">
          {logo ? <span className="local-business-logo" role="img" aria-label={`${business.name} ${hi ? "लोगो" : "logo"}`} style={{ backgroundImage: logo }} /> : null}
          <h3><Link href={pageHref}>{business.name}</Link></h3>
        </div>
        {location ? <p className="local-business-location">{location}</p> : null}
        <div className="local-business-rating" aria-label={ratingLabel}>
          {hasRating ? <><span className="local-business-stars" aria-hidden="true">{"★".repeat(filledStars)}{"☆".repeat(5 - filledStars)}</span><strong>{business.ratingAverage!.toFixed(1)}</strong><span>·</span><span>{business.reviewCount} {hi ? "समीक्षाएँ" : business.reviewCount === 1 ? "review" : "reviews"}</span></> : <span>{ratingLabel}</span>}
        </div>
        <ul className="local-business-chips" aria-label={hi ? "श्रेणियाँ" : "Categories"}>
          <li>{business.category[locale]}</li>
          {business.industry.toLowerCase() !== business.category.en.toLowerCase() ? <li>{business.industry}</li> : null}
          <li>{business.normalizedCity[locale]}</li>
        </ul>
        <div className="local-business-actions">
          <Link className="qr-button qr-button-dark" href={pageHref}>{hi ? "पेज देखें" : "View page"}</Link>
          {whatsapp ? <Link className="qr-button qr-button-green" href={whatsapp} target="_blank" rel="noreferrer">{hi ? "WhatsApp पर ऑर्डर करें" : "Order on WhatsApp"}</Link> : <Link className="qr-button qr-button-light" href={business.storeEnabled ? menuHref : pageHref}>{hi ? "मेनू देखें" : "View menu"}</Link>}
        </div>
      </div>
    </article>
  );
}

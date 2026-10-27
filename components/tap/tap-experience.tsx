"use client";

import * as React from "react";
import { Check, ChevronRight, Copy, ShoppingBag, Star } from "lucide-react";
import { tapLang, tapText, type TapLang } from "@/lib/tap/i18n";
import { arrangeLanding, catalogueKey, heroPhotos, linkHiddenOnLanding, type LandingChipId, type LandingFamily } from "@/lib/tap/landing";
import { type PublicLink } from "@/lib/tap/links";
import { appendHint, showPublicReviewLinks, type PublicReviewTarget } from "@/lib/review-policy";
import { PolishDraft } from "@/components/review/polish-draft";
import { scanSource, type ScanSource } from "@/lib/tap/source";
import { LandingHero } from "./landing-hero";
import { TapIcon } from "./tap-icons";
import { HintChips } from "@/components/review/hint-chips";
import { NpsPicker } from "@/components/review/nps-picker";

const SOCIAL = new Set(["instagram", "facebook", "youtube", "website", "whatsapp_chat"]);

export type TapExperienceProps = {
  code: string;
  channel: "q" | "t";
  src: string;
  name: string;
  slug: string;
  logo: string | null;
  cover: string | null;
  bio: string;
  bioHi: string;
  open: boolean | null;
  links: PublicLink[];
  gallery: string[];
  upiQr?: Record<string, string>;
  locationSlug: string;
  staffSlug: string;
  turnstileSiteKey: string;
  reviewLinks?: PublicReviewTarget[];
  reviewGating?: boolean;
  ratingThreshold?: number;
  aiEnabled?: boolean;
  themeStyle?: Record<string, string>;
  buttons?: string;
  avatar?: string;
  entrance?: string;
  video?: string | null;
  family?: LandingFamily;
  closesAt?: string | null;
  rating?: { average: number; count: number } | null;
  serviceCount?: number;
  productCount?: number;
  chips?: LandingChipId[];
  highlights?: { id: string; name: string; pricePaise: number }[];
};

export function TapExperience(props: TapExperienceProps) {
  const source = scanSource(props.channel, props.src);
  const [lang, setLang] = React.useState<TapLang>("en");
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [motionOk, setMotionOk] = React.useState(false);
  const family = props.family || "shop";
  const arranged = arrangeLanding(family, props.links);
  const feedback = props.links.find((item) => item.type === "feedback" && !linkHiddenOnLanding(family, item));
  const offers = arranged.rest.filter((item) => item.type === "offer");
  const social = arranged.rest.filter((item) => SOCIAL.has(item.type));
  const rows = arranged.rest.filter((item) => item.type !== "offer" && !SOCIAL.has(item.type));
  const photos = heroPhotos(props.cover, props.gallery);

  React.useEffect(() => {
    const stored = window.localStorage.getItem("rq-lang");
    setLang(tapLang(navigator.language, stored));
    setMotionOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  React.useEffect(() => {
    if (!props.code) return;
    const body = JSON.stringify({ code: props.code, type: "view", source });
    if (body.length > 1024) return;
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/public/tap", blob);
    else {
      void fetch("/api/public/tap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true
      });
    }
  }, [props.code, source]);

  function choose(next: TapLang) {
    setLang(next);
    window.localStorage.setItem("rq-lang", next);
  }

  function track(linkKey: string) {
    const body = JSON.stringify({ code: props.code, type: "click", linkKey, source });
    if (body.length > 1024) return;
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/public/tap", blob);
  }

  const label = (item: PublicLink) => (lang === "hi" ? item.labelHi : item.labelEn);
  const bio = lang === "hi" && props.bioHi ? props.bioHi : props.bio;

  const initials = props.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
  const highlights = props.highlights || [];

  return (
    <div
      className="tap-page tap-landing"
      style={props.themeStyle}
      data-buttons={props.buttons}
      data-avatar={props.avatar}
      data-entrance={props.entrance}
      data-family={family}
      data-motion={motionOk ? "on" : "off"}
    >
      {props.video && motionOk ? <video className="tap-video" src={props.video} muted playsInline loop autoPlay /> : null}
      <div className="tap-stage">
        <LandingHero
          family={family}
          name={props.name}
          logo={props.logo}
          initials={initials}
          bio={bio}
          open={props.open}
          closesAt={props.closesAt || null}
          rating={props.rating || null}
          serviceCount={props.serviceCount || 0}
          productCount={props.productCount || 0}
          chips={props.chips || []}
          cover={props.cover}
          gallery={props.gallery}
          heroLinks={arranged.hero}
          lang={lang}
          onLang={choose}
          onTrack={track}
        />

        <div className="tap-landing-body">
        {offers.map((item) => (
          <div key={item.key} className="tap-offer">
            <TapIcon type="offer" className="tap-offer-icon" />
            <div>
              <strong>{label(item)}</strong>
              {item.detail ? <p>{item.detail}</p> : null}
            </div>
          </div>
        ))}

        {feedback || arranged.reviews.length > 0 ? (
          <section className="tap-landing-reviews" aria-label={tapText(lang, "reviewsHeading")}>
            <h2>{tapText(lang, "reviewsHeading")}</h2>
            {feedback ? (
              <button
                type="button"
                className="tap-row tap-feedback-open"
                aria-expanded={feedbackOpen}
                onClick={() => setFeedbackOpen((open) => !open)}
              >
                <span className="tap-row-icon">
                  <TapIcon type="feedback" />
                </span>
                <span className="tap-row-label">{label(feedback)}</span>
                <ChevronRight className="tap-row-chev" aria-hidden="true" />
              </button>
            ) : null}
            {feedbackOpen ? (
              <FeedbackForm
                lang={lang}
                code={props.code}
                source={source}
                slug={props.slug}
                locationSlug={props.locationSlug}
                staffSlug={props.staffSlug}
                turnstileSiteKey={props.turnstileSiteKey}
                reviewLinks={props.reviewLinks || []}
                reviewGating={props.reviewGating === true}
                ratingThreshold={props.ratingThreshold || 4}
                aiEnabled={props.aiEnabled === true}
              />
            ) : null}
            {arranged.reviews.length > 0 ? (
              <ul className="tap-secondary">
                {arranged.reviews.map((item) => (
                  <li key={item.key}>
                    <a className="tap-row" href={item.href || "#"} onClick={() => track(item.key)} rel="noreferrer">
                      <span className="tap-row-icon" data-type={item.type}>
                        <TapIcon type={item.type} />
                      </span>
                      <span className="tap-row-label">{label(item)}</span>
                      <ChevronRight className="tap-row-chev" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {rows.length > 0 ? (
          <ul className="tap-secondary">
            {rows.map((item) => {
              if (item.type === "wifi" || (item.type === "appointment" && !item.href)) {
                return (
                  <li key={item.key} className="tap-note">
                    <span className="tap-row-icon">
                      <TapIcon type={item.type} />
                    </span>
                    <div className="tap-note-body">
                      <strong>{label(item)}</strong>
                      {item.detail ? <p>{item.detail}</p> : null}
                    </div>
                    {item.type === "wifi" && item.detail ? <CopyButton text={item.detail} lang={lang} /> : null}
                  </li>
                );
              }
              if (item.type === "upi" && item.href) {
                return (
                  <li key={item.key} className="tap-upi">
                    <a className="tap-row" href={item.href} onClick={() => track(item.key)}>
                      <span className="tap-row-icon">
                        <TapIcon type="upi" />
                      </span>
                      <span className="tap-row-label">{label(item)}</span>
                      <ChevronRight className="tap-row-chev" aria-hidden="true" />
                    </a>
                    {props.upiQr?.[item.key] ? (
                      <details className="tap-upi-qr">
                        <summary>{lang === "hi" ? "दूसरे फ़ोन से स्कैन करें" : "Scan from another phone"}</summary>
                        <img src={props.upiQr[item.key]} alt="UPI QR" width={180} height={180} />
                      </details>
                    ) : null}
                  </li>
                );
              }
              return (
                <li key={item.key}>
                  <a className="tap-row" href={item.href || "#"} onClick={() => track(item.key)} rel="noreferrer">
                    <span className="tap-row-icon" data-type={item.type}>
                      {family === "shop" && item.type === "menu" ? <ShoppingBag aria-hidden="true" /> : <TapIcon type={item.type} />}
                    </span>
                    <span className="tap-row-label">{label(item)}</span>
                    <ChevronRight className="tap-row-chev" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}

        {social.some((item) => item.type === "youtube" && item.thumb) ? (
          <div className="tap-youtube">
            {social
              .filter((item) => item.type === "youtube" && item.thumb && item.href)
              .map((item) => (
                <a key={item.key} href={item.href || "#"} onClick={() => track(item.key)} rel="noreferrer">
                  <img src={item.thumb || ""} alt="" loading="lazy" />
                  <span>
                    <TapIcon type="youtube" /> {label(item)}
                  </span>
                </a>
              ))}
          </div>
        ) : null}

        {photos.length === 0 && props.gallery.length > 0 ? (
          <div className="tap-gallery">
            {props.gallery.map((src) => (
              <img key={src} src={src} alt="" loading="lazy" />
            ))}
          </div>
        ) : null}

        {social.some((item) => item.type !== "youtube") ? (
          <div className="tap-social">
            {social
              .filter((item) => item.type !== "youtube")
              .map((item) => (
                <a
                  key={item.key}
                  href={item.href || "#"}
                  onClick={() => track(item.key)}
                  rel="noreferrer"
                  aria-label={label(item)}
                  title={label(item)}
                >
                  <TapIcon type={item.type} />
                </a>
              ))}
          </div>
        ) : null}

        {highlights.length > 0 ? (
          <section className="tap-landing-menu" data-testid="public-menu">
            <h2>{tapText(lang, catalogueKey(family))}</h2>
            <ul>
              {highlights.map((item) => (
                <li key={item.id}>
                  {item.name} · ₹{Math.round(item.pricePaise / 100)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="tap-footer">
          Powered by <a href="/">QR24x7</a>
        </p>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text, lang }: { text: string; lang: TapLang }) {
  const [copied, setCopied] = React.useState(false);
  const password = /password\s*[:\-·]?\s*(\S+)/i.exec(text)?.[1] || text;
  return (
    <button
      type="button"
      className="tap-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(password);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? (lang === "hi" ? "कॉपी हुआ" : "Copied") : lang === "hi" ? "कॉपी" : "Copy"}
    </button>
  );
}

function FeedbackForm({
  lang,
  code,
  source,
  slug,
  locationSlug,
  staffSlug,
  turnstileSiteKey,
  reviewLinks,
  reviewGating,
  ratingThreshold,
  aiEnabled
}: {
  lang: TapLang;
  code: string;
  source: ScanSource;
  slug: string;
  locationSlug: string;
  staffSlug: string;
  turnstileSiteKey: string;
  reviewLinks: PublicReviewTarget[];
  reviewGating: boolean;
  ratingThreshold: number;
  aiEnabled: boolean;
}) {
  const [rating, setRating] = React.useState(0);
  const [message, setMessage] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [npsScore, setNpsScore] = React.useState<number | null>(null);
  const [token, setToken] = React.useState("");
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!rating) {
      setError(lang === "hi" ? "कृपया स्टार चुनें" : "Choose a star rating");
      return;
    }
    if (phone.trim() && !consent) {
      setError(lang === "hi" ? "फोन सेव करने के लिए सहमति दें, या फोन खाली छोड़ें" : "Tick the box to save your phone number, or leave the phone blank");
      return;
    }
    if (turnstileSiteKey && !token) {
      setError(lang === "hi" ? "कृपया जाँच पूरी करें" : "Complete the check below");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/public/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessSlug: slug,
          rating,
          feedback: message,
          customerName: name,
          customerPhone: phone,
          consent: phone.trim() ? consent : false,
          npsScore,
          source,
          qrCode: code,
          locationSlug,
          staffSlug,
          turnstileToken: token
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not send feedback");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="tap-thanks">Thank you for your feedback</p>;

  return (
    <form className="tap-feedback" onSubmit={submit}>
      <div className="tap-stars" role="group" aria-label={tapText(lang, "giveFeedback")}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={n === 1 ? "1 star" : `${n} stars`}
            aria-pressed={rating === n}
            onClick={() => setRating(n)}
          >
            <Star aria-hidden="true" data-on={n <= rating ? "true" : "false"} />
          </button>
        ))}
      </div>
      {showPublicReviewLinks({
        reviewGating,
        rating,
        ratingThreshold,
        hasPublicUrl: reviewLinks.length > 0
      }) ? (
        <div className="tap-choice">
          <p className="tap-choice-title">{tapText(lang, "publicReview")}</p>
          {reviewLinks.map((item) => (
            <a
              key={item.href}
              className="tap-primary"
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (!rating) return;
                void fetch("/api/public/reviews", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    businessSlug: slug,
                    rating,
                    feedback: "",
                    source,
                    qrCode: code,
                    locationSlug,
                    staffSlug,
                    turnstileToken: token,
                    openedPublicReview: true
                  })
                }).catch(() => {});
              }}
            >
              {lang === "hi" ? item.labelHi : item.labelEn}
            </a>
          ))}
        </div>
      ) : null}
      <div className="tap-choice">
      <p className="tap-choice-title">{tapText(lang, "privateReview")}</p>
      <HintChips slug={slug} lang={lang} onInsert={(text) => setMessage((current) => appendHint(current, text))} />
      <label htmlFor="tap-feedback">What could we have done better?</label>
      <textarea id="tap-feedback" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
      {aiEnabled ? <PolishDraft slug={slug} text={message} lang={lang} /> : null}
      <NpsPicker value={npsScore} onChange={setNpsScore} lang={lang} />
      <label htmlFor="tap-name">{lang === "hi" ? "नाम" : "Your name"}</label>
      <input id="tap-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
      <label htmlFor="tap-phone">{lang === "hi" ? "फोन" : "Phone"}</label>
      <input id="tap-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} inputMode="tel" autoComplete="tel" />
      <p className="tap-privacy">
        {tapText(lang, "privacyFeedback")} <a href="/privacy">{tapText(lang, "privacyLink")}</a>
      </p>
      <label className="tap-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        {tapText(lang, "consent")}
      </label>
      {turnstileSiteKey ? <Turnstile siteKey={turnstileSiteKey} onToken={setToken} /> : null}
      {error ? <p className="tap-error">{error}</p> : null}
      <button type="submit" className="tap-primary" disabled={busy}>
        {busy ? "…" : "Send feedback"}
      </button>
      </div>
    </form>
  );
}

function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const onTokenRef = React.useRef(onToken);
  onTokenRef.current = onToken;

  React.useEffect(() => {
    const scriptId = "cf-turnstile-api";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      document.head.appendChild(script);
    }
    let widget = "";
    let cancelled = false;
    const timer = window.setInterval(() => {
      const ts = (window as unknown as { turnstile?: { render: (el: HTMLElement, opts: object) => string; remove: (id: string) => void } }).turnstile;
      if (!ts || !ref.current || cancelled) return;
      window.clearInterval(timer);
      widget = ts.render(ref.current, {
        sitekey: siteKey,
        callback: (token: string) => onTokenRef.current(token)
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      const ts = (window as unknown as { turnstile?: { remove: (id: string) => void } }).turnstile;
      if (widget && ts) ts.remove(widget);
    };
  }, [siteKey]);

  return <div ref={ref} />;
}

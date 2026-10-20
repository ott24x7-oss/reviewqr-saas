"use client";

import * as React from "react";
import { tapLang, tapText, type TapLang } from "@/lib/tap/i18n";
import { splitLinks, type PublicLink } from "@/lib/tap/links";
import { scanSource, type ScanSource } from "@/lib/tap/source";

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
  themeStyle?: Record<string, string>;
  buttons?: string;
  avatar?: string;
  entrance?: string;
  video?: string | null;
};

export function TapExperience(props: TapExperienceProps) {
  const source = scanSource(props.channel, props.src);
  const [lang, setLang] = React.useState<TapLang>("en");
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [motionOk, setMotionOk] = React.useState(false);
  const groups = splitLinks(props.links);

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

  return (
    <div
      className="tap-page"
      style={props.themeStyle}
      data-buttons={props.buttons}
      data-avatar={props.avatar}
      data-entrance={props.entrance}
    >
      {props.video && motionOk ? <video className="tap-video" src={props.video} muted playsInline loop autoPlay /> : null}
      <div className="tap-card">
        {props.cover ? <img className="tap-cover" src={props.cover} alt="" /> : null}
        <div className="tap-lang">
          <button type="button" aria-pressed={lang === "en"} onClick={() => choose("en")}>
            {tapText("en", "english")}
          </button>
          <button type="button" aria-pressed={lang === "hi"} onClick={() => choose("hi")}>
            {tapText("hi", "hindi")}
          </button>
        </div>
        <div className="tap-id">
          {props.logo ? <img className="tap-logo" src={props.logo} alt="" /> : null}
          <div>
            <h1>{props.name}</h1>
            {props.open === null ? null : (
              <p className="tap-hours">{tapText(lang, props.open ? "openNow" : "closedNow")}</p>
            )}
          </div>
        </div>

        <div className="tap-actions">
          {groups.primary.map((item) =>
            item.type === "feedback" ? (
              <button key={item.key} type="button" className="tap-primary" data-featured={item.featured ? "true" : "false"} onClick={() => setFeedbackOpen(true)}>
                {label(item)}
              </button>
            ) : (
              <a key={item.key} className="tap-primary" data-featured={item.featured ? "true" : "false"} href={item.href || "#"} onClick={() => track(item.key)}>
                {label(item)}
              </a>
            )
          )}
        </div>

        {feedbackOpen ? (
          <FeedbackForm
            lang={lang}
            code={props.code}
            source={source}
            slug={props.slug}
            locationSlug={props.locationSlug}
            staffSlug={props.staffSlug}
            turnstileSiteKey={props.turnstileSiteKey}
          />
        ) : null}

        {groups.secondary.length > 0 ? (
          <ul className="tap-secondary">
            {groups.secondary.map((item) => {
              if (item.type === "wifi" || item.type === "offer" || (item.type === "appointment" && !item.href)) {
                return (
                  <li key={item.key} className={item.type === "offer" ? "tap-offer" : "tap-note"}>
                    <strong>{label(item)}</strong>
                    {item.detail ? <p>{item.detail}</p> : null}
                  </li>
                );
              }
              if (item.type === "upi" && item.href) {
                return (
                  <li key={item.key} className="tap-upi">
                    <a href={item.href} onClick={() => track(item.key)}>
                      {label(item)}
                    </a>
                    {props.upiQr?.[item.key] ? <img src={props.upiQr[item.key]} alt="UPI QR" /> : null}
                  </li>
                );
              }
              return (
                <li key={item.key}>
                  <a href={item.href || "#"} onClick={() => track(item.key)} rel="noreferrer">
                    {label(item)}
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}

        {groups.social.some((item) => item.type === "youtube" && item.thumb) ? (
          <div className="tap-youtube">
            {groups.social
              .filter((item) => item.type === "youtube" && item.thumb && item.href)
              .map((item) => (
                <a key={item.key} href={item.href || "#"} onClick={() => track(item.key)} rel="noreferrer">
                  <img src={item.thumb || ""} alt={label(item)} />
                  <span>{label(item)}</span>
                </a>
              ))}
          </div>
        ) : null}

        {groups.social.some((item) => item.type !== "youtube") ? (
          <div className="tap-social">
            {groups.social
              .filter((item) => item.type !== "youtube")
              .map((item) => (
                <a key={item.key} href={item.href || "#"} onClick={() => track(item.key)} rel="noreferrer">
                  {label(item)}
                </a>
              ))}
          </div>
        ) : null}

        {bio ? <p className="tap-bio">{bio}</p> : null}

        {props.gallery.length > 0 ? (
          <div className="tap-gallery">
            {props.gallery.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FeedbackForm({
  lang,
  code,
  source,
  slug,
  locationSlug,
  staffSlug,
  turnstileSiteKey
}: {
  lang: TapLang;
  code: string;
  source: ScanSource;
  slug: string;
  locationSlug: string;
  staffSlug: string;
  turnstileSiteKey: string;
}) {
  const [rating, setRating] = React.useState(0);
  const [message, setMessage] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [consent, setConsent] = React.useState(false);
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
            {n}
          </button>
        ))}
      </div>
      <label htmlFor="tap-feedback">What could we have done better?</label>
      <textarea id="tap-feedback" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
      <label htmlFor="tap-name">{lang === "hi" ? "नाम" : "Your name"}</label>
      <input id="tap-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
      <label htmlFor="tap-phone">{lang === "hi" ? "फोन" : "Phone"}</label>
      <input id="tap-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} inputMode="tel" autoComplete="tel" />
      <p className="tap-privacy">
        {tapText(lang, "privacyFeedback")} <a href="/privacy">Privacy</a>
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

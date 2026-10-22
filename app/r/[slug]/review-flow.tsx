"use client";
import * as React from "react";
import {
  Star,
  MapPin,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Heart,
  ExternalLink,
  Phone,
  MessageCircle,
  Globe,
  Share2,
  Navigation,
  BadgeCheck,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { appendHint, orderedReviewTargets } from "@/lib/review-policy";
import { HintChips } from "@/components/review/hint-chips";
import { NpsPicker } from "@/components/review/nps-picker";
import { PolishDraft } from "@/components/review/polish-draft";

type Business = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  coverImage?: string | null;
  description?: string | null;
  industry?: string | null;
  primaryColor: string;
  googleReviewUrl?: string | null;
  trustpilotUrl?: string | null;
  reviewPlatform?: "google" | "trustpilot";
  reviewGating?: boolean;
  ratingThreshold: number;
  customThankYou?: string | null;
  whatsappNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

type PublicReview = {
  id: string;
  author: string;
  authorRole: string | null;
  authorImage: string | null;
  rating: number;
  message: string;
  createdAt: string;
};

type Stats = { avgRating: number; count: number };

type Props = {
  business: Business;
  location: { id: string; name: string; slug: string } | null;
  staff: { id: string; name: string; slug: string; photo?: string | null } | null;
  qrCode: string | null;
  stats: Stats;
  reviews: PublicReview[];
  brand?: { name: string; appUrl: string };
  aiEnabled?: boolean;
  turnstileSiteKey?: string | null;
};

const TAGS = [
  { id: "service", label: "Service" },
  { id: "quality", label: "Quality" },
  { id: "price", label: "Value" },
  { id: "staff", label: "Staff" },
  { id: "ambience", label: "Ambience" },
  { id: "speed", label: "Speed" },
  { id: "cleanliness", label: "Cleanliness" }
];

type Step = "rate" | "feedback" | "thank-you-google" | "thank-you-private";
type Tab = "reviews" | "info";

/**
 * Returns true if the page is rendered inside an iframe. Wrapped in
 * try/catch because cross-origin embeds can throw on `window.top` access.
 */
function isInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

/**
 * When we're inside an iframe, browsers block `window.location.href = ...`
 * if the destination has X-Frame-Options (Google's review page does), and
 * an async fetch in between can also strip the user-gesture context that
 * `window.open` needs to bypass popup blockers. So we synchronously
 * reserve a blank tab the moment the user clicks, then navigate that
 * tab once the fetch + clipboard work finishes.
 *
 * Returns null when we're not in an iframe — same-tab navigation works
 * fine in that case.
 */
function reserveExternalTab(): Window | null {
  if (typeof window === "undefined") return null;
  if (!isInIframe()) return null;
  try {
    return window.open("about:blank", "_blank");
  } catch {
    return null;
  }
}

// Only ever navigate to http(s) targets. Blocks javascript:/data: and other
// schemes even if a stale/malicious URL slipped into the DB before validation.
function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function navigateExternal(url: string, reserved?: Window | null) {
  if (typeof window === "undefined") return;
  if (!isSafeHttpUrl(url)) return;
  if (reserved && !reserved.closed) {
    try {
      reserved.location.href = url;
      return;
    } catch {
      // fall through
    }
  }
  if (isInIframe()) {
    const win = window.open(url, "_blank");
    if (win) return;
    // Popup blocker swallowed it. Try breaking out via window.top
    // (works if same-origin), otherwise navigate the iframe itself.
    try {
      if (window.top) {
        window.top.location.href = url;
        return;
      }
    } catch {}
    window.location.href = url;
    return;
  }
  window.location.href = url;
}

function timeAgoShort(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function fullAddress(b: Business) {
  return [b.address, b.city, b.state, b.pincode].filter(Boolean).join(", ");
}

type TurnstileHandle = { reset: () => void };

const TurnstileField = React.forwardRef<
  TurnstileHandle,
  { siteKey: string; onToken: (token: string) => void }
>(function TurnstileField({ siteKey, onToken }, ref) {
  const holder = React.useRef<HTMLDivElement>(null);
  const widgetId = React.useRef<string | null>(null);
  const onTokenRef = React.useRef(onToken);
  onTokenRef.current = onToken;

  React.useImperativeHandle(ref, () => ({
    reset() {
      onTokenRef.current("");
      const ts = (window as unknown as { turnstile?: { reset: (id: string) => void } }).turnstile;
      if (ts && widgetId.current) ts.reset(widgetId.current);
    }
  }));

  React.useEffect(() => {
    let dead = false;
    const src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    function render() {
      const ts = (
        window as unknown as {
          turnstile?: {
            render: (el: HTMLElement, opts: Record<string, unknown>) => string;
          };
        }
      ).turnstile;
      if (dead || !holder.current || !ts || widgetId.current) return;
      widgetId.current = ts.render(holder.current, {
        sitekey: siteKey,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current("")
      });
    }
    if ((window as unknown as { turnstile?: unknown }).turnstile) {
      render();
      return () => {
        dead = true;
      };
    }
    let script = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    return () => {
      dead = true;
      script?.removeEventListener("load", render);
    };
  }, [siteKey]);

  return <div ref={holder} className="my-2 flex justify-center" />;
});

export function ReviewFlow(props: Props) {
  const [step, setStep] = React.useState<Step>("rate");
  const [tab, setTab] = React.useState<Tab>("reviews");
  const [rating, setRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [feedback, setFeedback] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [npsScore, setNpsScore] = React.useState<number | null>(null);
  const [consent, setConsent] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState("");
  const turnstileRef = React.useRef<TurnstileHandle>(null);
  const [loading, setLoading] = React.useState(false);
  const [lang, setLang] = React.useState<"en" | "hi">("en");
  // Holds the id of a Review row already captured for this visitor (e.g. the
  // bare low-rating tap). Used to avoid firing the on-tap capture twice.
  const submittedRef = React.useRef<string | null>(null);

  const { business } = props;
  const accent = business.primaryColor || "#1a73e8";
  const reviewTargets = orderedReviewTargets(business);
  const copy = lang === "hi"
    ? { publicTitle: "सार्वजनिक रिव्यू लिखें", privateTitle: "मालिक को निजी में बताएं" }
    : { publicTitle: "Leave a public review", privateTitle: "Tell the owner privately" };

  React.useEffect(() => {
    const stored = window.localStorage.getItem("rq-lang");
    if (stored === "hi" || stored === "en") setLang(stored);
  }, []);

  function chooseLang(next: "en" | "hi") {
    setLang(next);
    window.localStorage.setItem("rq-lang", next);
  }

  function pickRating(n: number) {
    if (props.turnstileSiteKey && !turnstileToken) {
      toast.error("Complete the security check, then tap a star");
      return;
    }
    setRating(n);
    if (business.reviewGating !== true) return;
    if (n >= business.ratingThreshold && reviewTargets.length > 0) {
      // Opt-in gating only: high ratings still leave for the public platform.
      setTimeout(() => onHighRating(n), 250);
    } else {
      // Low rating: capture it immediately (fire-and-forget) so it isn't lost
      // if the customer abandons before submitting written feedback. The later
      // feedback submit reuses this same Review row server-side (matched by
      // fingerprint + rating), so no duplicate Review is created.
      if (!submittedRef.current) {
        submitReview({ rating: n, feedback: "", openedPublicReview: false })
          .then((res) => {
            if (res?.reviewId) submittedRef.current = res.reviewId;
          })
          .catch(() => {});
      }
      setTimeout(() => setStep("feedback"), 250);
    }
  }

  async function onHighRating(stars: number) {
    const reserved = reserveExternalTab();
    goToGoogleReview(stars, reserved);
  }

  async function goToGoogleReview(stars: number, reserved?: Window | null) {
    const tab = reserved ?? reserveExternalTab();
    setLoading(true);
    try {
      await submitReview({ rating: stars, feedback: "", openedPublicReview: true });
    } catch {}
    const href = reviewTargets[0]?.href;
    if (href) {
      navigateExternal(href, tab);
    } else {
      tab?.close();
      setStep("thank-you-google");
    }
  }


  async function submitReview(opts: {
    rating: number;
    feedback: string;
    openedPublicReview: boolean;
    preserveToken?: boolean;
  }) {
    if (props.turnstileSiteKey && !turnstileToken) {
      if (opts.preserveToken) return { ok: false as const };
      throw new Error("Complete the security check, then try again");
    }
    const res = await fetch("/api/public/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        businessSlug: business.slug,
        rating: opts.rating,
        feedback: opts.feedback,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        consent,
        npsScore,
        tags,
        source: props.qrCode ? "qr" : "link",
        locationSlug: props.location?.slug,
        staffSlug: props.staff?.slug,
        qrCode: props.qrCode,
        turnstileToken: turnstileToken || undefined,
        openedPublicReview: opts.openedPublicReview
      })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Failed to submit");
    if (!opts.preserveToken) {
      setTurnstileToken("");
      turnstileRef.current?.reset();
    }
    return json;
  }

  async function onSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback || feedback.trim().length < 5) {
      toast.error("Please share a few words about your experience");
      return;
    }
    setLoading(true);
    try {
      await submitReview({ rating, feedback, openedPublicReview: false });
      setStep("thank-you-private");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function share() {
    const data = { title: business.name, url: typeof window !== "undefined" ? window.location.href : "" };
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      (navigator as any).share(data).catch(() => {});
    } else {
      navigator.clipboard.writeText(data.url).then(() => toast.success("Link copied"));
    }
  }

  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    business.name + " " + fullAddress(business)
  )}`;
  const waUrl = business.whatsappNumber
    ? `https://wa.me/${business.whatsappNumber.replace(/\D/g, "")}`
    : null;
  const callUrl = business.phone ? `tel:${business.phone.replace(/\s/g, "")}` : null;

  // mid-step screens (post-rating). We hide the tab UI on these.
  const inSubFlow =
    step === "feedback" ||
    step === "thank-you-google" ||
    step === "thank-you-private";

  return (
    <div className="rv relative min-h-dvh flex flex-col" style={{ "--accent": accent } as any}>
      {/* Boxed profile card, centered on the grid background */}
      <div className="mx-auto w-full max-w-2xl flex-1 sm:px-4 sm:py-8">
        <div className="overflow-hidden bg-white sm:rounded-[2rem] sm:border sm:border-black/5 dark:sm:border-white/10 sm:shadow-2xl">
      {/* HERO */}
      <div className="relative">
        <div
          className="h-32 sm:h-44 w-full overflow-hidden"
          style={{
            background: business.coverImage
              ? `url("${business.coverImage}") center / cover`
              : `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`
          }}
        >
          {!business.coverImage && (
            <div
              className="h-full w-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.12) 0%, transparent 50%)"
              }}
            />
          )}
        </div>

        {inSubFlow && (
          <button
            type="button"
            onClick={() => {
              setStep("rate");
              setTab("reviews");
            }}
            className="absolute top-3 left-3 inline-flex items-center gap-1 h-10 px-3.5 rounded-full bg-black/40 text-white text-xs backdrop-blur-sm hover:bg-black/60 transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}

        <button
          type="button"
          onClick={share}
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-black/40 text-white text-xs backdrop-blur-sm hover:bg-black/60 transition"
        >
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>

        {/* Logo overlapping the cover */}
        <div className="container max-w-2xl px-4">
          <div className="-mt-12 sm:-mt-14 flex items-end gap-3">
            {business.logo ? (
              <img
                src={business.logo}
                alt={business.name}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover ring-4 ring-white shadow-lg bg-white"
              />
            ) : (
              <div
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-full ring-4 ring-white shadow-lg flex items-center justify-center text-white font-bold text-3xl sm:text-4xl"
                style={{ background: accent }}
              >
                {business.name[0]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Identity row */}
      <div className="container max-w-2xl px-4 mt-3 sm:mt-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight tracking-tight">
                {business.name}
              </h1>
              <BadgeCheck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" aria-label="Verified" />
            </div>
            {business.industry && (
              <p className="text-sm rv-muted mt-0.5">{business.industry}</p>
            )}
          </div>
        </div>

        {/* Rating row */}
        <div className="flex items-center gap-3 mt-2.5 text-sm">
          <span className="font-semibold text-base">
            {props.stats.avgRating > 0 ? props.stats.avgRating.toFixed(1) : "New"}
          </span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  "h-4 w-4",
                  n <= Math.round(props.stats.avgRating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-transparent rv-sub"
                )}
              />
            ))}
          </div>
          <span className="rv-muted">
            {props.stats.count > 0
              ? `${props.stats.count} review${props.stats.count === 1 ? "" : "s"}`
              : "Be the first to review"}
          </span>
        </div>

        {(business.address || business.city) && (
          <p className="mt-2 text-xs rv-muted flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="truncate">
              {props.location?.name && (
                <span className="font-medium rv-body">{props.location.name} · </span>
              )}
              {fullAddress(business) || business.city}
            </span>
          </p>
        )}
      </div>

      {/* PRIMARY CTA — star rating, always at top on the rate step */}
      {step === "rate" && (
        <RateStep
          business={business}
          staff={props.staff}
          rating={rating}
          hoverRating={hoverRating}
          setHoverRating={setHoverRating}
          pickRating={pickRating}
          loading={loading}
        />
      )}

      {step === "rate" && rating > 0 && business.reviewGating !== true && (
        <>
          <div className="container max-w-2xl px-4 pt-4">
            <div className="mb-3 flex justify-end gap-2" role="group" aria-label="Language">
              <button
                type="button"
                className="min-h-11 rounded-full border px-3 text-sm font-semibold"
                aria-pressed={lang === "en"}
                onClick={() => chooseLang("en")}
              >
                EN
              </button>
              <button
                type="button"
                className="min-h-11 rounded-full border px-3 text-sm font-semibold"
                aria-pressed={lang === "hi"}
                lang="hi"
                onClick={() => chooseLang("hi")}
              >
                हिं
              </button>
            </div>
            {reviewTargets.length > 0 && (
              <div className="rounded-3xl neu p-5 sm:p-6">
                <h2 className="text-center text-lg font-semibold">{copy.publicTitle}</h2>
                <div className="mt-4 grid gap-2">
                  {reviewTargets.map((item) => (
                    <Button key={item.href} asChild variant="skeuo" size="lg" className="min-h-11 w-full">
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          void submitReview({
                            rating,
                            feedback: "",
                            openedPublicReview: true,
                            preserveToken: true
                          }).catch(() => {});
                        }}
                      >
                        {lang === "hi" ? item.labelHi : item.labelEn}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <FeedbackStep
            business={business}
            rating={rating}
            feedback={feedback}
            setFeedback={setFeedback}
            name={name}
            setName={setName}
            phone={phone}
            setPhone={setPhone}
            email={email}
            setEmail={setEmail}
            tags={tags}
            toggleTag={toggleTag}
            npsScore={npsScore}
            setNpsScore={setNpsScore}
            onSubmit={onSubmitFeedback}
            loading={loading}
            consent={consent}
            setConsent={setConsent}
            panel
            title={copy.privateTitle}
            lang={lang}
            aiEnabled={props.aiEnabled === true}
          />
        </>
      )}

      {/* Action chips (secondary) */}
      {!inSubFlow && (
        <div className="container max-w-2xl px-4 mt-4">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            <ActionChip
              icon={<Navigation className="h-4 w-4" />}
              label="Directions"
              href={directionsUrl}
              accent={accent}
            />
            {callUrl && (
              <ActionChip
                icon={<Phone className="h-4 w-4" />}
                label="Call"
                href={callUrl}
                accent={accent}
              />
            )}
            {waUrl && (
              <ActionChip
                icon={<MessageCircle className="h-4 w-4" />}
                label="Chat"
                href={waUrl}
                accent={accent}
              />
            )}
            {business.website && (
              <ActionChip
                icon={<Globe className="h-4 w-4" />}
                label="Website"
                href={business.website}
                accent={accent}
              />
            )}
            <ActionChip
              icon={<Share2 className="h-4 w-4" />}
              label="Share"
              onClick={share}
              accent={accent}
            />
          </div>
        </div>
      )}

      {/* Tabs (Reviews / Info — for browsing) */}
      {!inSubFlow && (
        <div className="container max-w-2xl px-4 mt-5">
          <div className="border-b border-slate-200 flex gap-6">
            {(
              [
                {
                  id: "reviews",
                  label: `Reviews${props.reviews.length ? ` · ${props.reviews.length}` : ""}`
                },
                { id: "info", label: "Info" }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  tab === t.id
                    ? "border-current rv-ink"
                    : "border-transparent rv-muted hover:rv-body"
                )}
                style={tab === t.id ? { borderColor: accent, color: accent } : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="flex-1">
        {(step === "rate" || step === "feedback") && props.turnstileSiteKey ? (
          <div className="container max-w-2xl px-4 pt-4">
            <TurnstileField
              ref={turnstileRef}
              siteKey={props.turnstileSiteKey}
              onToken={setTurnstileToken}
            />
          </div>
        ) : null}
        {step === "rate" && tab === "reviews" && <ReviewsTab reviews={props.reviews} />}
        {step === "rate" && tab === "info" && <InfoTab business={business} />}

        {step === "feedback" && (
          <FeedbackStep
            business={business}
            rating={rating}
            feedback={feedback}
            setFeedback={setFeedback}
            name={name}
            setName={setName}
            phone={phone}
            setPhone={setPhone}
            email={email}
            setEmail={setEmail}
            tags={tags}
            toggleTag={toggleTag}
            npsScore={npsScore}
            setNpsScore={setNpsScore}
            onSubmit={onSubmitFeedback}
            loading={loading}
            consent={consent}
            setConsent={setConsent}
            lang={lang}
            aiEnabled={props.aiEnabled === true}
          />
        )}
        {step === "thank-you-google" && <ThankYouGoogle business={business} />}
        {step === "thank-you-private" && (
          <ThankYouPrivate business={business} customerName={name} />
        )}
      </main>
        </div>
      </div>

      <footer className="py-6 text-center text-xs rv-sub">
        <a
          href={props.brand?.appUrl || process.env.NEXT_PUBLIC_APP_URL || "/"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:rv-body"
        >
          Powered by <b className="rv-body">{props.brand?.name || "QR24x7"}</b>
        </a>
      </footer>

    </div>
  );
}


function ActionChip({
  icon,
  label,
  href,
  onClick,
  accent
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  accent: string;
}) {
  const cls =
    "flex flex-col items-center gap-1 py-2 px-1 rounded-2xl skeuo transition";
  const inner = (
    <>
      <span
        className="h-9 w-9 rounded-full flex items-center justify-center"
        style={{ background: `${accent}14`, color: accent }}
      >
        {icon}
      </span>
      <span className="text-[11px] font-medium rv-body">{label}</span>
    </>
  );
  if (href)
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className={cls}
      >
        {inner}
      </a>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function RateStep({
  business,
  staff,
  rating,
  hoverRating,
  setHoverRating,
  pickRating,
  loading
}: {
  business: Business;
  staff: Props["staff"];
  rating: number;
  hoverRating: number;
  setHoverRating: (n: number) => void;
  pickRating: (n: number) => void;
  loading: boolean;
}) {
  const display = hoverRating || rating;
  const labels = ["", "Awful", "Poor", "Okay", "Great", "Amazing"];
  const platformLabel = business.reviewPlatform === "trustpilot" ? "Trustpilot" : "Google";

  return (
    <div className="container max-w-2xl px-4 py-6 sm:py-8">
      <div className="rounded-3xl neu p-5 sm:p-7">
        {staff && (
          <div className="mb-5 flex items-center gap-3 px-3 py-2.5 rounded-xl neu-inset">
            {staff.photo ? (
              <img
                src={staff.photo}
                className="h-10 w-10 rounded-full object-cover"
                alt={staff.name}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold rv-body">
                {staff.name[0]}
              </div>
            )}
            <div className="text-sm">
              <div className="rv-muted text-xs">You were served by</div>
              <div className="font-semibold">{staff.name}</div>
            </div>
          </div>
        )}

        <h2 className="text-xl sm:text-2xl font-bold text-center tracking-tight">
          How was your experience?
        </h2>
        <p className="mt-1.5 text-sm rv-muted text-center">Tap a star to rate · 30 seconds</p>

        <div
          className="mt-6 flex justify-center gap-1.5"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={loading}
              onClick={() => pickRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              className="p-1 disabled:opacity-50 transition-transform active:scale-90"
              aria-label={`${n} stars`}
            >
              <Star
                className={cn(
                  "h-11 w-11 sm:h-13 sm:w-13 transition-colors",
                  display >= n
                    ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                    : "fill-transparent rv-sub"
                )}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>

        <div className="mt-5 h-7 text-center">
          {display > 0 && (
            <span
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-semibold",
                display >= 4
                  ? "bg-emerald-100 text-emerald-800"
                  : display === 3
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              )}
            >
              {labels[display]}
            </span>
          )}
        </div>

        {loading && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm rv-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Taking you to {platformLabel}…
          </div>
        )}
      </div>
    </div>
  );
}


function ReviewsTab({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) {
    return (
      <div className="container max-w-2xl px-4 py-10 text-center text-sm rv-muted">
        No reviews yet — be the first to share your experience.
      </div>
    );
  }
  return (
    <div className="container max-w-2xl px-4 py-5 space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-2xl neu p-4 sm:p-5">
          <div className="flex items-start gap-3">
            {r.authorImage ? (
              <img
                src={r.authorImage}
                alt={r.author}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold rv-body">
                {r.author[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm truncate">{r.author}</div>
                <div className="text-xs rv-sub shrink-0">{timeAgoShort(r.createdAt)}</div>
              </div>
              {r.authorRole && <div className="text-xs rv-muted">{r.authorRole}</div>}
              <div className="flex mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      "h-3.5 w-3.5",
                      n <= r.rating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-transparent rv-sub"
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm rv-body leading-relaxed whitespace-pre-line">
                {r.message}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoTab({ business }: { business: Business }) {
  const rows = [
    business.address && {
      icon: <MapPin className="h-4 w-4" />,
      label: "Address",
      value: [business.address, business.city, business.state, business.pincode]
        .filter(Boolean)
        .join(", ")
    },
    business.phone && {
      icon: <Phone className="h-4 w-4" />,
      label: "Phone",
      value: business.phone,
      href: `tel:${business.phone.replace(/\s/g, "")}`
    },
    business.whatsappNumber && {
      icon: <MessageCircle className="h-4 w-4" />,
      label: "WhatsApp",
      value: business.whatsappNumber,
      href: `https://wa.me/${business.whatsappNumber.replace(/\D/g, "")}`
    },
    business.website && {
      icon: <Globe className="h-4 w-4" />,
      label: "Website",
      value: business.website.replace(/^https?:\/\//, ""),
      href: business.website
    }
  ].filter(Boolean) as Array<{
    icon: React.ReactNode;
    label: string;
    value: string;
    href?: string;
  }>;

  return (
    <div className="container max-w-2xl px-4 py-5 space-y-3">
      {business.description && (
        <div className="rounded-2xl neu p-4 sm:p-5">
          <h3 className="text-sm font-semibold rv-ink">About</h3>
          <p className="mt-2 text-sm rv-body leading-relaxed whitespace-pre-line">
            {business.description}
          </p>
        </div>
      )}
      <div className="rounded-2xl neu divide-y divide-slate-200/50">
        {rows.map((r) => {
          const content = (
            <div className="flex items-start gap-3 px-4 py-3.5">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center rv-body shrink-0">
                {r.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs rv-muted">{r.label}</div>
                <div className="text-sm rv-ink truncate">{r.value}</div>
              </div>
            </div>
          );
          return r.href ? (
            <a
              key={r.label}
              href={r.href}
              target={r.href.startsWith("http") ? "_blank" : undefined}
              rel={r.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="block hover:bg-slate-50"
            >
              {content}
            </a>
          ) : (
            <div key={r.label}>{content}</div>
          );
        })}
        {rows.length === 0 && (
          <div className="px-4 py-6 text-center text-sm rv-muted">No contact info added.</div>
        )}
      </div>
    </div>
  );
}

function FeedbackStep(props: {
  business: Business;
  rating: number;
  feedback: string;
  setFeedback: (s: string) => void;
  name: string;
  setName: (s: string) => void;
  phone: string;
  setPhone: (s: string) => void;
  email: string;
  setEmail: (s: string) => void;
  tags: string[];
  toggleTag: (t: string) => void;
  npsScore: number | null;
  setNpsScore: (n: number | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  consent: boolean;
  setConsent: (v: boolean) => void;
  panel?: boolean;
  title?: string;
  lang?: "en" | "hi";
  aiEnabled?: boolean;
}) {
  return (
    <div className={cn("container max-w-2xl px-4", props.panel ? "pt-3 pb-5" : "py-5")}>
      <div className="rounded-3xl neu p-5 sm:p-6">
        {props.panel ? (
          <h2 className="text-center text-lg font-semibold">{props.title}</h2>
        ) : (
          <>
            <div className="flex items-center justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={cn(
                    "h-6 w-6",
                    props.rating >= n ? "fill-amber-400 text-amber-400" : "fill-transparent rv-sub"
                  )}
                />
              ))}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-center tracking-tight">
              We'd love to hear more
            </h2>
            <p className="mt-1.5 text-sm rv-muted text-center">
              This goes privately to the owner — never made public.
            </p>
          </>
        )}

        <form onSubmit={props.onSubmit} className="mt-4 space-y-4">
          <HintChips
            slug={props.business.slug}
            lang={props.lang || "en"}
            onInsert={(text) => props.setFeedback(appendHint(props.feedback, text))}
          />
          <div className="space-y-1.5">
            <Label htmlFor="feedback">What could we have done better? *</Label>
            <Textarea
              id="feedback"
              required
              minLength={5}
              maxLength={2000}
              value={props.feedback}
              onChange={(e) => props.setFeedback(e.target.value)}
              placeholder="Tell us what happened…"
              className="min-h-[110px] neu-inset border-0"
            />
          </div>
          {props.aiEnabled ? (
            <PolishDraft slug={props.business.slug} text={props.feedback} lang={props.lang || "en"} />
          ) : null}

          <div className="space-y-2">
            <Label className="text-sm">What was the issue about?</Label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => props.toggleTag(t.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    props.tags.includes(t.id)
                      ? "skeuo-accent text-white"
                      : "skeuo rv-body"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <NpsPicker value={props.npsScore} onChange={props.setNpsScore} lang={props.lang || "en"} />

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                value={props.name}
                onChange={(e) => props.setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile (optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={props.phone}
                onChange={(e) => props.setPhone(e.target.value)}
                placeholder="98xxxxxxxx"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={props.email}
              onChange={(e) => props.setEmail(e.target.value)}
              placeholder="you@email.com"
            />
            <p className="text-xs rv-sub">
              We'll only contact you if you'd like us to follow up.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed rv-body">
            <p>
              {props.business.name} collects your star rating and this message so the owner can
              follow up. Your name, mobile, and email are saved only if you tick the box below, and
              only the business owner can see them. To ask for deletion, use the link in our{" "}
              <a href="/privacy" className="underline">
                privacy notice
              </a>
              .
            </p>
            <label className="mt-2 flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={props.consent}
                onChange={(e) => props.setConsent(e.target.checked)}
              />
              <span>I agree to share my name, mobile, or email with this business.</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="skeuo"
            size="lg"
            className="w-full"
            disabled={props.loading}
          >
            {props.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Send feedback
          </Button>
        </form>
      </div>
    </div>
  );
}

function ThankYouGoogle({ business }: { business: Business }) {
  const platformLabel = business.reviewPlatform === "trustpilot" ? "Trustpilot" : "Google";
  return (
    <div className="container max-w-2xl px-4 py-10 text-center">
      <div className="rounded-3xl neu p-6 sm:p-8">
        <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
          <Heart className="h-8 w-8 fill-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Thank you so much!</h2>
        <p className="mt-2 text-sm rv-muted max-w-sm mx-auto">
          We'd love it if you'd share your experience publicly on {platformLabel}.
        </p>
        {business.googleReviewUrl && isSafeHttpUrl(business.googleReviewUrl) && (
          <Button asChild variant="skeuo" size="lg" className="mt-6 w-full max-w-xs mx-auto">
            <a href={business.googleReviewUrl} target="_blank" rel="noopener noreferrer">
              Leave {platformLabel} Review <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function ThankYouPrivate({ business, customerName }: { business: Business; customerName: string }) {
  return (
    <div className="container max-w-2xl px-4 py-10 text-center">
      <div className="rounded-3xl neu p-6 sm:p-8">
        <div className="h-16 w-16 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          {customerName ? `Thank you, ${customerName.split(" ")[0]}` : "Thank you for your feedback"}
        </h2>
        <p className="mt-2 text-sm rv-muted max-w-sm mx-auto">
          {business.customThankYou ||
            "Your feedback has been sent privately to the owner. We'll personally review it and do everything we can to make it right."}
        </p>
      </div>
    </div>
  );
}

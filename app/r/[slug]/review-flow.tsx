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
  ChevronLeft,
  Copy,
  Check,
  Pencil,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  reviewPlatform?: "google" | "trustpilot";
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
};

type AiQuestion = { id: string; question: string; options: string[] };

const TAGS = [
  { id: "service", label: "Service" },
  { id: "quality", label: "Quality" },
  { id: "price", label: "Value" },
  { id: "staff", label: "Staff" },
  { id: "ambience", label: "Ambience" },
  { id: "speed", label: "Speed" },
  { id: "cleanliness", label: "Cleanliness" }
];

type Step =
  | "rate"
  | "pick-template"
  | "ai"
  | "feedback"
  | "thank-you-google"
  | "thank-you-private";
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

async function safeClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  // Legacy fallback for older Safari / non-secure contexts.
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
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

type TemplatePick = { id: string; content: string };

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
  const [loading, setLoading] = React.useState(false);
  const [templates, setTemplates] = React.useState<TemplatePick[]>([]);
  const [templatesLoading, setTemplatesLoading] = React.useState(false);
  const [pickedId, setPickedId] = React.useState<string | null>(null);
  const [aiQuestions, setAiQuestions] = React.useState<AiQuestion[]>([]);
  const [aiPreparing, setAiPreparing] = React.useState(false);
  // Holds the id of a Review row already captured for this visitor (e.g. the
  // bare low-rating tap). Used to avoid firing the on-tap capture twice.
  const submittedRef = React.useRef<string | null>(null);

  const { business } = props;
  const accent = business.primaryColor || "#1a73e8";
  const platformLabel = business.reviewPlatform === "trustpilot" ? "Trustpilot" : "Google";

  function pickRating(n: number) {
    setRating(n);
    if (n >= business.ratingThreshold && business.googleReviewUrl) {
      // High rating + Google URL: try to fetch templates first.
      // If stock is empty we redirect immediately like before.
      setTimeout(() => onHighRating(n), 250);
    } else {
      // Low rating: capture it immediately (fire-and-forget) so it isn't lost
      // if the customer abandons before submitting written feedback. The later
      // feedback submit reuses this same Review row server-side (matched by
      // fingerprint + rating), so no duplicate Review is created.
      if (!submittedRef.current) {
        submitReview({ rating: n, feedback: "", redirected: false })
          .then((res) => {
            if (res?.reviewId) submittedRef.current = res.reviewId;
          })
          .catch(() => {});
      }
      setTimeout(() => setStep("feedback"), 250);
    }
  }

  async function onHighRating(stars: number) {
    // Reserve a tab while the user-gesture is still fresh so the popup
    // blocker doesn't kick in if we end up redirecting after the fetch.
    const reserved = reserveExternalTab();
    setTemplatesLoading(true);

    // Prefer the AI assistant when it's enabled for this business.
    if (props.aiEnabled) {
      setAiPreparing(true);
      try {
        const res = await fetch("/api/public/ai/questions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug: business.slug }),
          cache: "no-store"
        });
        const j = await res.json().catch(() => ({}));
        if (j.available && Array.isArray(j.questions) && j.questions.length > 0) {
          reserved?.close();
          setAiQuestions(j.questions);
          setTemplatesLoading(false);
          setAiPreparing(false);
          setStep("ai");
          submitReview({ rating: stars, feedback: "", redirected: true }).catch(() => {});
          return;
        }
      } catch {
        // fall through to templates / instant redirect
      }
      setAiPreparing(false);
    }

    try {
      const res = await fetch(
        `/api/public/review-templates/pick?slug=${encodeURIComponent(business.slug)}`,
        { cache: "no-store" }
      );
      const j = await res.json().catch(() => ({}));
      const items: TemplatePick[] = Array.isArray(j.items) ? j.items : [];
      if (items.length > 0) {
        // Showing the modal — we don't redirect, so close the reserved tab.
        reserved?.close();
        setTemplates(items);
        setStep("pick-template");
        // Track the rating now (redirected = true) so analytics still capture it
        submitReview({ rating: stars, feedback: "", redirected: true }).catch(() => {});
        return;
      }
    } catch {
      // fall through to instant redirect
    } finally {
      setTemplatesLoading(false);
    }
    goToGoogleReview(stars, reserved);
  }

  async function goToGoogleReview(stars: number, reserved?: Window | null) {
    const tab = reserved ?? reserveExternalTab();
    setLoading(true);
    try {
      await submitReview({ rating: stars, feedback: "", redirected: true });
    } catch {}
    if (business.googleReviewUrl) {
      navigateExternal(business.googleReviewUrl, tab);
    } else {
      tab?.close();
      setStep("thank-you-google");
    }
  }

  async function onPickTemplate(t: TemplatePick) {
    // Reserve a new tab synchronously inside the click handler so iframe
    // popup-blockers honour the user gesture even after the async fetch.
    const reserved = reserveExternalTab();

    setPickedId(t.id);
    setLoading(true);
    let textToCopy = t.content;
    try {
      const res = await fetch("/api/public/review-templates/consume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: business.slug, templateId: t.id })
      });
      if (res.status === 409) {
        // Race — someone else just took this one. Refetch and let the user pick again.
        reserved?.close();
        toast.message("Just taken — pick another");
        const fresh = await fetch(
          `/api/public/review-templates/pick?slug=${encodeURIComponent(business.slug)}`,
          { cache: "no-store" }
        );
        const j = await fresh.json().catch(() => ({}));
        if (Array.isArray(j.items) && j.items.length > 0) {
          setTemplates(j.items);
          setPickedId(null);
          setLoading(false);
          return;
        }
        // nothing left — go to Google with no copy
      } else if (!res.ok) {
        throw new Error("Couldn't claim review");
      } else {
        const j = await res.json();
        if (j.content) textToCopy = j.content;
      }
    } catch (e: any) {
      reserved?.close();
      toast.error(e.message || "Something went wrong");
      setPickedId(null);
      setLoading(false);
      return;
    }

    // Copy to clipboard. Need a user gesture to satisfy mobile browsers — this
    // function runs from a button onClick so we're inside one.
    const copied = await safeClipboard(textToCopy);
    if (copied) {
      toast.success(`Copied! Paste it on ${platformLabel}'s review form.`);
    } else {
      toast.message("Long-press the highlighted text to copy.");
    }

    // Brief pause so the toast registers, then redirect.
    setTimeout(() => {
      if (business.googleReviewUrl) {
        navigateExternal(business.googleReviewUrl, reserved);
      } else {
        reserved?.close();
        setStep("thank-you-google");
        setLoading(false);
      }
    }, 900);
  }

  async function submitReview(opts: { rating: number; feedback: string; redirected: boolean }) {
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
        npsScore,
        tags,
        source: props.qrCode ? "qr" : "link",
        locationSlug: props.location?.slug,
        staffSlug: props.staff?.slug,
        qrCode: props.qrCode
      })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Failed to submit");
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
      await submitReview({ rating, feedback, redirected: false });
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
    step === "pick-template" ||
    step === "ai" ||
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
          loading={loading || templatesLoading}
        />
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
          href={props.brand?.appUrl || "https://reviewqr.in"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:rv-body"
        >
          Powered by <b className="rv-body">{props.brand?.name || "ReviewQR"}</b>
        </a>
      </footer>

      {/* Full-screen template picker — covers everything else when active */}
      {step === "pick-template" && (
        <PickTemplateModal
          templates={templates}
          pickedId={pickedId}
          loading={loading}
          accent={accent}
          onPick={onPickTemplate}
          onSkip={() => goToGoogleReview(rating)}
        />
      )}

      {/* Full-screen AI assistant — questions → suggested reviews → Google */}
      {step === "ai" && (
        <AiReviewModal
          business={business}
          rating={rating}
          questions={aiQuestions}
          accent={accent}
          onSkip={() => goToGoogleReview(rating)}
        />
      )}

      {/* Loading popup while AI prepares the quick questions */}
      {aiPreparing && (
        <AiLoadingOverlay
          accent={accent}
          title="Preparing your quick review"
          sub="Our AI is getting a couple of questions ready — just a moment."
        />
      )}
    </div>
  );
}

function AiLoadingOverlay({
  accent,
  title,
  sub
}: {
  accent: string;
  title: string;
  sub: string;
}) {
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center glass-strong p-4">
      <div className="w-full max-w-sm rounded-3xl neu p-8 text-center">
        <div className="relative mx-auto h-16 w-16">
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: accent, opacity: 0.25 }}
          />
          <span
            className="absolute inset-2 rounded-full"
            style={{ background: `${accent}22` }}
          />
          <span
            className="absolute inset-0 rounded-full border-[3px] border-transparent animate-spin"
            style={{ borderTopColor: accent }}
          />
          <span className="absolute inset-0 grid place-items-center">
            <Sparkles className="h-6 w-6" style={{ color: accent }} />
          </span>
        </div>
        <h3 className="mt-5 text-lg font-bold rv-ink">{title}</h3>
        <p className="mt-1.5 text-sm rv-muted">{sub}</p>
        <div className="mt-6 space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3 rounded-full neu-inset overflow-hidden">
              <div
                className="h-full w-1/2 rounded-full animate-pulse"
                style={{ background: `${accent}55`, animationDelay: `${i * 180}ms` }}
              />
            </div>
          ))}
        </div>
        <p className="mt-5 text-[11px] rv-sub">This only takes a few seconds — hang tight ✨</p>
      </div>
    </div>
  );
}

function AiReviewModal({
  business,
  rating,
  questions,
  accent,
  onSkip
}: {
  business: Business;
  rating: number;
  questions: AiQuestion[];
  accent: string;
  onSkip: () => void;
}) {
  const [phase, setPhase] = React.useState<"questions" | "reviews">("questions");
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [reviews, setReviews] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null);
  const platformLabel = business.reviewPlatform === "trustpilot" ? "Trustpilot" : "Google";

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const allAnswered = questions.every((q) => answers[q.id]);

  async function getReviews() {
    setLoading(true);
    try {
      const payload = questions
        .map((q) => ({ question: q.question, answer: answers[q.id] || "" }))
        .filter((a) => a.answer);
      const res = await fetch("/api/public/ai/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: business.slug, rating, answers: payload })
      });
      const j = await res.json().catch(() => ({}));
      const items: string[] = Array.isArray(j.reviews) ? j.reviews : [];
      if (items.length === 0) {
        toast.message(`Couldn't draft reviews — you can write your own on ${platformLabel}.`);
        onSkip();
        return;
      }
      setReviews(items);
      setPhase("reviews");
    } catch {
      toast.error("Something went wrong");
      onSkip();
    } finally {
      setLoading(false);
    }
  }

  async function copyAndGo(text: string, idx: number) {
    // Reserve a tab inside this click so iframe popup-blockers honour the gesture.
    const reserved = reserveExternalTab();
    setCopiedIdx(idx);
    const copied = await safeClipboard(text);
    if (copied) toast.success(`Copied! Paste it on ${platformLabel}'s review form.`);
    else toast.message("Long-press the text to copy.");
    setTimeout(() => {
      if (business.googleReviewUrl) navigateExternal(business.googleReviewUrl, reserved);
      else reserved?.close();
    }, 900);
  }

  return (
    <div
      className="fixed inset-0 z-50 glass-strong overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full container max-w-2xl px-4 py-6 sm:py-10 flex flex-col">
        <div className="flex justify-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className="h-7 w-7 fill-amber-400 text-amber-400 drop-shadow-sm" />
          ))}
        </div>

        {phase === "questions" ? (
          <>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: accent }} />
              <h2 className="text-2xl sm:text-3xl font-bold text-center tracking-tight">
                A few quick taps
              </h2>
            </div>
            <p className="mt-3 text-sm rv-body text-center max-w-md mx-auto">
              Tell us what stood out — we'll turn it into a great review you can post in one tap.
            </p>

            <div className="mt-6 space-y-5">
              {questions.map((q) => (
                <div key={q.id}>
                  <div className="text-[15px] font-semibold rv-ink mb-2">{q.question}</div>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((opt) => {
                      const active = answers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                          className={cn(
                            "px-3.5 py-2 rounded-full text-sm font-medium border transition",
                            active
                              ? "text-white"
                              : "skeuo rv-body"
                          )}
                          style={active ? { background: accent, borderColor: accent } : undefined}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={!allAnswered || loading}
                variant="skeuo"
                onClick={getReviews}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Writing your review…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Get my review
                  </>
                )}
              </Button>
              {!allAnswered && (
                <p className="mt-2 text-[11px] rv-sub text-center">
                  Pick one option for each question.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl sm:text-3xl font-bold text-center tracking-tight">
              <span
                className="px-3 py-1 rounded-lg"
                style={{ background: `${accent}1a`, color: accent }}
              >
                Pick your review
              </span>
            </h2>
            <p className="mt-3 text-sm rv-body text-center max-w-md mx-auto">
              Tap <b>Copy</b> on the one you like — we'll copy it and open {platformLabel} so you can paste.
            </p>

            <div className="mt-6 space-y-3">
              {reviews.map((r, idx) => {
                const isCopied = copiedIdx === idx;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-2xl border p-4 sm:p-5 transition",
                      isCopied ? "border-emerald-400 bg-emerald-50/40" : "neu"
                    )}
                    style={isCopied ? { borderColor: accent, background: `${accent}0d` } : undefined}
                  >
                    <p className="text-[15px] leading-relaxed rv-ink whitespace-pre-line">
                      {r}
                    </p>
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        onClick={() => copyAndGo(r, idx)}
                        size="sm"
                        className="min-w-[110px]"
                        variant="skeuo"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-4 w-4" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" /> Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-6 pt-5 border-t border-slate-200">
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={onSkip}>
            <Pencil className="h-4 w-4" /> I'll write my own
          </Button>
        </div>
      </div>

      {/* Loading popup while the AI writes the review options */}
      {loading && phase === "questions" && (
        <AiLoadingOverlay
          accent={accent}
          title="Writing your review"
          sub="Crafting ready-to-post options from your answers."
        />
      )}
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

function PickTemplateModal({
  templates,
  pickedId,
  loading,
  accent,
  onPick,
  onSkip
}: {
  templates: TemplatePick[];
  pickedId: string | null;
  loading: boolean;
  accent: string;
  onPick: (t: TemplatePick) => void;
  onSkip: () => void;
}) {
  // Lock body scroll while the modal is open.
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Show only 3 templates per the requested UX.
  const visible = templates.slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-50 glass-strong overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pick-template-heading"
    >
      <div className="min-h-full container max-w-2xl px-4 py-6 sm:py-10 flex flex-col">
        <div className="flex justify-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className="h-7 w-7 fill-amber-400 text-amber-400 drop-shadow-sm"
            />
          ))}
        </div>

        <h2
          id="pick-template-heading"
          className="text-2xl sm:text-3xl font-bold text-center tracking-tight"
        >
          <span
            className="px-3 py-1 rounded-lg"
            style={{ background: `${accent}1a`, color: accent }}
          >
            Select your content
          </span>
        </h2>
        <p className="mt-3 text-sm rv-body text-center max-w-md mx-auto">
          Tap <b>Copy</b> on the review you'd like to leave. We'll copy it to your clipboard —
          just paste it on the review form.
        </p>

        <div className="mt-6 space-y-3">
          {visible.map((t) => {
            const isPicked = pickedId === t.id;
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-2xl border p-4 sm:p-5 transition",
                  isPicked ? "border-emerald-400 bg-emerald-50/40" : "neu"
                )}
                style={
                  isPicked ? { borderColor: accent, background: `${accent}0d` } : undefined
                }
              >
                <p className="text-[15px] leading-relaxed rv-ink whitespace-pre-line">
                  {t.content}
                </p>
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => onPick(t)}
                    disabled={loading}
                    size="sm"
                    className="min-w-[110px]"
                    variant={isPicked ? "outline" : "skeuo"}
                  >
                    {isPicked ? (
                      loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Copying…
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" /> Copied
                        </>
                      )
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* "I'll write my own" — below the 3 prefilled options */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={onSkip}
            disabled={loading}
          >
            <Pencil className="h-4 w-4" /> I'll write my own
          </Button>
        </div>

        <p className="mt-4 text-[11px] rv-sub text-center">
          Each review is shown to a single customer only — the next person sees fresh options.
        </p>
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
  setNpsScore: (n: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}) {
  return (
    <div className="container max-w-2xl px-4 py-5">
      <div className="rounded-3xl neu p-5 sm:p-6">
        <div className="flex items-center justify-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "h-6 w-6",
                props.rating >= n
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent rv-sub"
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

        <form onSubmit={props.onSubmit} className="mt-5 space-y-4">
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

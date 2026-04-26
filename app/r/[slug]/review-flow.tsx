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
type Tab = "review" | "reviews" | "info";

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

export function ReviewFlow(props: Props) {
  const [step, setStep] = React.useState<Step>("rate");
  const [tab, setTab] = React.useState<Tab>("review");
  const [rating, setRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [feedback, setFeedback] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [npsScore, setNpsScore] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);

  const { business } = props;
  const accent = business.primaryColor || "#1a73e8";

  function pickRating(n: number) {
    setRating(n);
    if (n >= business.ratingThreshold && business.googleReviewUrl) {
      setTimeout(() => goToGoogleReview(n), 350);
    } else {
      setTimeout(() => setStep("feedback"), 250);
    }
  }

  async function goToGoogleReview(stars: number) {
    setLoading(true);
    try {
      await submitReview({ rating: stars, feedback: "", redirected: true });
    } catch {}
    if (business.googleReviewUrl) window.location.href = business.googleReviewUrl;
    else setStep("thank-you-google");
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
  const inSubFlow = step === "feedback" || step === "thank-you-google" || step === "thank-you-private";

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col" style={{ "--accent": accent } as any}>
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
              setTab("review");
            }}
            className="absolute top-3 left-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/40 text-white text-xs backdrop-blur-sm hover:bg-black/60"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}

        <button
          type="button"
          onClick={share}
          className="absolute top-3 right-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/40 text-white text-xs backdrop-blur-sm hover:bg-black/60"
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
              <p className="text-sm text-slate-500 mt-0.5">{business.industry}</p>
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
                    : "fill-transparent text-slate-300"
                )}
              />
            ))}
          </div>
          <span className="text-slate-500">
            {props.stats.count > 0
              ? `${props.stats.count} review${props.stats.count === 1 ? "" : "s"}`
              : "Be the first to review"}
          </span>
        </div>

        {(business.address || business.city) && (
          <p className="mt-2 text-xs text-slate-500 flex items-start gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="truncate">
              {props.location?.name && (
                <span className="font-medium text-slate-700">{props.location.name} · </span>
              )}
              {fullAddress(business) || business.city}
            </span>
          </p>
        )}
      </div>

      {/* Action chips */}
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

      {/* Tabs */}
      {!inSubFlow && (
        <div className="container max-w-2xl px-4 mt-5">
          <div className="border-b border-slate-200 flex gap-6">
            {(
              [
                { id: "review", label: "Leave a review" },
                { id: "reviews", label: `Reviews${props.reviews.length ? ` · ${props.reviews.length}` : ""}` },
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
                    ? "border-current text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
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
        {step === "rate" && tab === "review" && (
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

      <footer className="py-6 text-center text-xs text-slate-400">
        <a
          href="https://reviewqr.in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-slate-600"
        >
          Powered by <b className="text-slate-600">ReviewQR</b>
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
    "flex flex-col items-center gap-1 py-2 px-1 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition";
  const inner = (
    <>
      <span
        className="h-9 w-9 rounded-full flex items-center justify-center"
        style={{ background: `${accent}14`, color: accent }}
      >
        {icon}
      </span>
      <span className="text-[11px] font-medium text-slate-700">{label}</span>
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

  return (
    <div className="container max-w-2xl px-4 py-6 sm:py-8">
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-7">
        {staff && (
          <div className="mb-5 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
            {staff.photo ? (
              <img
                src={staff.photo}
                className="h-10 w-10 rounded-full object-cover"
                alt={staff.name}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-700">
                {staff.name[0]}
              </div>
            )}
            <div className="text-sm">
              <div className="text-slate-500 text-xs">You were served by</div>
              <div className="font-semibold">{staff.name}</div>
            </div>
          </div>
        )}

        <h2 className="text-xl sm:text-2xl font-bold text-center tracking-tight">
          How was your experience?
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 text-center">Tap a star to rate · 30 seconds</p>

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
                    : "fill-transparent text-slate-300"
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
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Taking you to Google…
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewsTab({ reviews }: { reviews: PublicReview[] }) {
  if (reviews.length === 0) {
    return (
      <div className="container max-w-2xl px-4 py-10 text-center text-sm text-slate-500">
        No reviews yet — be the first to share your experience.
      </div>
    );
  }
  return (
    <div className="container max-w-2xl px-4 py-5 space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            {r.authorImage ? (
              <img
                src={r.authorImage}
                alt={r.author}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-700">
                {r.author[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm truncate">{r.author}</div>
                <div className="text-xs text-slate-400 shrink-0">{timeAgoShort(r.createdAt)}</div>
              </div>
              {r.authorRole && <div className="text-xs text-slate-500">{r.authorRole}</div>}
              <div className="flex mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      "h-3.5 w-3.5",
                      n <= r.rating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-transparent text-slate-300"
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
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
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-900">About</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {business.description}
          </p>
        </div>
      )}
      <div className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100">
        {rows.map((r) => {
          const content = (
            <div className="flex items-start gap-3 px-4 py-3.5">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                {r.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-500">{r.label}</div>
                <div className="text-sm text-slate-900 truncate">{r.value}</div>
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
          <div className="px-4 py-6 text-center text-sm text-slate-500">No contact info added.</div>
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
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "h-6 w-6",
                props.rating >= n
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-slate-300"
              )}
            />
          ))}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-center tracking-tight">
          We'd love to hear more
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 text-center">
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
              className="min-h-[110px]"
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
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
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
            <p className="text-xs text-slate-400">
              We'll only contact you if you'd like us to follow up.
            </p>
          </div>

          <Button
            type="submit"
            variant="gradient"
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
  return (
    <div className="container max-w-2xl px-4 py-10 text-center">
      <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8">
        <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
          <Heart className="h-8 w-8 fill-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Thank you so much!</h2>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          We'd love it if you'd share your experience publicly on Google.
        </p>
        {business.googleReviewUrl && (
          <Button asChild variant="gradient" size="lg" className="mt-6 w-full max-w-xs mx-auto">
            <a href={business.googleReviewUrl} target="_blank" rel="noopener noreferrer">
              Leave Google Review <ExternalLink className="h-4 w-4" />
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
      <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8">
        <div className="h-16 w-16 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          {customerName ? `Thank you, ${customerName.split(" ")[0]}` : "Thank you for your feedback"}
        </h2>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
          {business.customThankYou ||
            "Your feedback has been sent privately to the owner. We'll personally review it and do everything we can to make it right."}
        </p>
      </div>
    </div>
  );
}

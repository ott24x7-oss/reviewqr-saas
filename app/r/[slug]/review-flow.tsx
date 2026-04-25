"use client";
import * as React from "react";
import { Star, MapPin, ArrowRight, Loader2, CheckCircle2, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Business = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  primaryColor: string;
  googleReviewUrl?: string | null;
  ratingThreshold: number;
  customThankYou?: string | null;
  whatsappNumber?: string | null;
  city?: string | null;
};

type Props = {
  business: Business;
  location: { id: string; name: string; slug: string } | null;
  staff: { id: string; name: string; slug: string; photo?: string | null } | null;
  qrCode: string | null;
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

export function ReviewFlow(props: Props) {
  const [step, setStep] = React.useState<Step>("rate");
  const [rating, setRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [feedback, setFeedback] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [npsScore, setNpsScore] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Auto-redirect happy customer to Google
  function pickRating(n: number) {
    setRating(n);
    if (n >= props.business.ratingThreshold && props.business.googleReviewUrl) {
      // small delay so they see the stars filled
      setTimeout(() => goToGoogleReview(n), 350);
    } else {
      setTimeout(() => setStep("feedback"), 250);
    }
  }

  async function goToGoogleReview(stars: number) {
    setLoading(true);
    try {
      await submitReview({
        rating: stars,
        feedback: "",
        redirected: true
      });
    } catch (e) {
      // continue to redirect even on error so we don't block customer
    }
    if (props.business.googleReviewUrl) {
      window.location.href = props.business.googleReviewUrl;
    } else {
      setStep("thank-you-google");
    }
  }

  async function submitReview(opts: { rating: number; feedback: string; redirected: boolean }) {
    const res = await fetch("/api/public/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        businessSlug: props.business.slug,
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

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(180deg, ${props.business.primaryColor}08 0%, #ffffff 60%)`
      }}
    >
      <header className="bg-white border-b shadow-sm">
        <div className="container max-w-md py-4 flex items-center gap-3">
          {props.business.logo ? (
            <img
              src={props.business.logo}
              alt={props.business.name}
              className="h-12 w-12 rounded-xl object-cover bg-secondary"
            />
          ) : (
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
              style={{ background: props.business.primaryColor }}
            >
              {props.business.name[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-base sm:text-lg leading-tight truncate">
              {props.business.name}
            </h1>
            {(props.location || props.business.city) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {props.location?.name || props.business.city}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {step === "rate" && (
          <RateStep
            business={props.business}
            staff={props.staff}
            rating={rating}
            hoverRating={hoverRating}
            setHoverRating={setHoverRating}
            pickRating={pickRating}
            loading={loading}
          />
        )}
        {step === "feedback" && (
          <FeedbackStep
            business={props.business}
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
        {step === "thank-you-google" && <ThankYouGoogle business={props.business} />}
        {step === "thank-you-private" && (
          <ThankYouPrivate business={props.business} customerName={name} />
        )}
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        <a
          href="https://reviewqr.in"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          Powered by <b className="gradient-text">ReviewQR</b>
        </a>
      </footer>
    </div>
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
    <div className="container max-w-md flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 animate-fade-in">
      {staff && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border shadow-soft">
          {staff.photo ? (
            <img src={staff.photo} className="h-10 w-10 rounded-full object-cover" alt={staff.name} />
          ) : (
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
              {staff.name[0]}
            </div>
          )}
          <div className="text-sm">
            <div className="text-muted-foreground text-xs">You were served by</div>
            <div className="font-semibold">{staff.name}</div>
          </div>
        </div>
      )}

      <h2 className="text-2xl sm:text-3xl font-bold font-display text-center text-balance">
        How was your experience?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
        Your feedback helps us improve. It only takes 30 seconds.
      </p>

      <div
        className="mt-8 sm:mt-10 flex gap-2"
        onMouseLeave={() => setHoverRating(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={loading}
            onClick={() => pickRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            className="star-btn p-1 disabled:opacity-50"
            aria-label={`${n} stars`}
          >
            <Star
              className={`h-12 w-12 sm:h-14 sm:w-14 transition-all ${
                display >= n
                  ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                  : "fill-transparent text-muted-foreground/40"
              }`}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      <div className="mt-6 h-7 text-center">
        {display > 0 && (
          <span
            className={`px-4 py-1.5 rounded-full text-sm font-semibold animate-fade-in ${
              display >= 4
                ? "bg-accent-100 text-accent-800"
                : display === 3
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {labels[display]}
          </span>
        )}
      </div>

      {loading && (
        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Taking you to Google...
        </div>
      )}
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
    <div className="container max-w-md flex-1 px-4 py-8 animate-fade-in">
      <div className="rounded-2xl bg-white border shadow-card p-5 sm:p-6">
        <div className="flex items-center justify-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`h-7 w-7 ${
                props.rating >= n ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold font-display text-center text-balance">
          We'd love to hear more
        </h2>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          Your feedback goes directly to the owner — never made public. We'll do better.
        </p>

        <form onSubmit={props.onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="feedback">What could we have done better? *</Label>
            <Textarea
              id="feedback"
              required
              minLength={5}
              maxLength={2000}
              value={props.feedback}
              onChange={(e) => props.setFeedback(e.target.value)}
              placeholder="Tell us what happened..."
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    props.tags.includes(t.id)
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-muted-foreground border-border hover:border-primary"
                  }`}
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
            <p className="text-xs text-muted-foreground">
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
    <div className="container max-w-md flex-1 flex flex-col items-center justify-center px-4 py-12 text-center animate-fade-in">
      <div className="h-16 w-16 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center mb-4">
        <Heart className="h-8 w-8 fill-accent-600" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold font-display text-balance">
        Thank you so much! 🎉
      </h2>
      <p className="mt-3 text-muted-foreground max-w-xs">
        We'd love it if you'd share your experience publicly on Google.
      </p>
      {business.googleReviewUrl && (
        <Button
          asChild
          variant="gradient"
          size="lg"
          className="mt-8 w-full max-w-xs"
        >
          <a href={business.googleReviewUrl} target="_blank" rel="noopener noreferrer">
            Leave Google Review <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      )}
    </div>
  );
}

function ThankYouPrivate({ business, customerName }: { business: Business; customerName: string }) {
  return (
    <div className="container max-w-md flex-1 flex flex-col items-center justify-center px-4 py-12 text-center animate-fade-in">
      <div className="h-16 w-16 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold font-display text-balance">
        {customerName ? `Thank you, ${customerName.split(" ")[0]}` : "Thank you for your feedback"}
      </h2>
      <p className="mt-3 text-muted-foreground max-w-xs">
        {business.customThankYou ||
          "Your feedback has been sent privately to the owner. We'll personally review it and do everything we can to make it right."}
      </p>
      <Button
        asChild
        variant="outline"
        size="lg"
        className="mt-8 w-full max-w-xs"
      >
        <a href="/">Back to home</a>
      </Button>
    </div>
  );
}

import { Star, ArrowRight, ArrowDown, Check, ExternalLink, MessageSquare, Send } from "lucide-react";

export function HowItWorks() {
  return (
    <section id="how" className="py-16 sm:py-24 overflow-hidden">
      <div className="container max-w-6xl">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-accent/15 text-accent text-sm font-medium">
            How it works
          </span>
          <h2 className="section-title mt-4 font-display">
            Live in <span className="gradient-text">5 minutes</span>
          </h2>
        </div>

        {/* Step 1 → Step 2 → Step 3 → Step 4 with phone mockups */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-3">
          <Step1 />
          <Connector />
          <Step2 />
          <Connector />
          <Step3 />
          <Connector />
          <Step4 />
          <Connector />
        </div>
      </div>
    </section>
  );
}

function Connector() {
  return (
    <div className="hidden lg:flex items-center justify-center -mx-6">
      <ArrowRight className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}

/* Phone mockup wrapper */
function Phone({ children, label, n }: { children: React.ReactNode; label: string; n: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-xs font-semibold text-muted-foreground mb-2">
        <span className="px-2 py-0.5 rounded-full bg-surface border border-border mr-1">{n}</span>
        {label}
      </div>
      <div className="relative w-44 sm:w-48 aspect-[9/19] rounded-[1.75rem] border-[8px] border-zinc-900 bg-zinc-900 shadow-card">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3.5 w-16 rounded-full bg-zinc-900 z-20" />
        <div className="relative h-full w-full rounded-[1.25rem] overflow-hidden bg-white">{children}</div>
      </div>
    </div>
  );
}

function Step1() {
  // Customer scans QR poster
  return (
    <Phone n="01" label="Customer scans">
      <div className="h-full w-full bg-gradient-to-br from-primary-50 to-accent-50 flex flex-col items-center justify-center p-3">
        <div className="rounded-xl bg-white border-2 border-primary p-3 shadow-soft">
          {/* Mini QR */}
          <svg viewBox="0 0 36 36" className="w-24 h-24" fill="#1a73e8">
            <rect x="0" y="0" width="10" height="10" />
            <rect x="2" y="2" width="6" height="6" fill="white" />
            <rect x="4" y="4" width="2" height="2" fill="#1a73e8" />
            <rect x="26" y="0" width="10" height="10" />
            <rect x="28" y="2" width="6" height="6" fill="white" />
            <rect x="30" y="4" width="2" height="2" fill="#1a73e8" />
            <rect x="0" y="26" width="10" height="10" />
            <rect x="2" y="28" width="6" height="6" fill="white" />
            <rect x="4" y="30" width="2" height="2" fill="#1a73e8" />
            <rect x="14" y="2" width="2" height="4" />
            <rect x="18" y="4" width="2" height="2" />
            <rect x="22" y="2" width="2" height="6" />
            <rect x="14" y="14" width="6" height="2" />
            <rect x="22" y="14" width="2" height="6" />
            <rect x="26" y="18" width="4" height="2" />
            <rect x="14" y="22" width="2" height="6" />
            <rect x="18" y="26" width="6" height="2" />
            <rect x="26" y="22" width="2" height="2" />
            <rect x="30" y="24" width="4" height="4" />
            <rect x="28" y="32" width="2" height="2" />
          </svg>
        </div>
        <div className="mt-3 text-[10px] font-bold gradient-text-google">SCAN ME</div>
        <div className="mt-1 text-[8px] text-muted-foreground text-center">
          Loved your visit?
          <br />Leave us a review!
        </div>
      </div>
    </Phone>
  );
}

function Step2() {
  // Picks a rating
  return (
    <Phone n="02" label="Picks rating">
      <div className="h-full bg-white">
        <div className="border-b px-3 py-2 flex items-center gap-2">
          <div className="h-6 w-6 rounded gradient-brand flex items-center justify-center text-white text-[9px] font-bold">
            S
          </div>
          <div className="text-[10px] font-semibold truncate">Spice Junction Café</div>
        </div>
        <div className="p-3 flex flex-col items-center">
          <div className="text-xs font-bold text-center font-display mt-3">
            How was your<br />experience?
          </div>
          <div className="mt-5 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-5 w-5 ${
                  n <= 5 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                }`}
                strokeWidth={1.5}
              />
            ))}
          </div>
          <span className="mt-3 inline-block px-2.5 py-0.5 rounded-full bg-accent-100 text-accent-800 text-[9px] font-bold">
            Amazing
          </span>
          <div className="mt-4 w-full rounded-lg bg-secondary border p-2 text-center">
            <div className="text-[8px] text-muted-foreground">Auto-redirecting...</div>
          </div>
        </div>
      </div>
    </Phone>
  );
}

function Step3() {
  // Lands on Google
  return (
    <Phone n="03" label="Posts to Google">
      <div className="h-full bg-white">
        <div className="bg-white border-b px-3 py-2 flex items-center gap-1">
          <span className="text-[10px] font-bold gradient-text-google">G</span>
          <span className="text-[9px] text-muted-foreground">maps.google.com</span>
        </div>
        <div className="p-3">
          <div className="text-[10px] font-semibold mb-2">Rate Spice Junction Café</div>
          <div className="flex gap-0.5 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" strokeWidth={1.5} />
            ))}
          </div>
          <div className="rounded-lg border bg-secondary/40 p-2 mb-2">
            <textarea
              className="w-full bg-transparent text-[9px] resize-none outline-none"
              rows={3}
              defaultValue="Loved the masala dosa! Best in Indiranagar."
              readOnly
            />
          </div>
          <div className="flex justify-end gap-1">
            <div className="px-2 py-1 rounded text-[8px] text-muted-foreground">Cancel</div>
            <div className="px-3 py-1 rounded bg-primary text-white text-[9px] font-medium inline-flex items-center gap-1">
              Post <ExternalLink className="h-2 w-2" />
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-[8px] text-accent-600 font-medium">
            <Check className="h-2.5 w-2.5" /> Public review live
          </div>
        </div>
      </div>
    </Phone>
  );
}

function Step4() {
  // You see in dashboard / get WA alert
  return (
    <Phone n="04" label="You get notified">
      <div className="h-full bg-secondary/30">
        <div className="bg-white border-b px-3 py-2 flex items-center gap-2">
          <div className="h-5 w-5 rounded-md gradient-brand flex items-center justify-center text-white text-[8px] font-bold">
            R
          </div>
          <div className="text-[9px] font-semibold">ReviewQR</div>
        </div>
        <div className="p-3 space-y-2">
          {/* WhatsApp alert */}
          <div className="rounded-lg bg-white shadow-soft border p-2 flex items-start gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366] shrink-0">
              <MessageSquare className="h-3 w-3" />
            </span>
            <div className="text-[9px] min-w-0">
              <div className="font-semibold">5★ from Ananya</div>
              <div className="text-muted-foreground truncate">"Loved the dosa!"</div>
              <div className="mt-0.5 inline-flex items-center gap-0.5 text-[8px] text-accent-600 font-medium">
                <ExternalLink className="h-2 w-2" /> Sent to Google
              </div>
            </div>
          </div>
          {/* Stats */}
          <div className="rounded-lg bg-white shadow-soft border p-2">
            <div className="text-[8px] text-muted-foreground">Today</div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold">14</span>
              <span className="text-[9px] text-muted-foreground">new reviews</span>
              <span className="ml-auto text-[9px] text-accent-600 font-medium">+24%</span>
            </div>
            <div className="mt-1.5 flex items-end gap-0.5 h-6">
              {[40, 55, 48, 62, 70, 68, 82].map((h, i) => (
                <div key={i} className="flex-1 rounded-t gradient-brand" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          {/* Send WA template */}
          <div className="rounded-lg bg-white shadow-soft border p-2 flex items-center gap-2">
            <Send className="h-3 w-3 text-primary" />
            <span className="text-[9px] flex-1">3 new contacts to follow up</span>
            <span className="text-[8px] text-primary font-bold">→</span>
          </div>
        </div>
      </div>
    </Phone>
  );
}

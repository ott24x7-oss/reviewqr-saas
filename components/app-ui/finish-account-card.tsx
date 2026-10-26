"use client";

import * as React from "react";
import { CheckCircle2, MailCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useAppLanguage } from "./i18n";

const STORAGE_KEY = "qr24x7.finish-account-dismissed";

export function FinishAccountCard({ emailVerified }: { emailVerified: boolean }) {
  const { text } = useAppLanguage();
  const [visible, setVisible] = React.useState(false);
  const [reportChoice, setReportChoice] = React.useState<null | "email" | "whatsapp" | "both">(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    setVisible(!emailVerified);
    fetch("/api/v1/reports/preferences")
      .then((response) => response.json())
      .then((json) => {
        const hasPreference = json.data?.emailOptIn === true || json.data?.whatsappOptIn === true;
        if (!hasPreference) setVisible(true);
      })
      .catch(() => undefined);
  }, [emailVerified]);

  async function saveChoice(choice: "email" | "whatsapp" | "both" | "later") {
    setBusy(true);
    try {
      if (choice !== "later") {
        const response = await fetch("/api/v1/reports/preferences", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            emailOptIn: choice === "email" || choice === "both",
            whatsappOptIn: choice === "whatsapp" || choice === "both"
          })
        });
        if (!response.ok) throw new Error();
      }
      window.localStorage.setItem(STORAGE_KEY, "1");
      setVisible(false);
      if (choice !== "later") toast.success(text("Your weekly summary preference is saved.", "आपकी साप्ताहिक सारांश सेटिंग सेव हो गई है।"));
    } catch {
      toast.error(text("Could not save this preference. Try again.", "यह सेटिंग सेव नहीं हुई। फिर कोशिश करें।"));
    } finally {
      setBusy(false);
    }
  }

  async function resendEmail() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/verify-email", { method: "POST" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not send the email");
      toast.success(text("Confirmation link sent.", "पुष्टि लिंक भेज दिया गया है।"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text("Could not send the email.", "ईमेल नहीं भेज सके।"));
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;
  return (
    <section className="app-ui-panel mb-5 flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5" aria-label={text("Finish your account", "अपना खाता पूरा करें")}>
      <div className="flex min-w-0 gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {emailVerified ? <CheckCircle2 className="h-5 w-5" /> : <MailCheck className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">{text("Finish your account", "अपना खाता पूरा करें")}</h2>
          {!emailVerified ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">{text("Confirm your email so you can recover your account.", "अपना खाता वापस पाने के लिए ईमेल की पुष्टि करें।")}</p>
              <button type="button" onClick={resendEmail} disabled={busy} className="app-ui-focus mt-2 min-h-9 rounded-md px-2 text-sm font-medium text-primary underline underline-offset-4 disabled:opacity-60">
                {text("Resend confirmation link", "पुष्टि लिंक फिर भेजें")}
              </button>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">{text("Choose how you want to receive your weekly business summary.", "चुनें कि साप्ताहिक कारोबार सारांश कहाँ पाना चाहते हैं।")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["email", "whatsapp", "both"] as const).map((choice) => (
                  <button
                    type="button"
                    key={choice}
                    onClick={() => saveChoice(choice)}
                    disabled={busy}
                    className="app-ui-focus min-h-9 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted disabled:opacity-60"
                  >
                    {choice === "email" ? text("Email", "ईमेल") : choice === "whatsapp" ? "WhatsApp" : text("Both", "दोनों")}
                  </button>
                ))}
                <button type="button" onClick={() => saveChoice("later")} disabled={busy} className="app-ui-focus min-h-9 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted">
                  {text("Not now", "अभी नहीं")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => { window.localStorage.setItem(STORAGE_KEY, "1"); setVisible(false); }}
        className="app-ui-focus inline-flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-md text-muted-foreground hover:bg-muted sm:self-start"
        aria-label={text("Dismiss", "बंद करें")}
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}

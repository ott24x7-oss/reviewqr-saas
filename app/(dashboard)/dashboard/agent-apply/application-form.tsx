"use client";

import * as React from "react";
import Link from "next/link";
import { agentApplicationSubmitSchema } from "@reviewqr/shared";
import { AppText, useAppLanguage } from "@/components/app-ui/i18n";

type Status = { status: "none" | "pending" | "approved" | "rejected"; rejectionReason: string | null; appliedAt: string | null; reapplyAt: string | null; canReapply: boolean };

export function ResellerApplicationForm({ initialName, initialPhone }: { initialName: string; initialPhone: string }) {
  const { language, text } = useAppLanguage();
  const [status, setStatus] = React.useState<Status | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState(initialName);
  const [phone, setPhone] = React.useState(initialPhone);
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [howSell, setHowSell] = React.useState("");
  const [experience, setExperience] = React.useState("");
  const [languages, setLanguages] = React.useState("");
  const [code, setCode] = React.useState("");
  const [accepted, setAccepted] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [message, setMessage] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/agent/apply", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Could not load application status");
      setStatus(body.data as Status);
    } catch {
      setMessage(text("Could not load your application status. Refresh the page to try again.", "आवेदन की स्थिति नहीं खुली। फिर कोशिश करने के लिए पेज रीफ़्रेश करें।"));
    } finally {
      setLoading(false);
    }
  }, [text]);

  React.useEffect(() => { refresh().catch(() => undefined); }, [refresh]);

  const formAvailable = status?.status === "none" || (status?.status === "rejected" && status.canReapply);
  const rejectedDate = status?.reapplyAt
    ? new Intl.DateTimeFormat(language === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(status.reapplyAt))
    : "";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors([]);
    setMessage("");
    const payload = {
      name,
      phone,
      city,
      state,
      howSell,
      experience,
      languages: languages.split(",").map((item) => item.trim()).filter(Boolean),
      referralOrTeamCode: code,
      termsAccepted: accepted
    };
    const parsed = agentApplicationSubmitSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.path[0]?.toString() || "form"));
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/v1/agent/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Could not submit your application");
      setMessage(text("Application submitted.", "आवेदन भेज दिया गया है।"));
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text("Could not submit your application. Try again.", "आवेदन नहीं भेजा जा सका। फिर कोशिश करें।"));
    } finally {
      setSaving(false);
    }
  }

  function fieldError(name: string) {
    if (!errors.includes(name)) return null;
    const message = name === "name" ? text("Enter your name.", "अपना नाम लिखें।")
      : name === "phone" ? text("Enter a valid mobile number.", "सही मोबाइल नंबर लिखें।")
      : name === "city" ? text("Enter your city.", "अपना शहर लिखें।")
      : name === "state" ? text("Enter your state.", "अपना राज्य लिखें।")
      : name === "howSell" ? text("Choose how you will sell.", "बिक्री का तरीका चुनें।")
      : name === "languages" ? text("Enter at least one language.", "कम से कम एक भाषा लिखें।")
      : text("Accept the reseller terms to continue.", "जारी रखने के लिए शर्तें स्वीकार करें।");
    return <p className="mt-1 text-sm text-destructive" role="alert">{message}</p>;
  }

  const inputClass = "mt-1 min-h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
  if (loading) return <p className="text-sm text-muted-foreground"><AppText en="Loading application status…" hi="आवेदन की स्थिति खुल रही है…" /></p>;

  return <div className="space-y-5">
    {message ? <p role="status" className="rounded-lg border bg-card p-3 text-sm">{message}</p> : null}
    {status?.status === "pending" ? <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold"><AppText en="Application under review" hi="आवेदन की जाँच हो रही है" /></h2>
      <p className="mt-2 text-sm text-muted-foreground"><AppText en="We’ll review your details and notify you when there’s an update." hi="हम आपकी जानकारी की जाँच करके अपडेट मिलने पर बताएँगे।" /></p>
    </section> : null}
    {status?.status === "approved" ? <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold"><AppText en="You’re approved" hi="आपका आवेदन मंज़ूर है" /></h2>
      <p className="mt-2 text-sm text-muted-foreground"><AppText en="Your reseller dashboard is ready. Complete payout details before your first payout." hi="आपका रीसेलर डैशबोर्ड तैयार है। पहले भुगतान से पहले पेआउट जानकारी भरें।" /></p>
      <Link href="/dashboard/agent" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"><AppText en="Open agent dashboard" hi="एजेंट डैशबोर्ड खोलें" /></Link>
    </section> : null}
    {status?.status === "rejected" ? <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold"><AppText en="Application not approved" hi="आवेदन मंज़ूर नहीं हुआ" /></h2>
      {status.rejectionReason ? <p className="mt-2 text-sm text-muted-foreground">{status.rejectionReason}</p> : null}
      {rejectedDate ? <p className="mt-2 text-sm"><AppText en={`You can apply again on ${rejectedDate}.`} hi={`आप ${rejectedDate} से फिर आवेदन कर सकते हैं।`} /></p> : null}
    </section> : null}
    {formAvailable ? <form onSubmit={(event) => submit(event).catch(() => undefined)} className="space-y-4 rounded-2xl border bg-card p-5">
      <div><label htmlFor="reseller-name" className="text-sm font-medium"><AppText en="Your name" hi="आपका नाम" /></label><input id="reseller-name" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />{fieldError("name")}</div>
      <div><label htmlFor="reseller-phone" className="text-sm font-medium"><AppText en="Mobile number" hi="मोबाइल नंबर" /></label><input id="reseller-phone" className={inputClass} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" />{fieldError("phone")}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="reseller-city" className="text-sm font-medium"><AppText en="City" hi="शहर" /></label><input id="reseller-city" className={inputClass} value={city} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" />{fieldError("city")}</div>
        <div><label htmlFor="reseller-state" className="text-sm font-medium"><AppText en="State" hi="राज्य" /></label><input id="reseller-state" className={inputClass} value={state} onChange={(event) => setState(event.target.value)} autoComplete="address-level1" />{fieldError("state")}</div>
      </div>
      <div><label htmlFor="reseller-how-sell" className="text-sm font-medium"><AppText en="How will you sell?" hi="आप कैसे बेचेंगे?" /></label>
        <select id="reseller-how-sell" className={inputClass} value={howSell} onChange={(event) => setHowSell(event.target.value)}>
          <option value="">{text("Choose one", "एक चुनें")}</option>
          <option value="SHOP_VISITS">{text("Shop visits", "दुकानों पर जाकर")}</option>
          <option value="EXISTING_CLIENTS">{text("Existing clients", "मौजूदा ग्राहकों को")}</option>
          <option value="ONLINE">{text("Online", "ऑनलाइन")}</option>
          <option value="OTHER">{text("Other", "अन्य")}</option>
        </select>{fieldError("howSell")}
      </div>
      <div><label htmlFor="reseller-experience" className="text-sm font-medium"><AppText en="Relevant experience (optional)" hi="संबंधित अनुभव (ज़रूरी नहीं)" /></label><textarea id="reseller-experience" className={`${inputClass} min-h-24 py-2`} value={experience} onChange={(event) => setExperience(event.target.value)} maxLength={500} /></div>
      <div><label htmlFor="reseller-languages" className="text-sm font-medium"><AppText en="Languages you speak" hi="आप कौन-सी भाषाएँ बोलते हैं" /></label><input id="reseller-languages" className={inputClass} value={languages} onChange={(event) => setLanguages(event.target.value)} placeholder={text("Hindi, English", "हिंदी, अंग्रेज़ी")} />{fieldError("languages")}</div>
      <div><label htmlFor="reseller-code" className="text-sm font-medium"><AppText en="Referral or team code (optional)" hi="रेफरल या टीम कोड (ज़रूरी नहीं)" /></label><input id="reseller-code" className={inputClass} value={code} onChange={(event) => setCode(event.target.value)} autoCapitalize="characters" /></div>
      <p><Link href="/reseller-terms" target="_blank" className="min-h-11 text-sm font-medium text-primary underline"><AppText en="Read reseller terms" hi="रीसेलर की शर्तें पढ़ें" /></Link></p>
      <div>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="h-5 w-5 accent-primary" />
          <span><AppText en="I agree to the reseller terms." hi="मैं रीसेलर की शर्तों से सहमत हूँ।" /></span>
        </label>{fieldError("termsAccepted")}
      </div>
      {errors.includes("form") ? <p className="text-sm text-destructive" role="alert"><AppText en="Check the form and try again." hi="फ़ॉर्म जाँचकर फिर कोशिश करें।" /></p> : null}
      <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">{saving ? <AppText en="Sending…" hi="भेज रहे हैं…" /> : <AppText en="Submit application" hi="आवेदन भेजें" />}</button>
    </form> : null}
  </div>;
}

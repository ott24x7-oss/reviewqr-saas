"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Plus, Send } from "lucide-react";
import { AppText, useAppLanguage } from "@/components/app-ui/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Business = { id: string; name: string };
type Campaign = {
  id: string;
  businessId: string;
  name: string;
  status: string;
  sent: number;
  opened: number;
  reviewed: number;
  createdAt: string;
  business: { name: string; slug: string };
};

export function CampaignsClient({ businesses, campaigns }: { businesses: Business[]; campaigns: Campaign[] }) {
  const router = useRouter();
  const { language, text } = useAppLanguage();
  const [businessId, setBusinessId] = React.useState(businesses[0]?.id || "");
  const [name, setName] = React.useState("");
  const [template, setTemplate] = React.useState("Hi {name}, we would love your feedback.");
  const [busy, setBusy] = React.useState(false);
  const [sendingId, setSendingId] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  function userError(message: string) {
    if (message === "Connect WhatsApp in admin first") {
      return text("Connect WhatsApp in admin first", "पहले एडमिन में WhatsApp कनेक्ट करें");
    }
    return message;
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessId) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/businesses/${businessId}/campaigns`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, template })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || text("Could not save campaign", "कैंपेन सेव नहीं हुआ"));
      setName("");
      setNotice(text("Campaign saved", "कैंपेन सेव हुआ"));
      router.refresh();
    } catch (cause) {
      setError(userError(cause instanceof Error ? cause.message : text("Could not save campaign", "कैंपेन सेव नहीं हुआ")));
    } finally {
      setBusy(false);
    }
  }

  async function send(campaign: Campaign) {
    setSendingId(campaign.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/businesses/${campaign.businessId}/campaigns/${campaign.id}/send`, {
        method: "POST"
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || text("Could not send campaign", "कैंपेन नहीं भेजा गया"));
      setNotice(
        text(
          `${body.sent} sent · ${body.skipped} skipped`,
          `${body.sent} भेजे गए · ${body.skipped} छोड़े गए`
        )
      );
      router.refresh();
    } catch (cause) {
      setError(userError(cause instanceof Error ? cause.message : text("Could not send campaign", "कैंपेन नहीं भेजा गया")));
    } finally {
      setSendingId("");
    }
  }

  const dateLocale = language === "hi" ? "hi-IN" : "en-IN";

  return (
    <>
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold mb-3"><AppText en="New campaign" hi="नया कैंपेन" /></h2>
          {businesses.length ? (
            <form className="grid gap-3 max-w-2xl" onSubmit={create}>
              <label className="grid gap-1.5 text-sm font-medium">
                <AppText en="Business" hi="कारोबार" />
                <select className="h-10 rounded-md border bg-background px-3 font-normal" value={businessId} onChange={(event) => setBusinessId(event.target.value)}>
                  {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                <AppText en="Campaign name" hi="कैंपेन का नाम" />
                <input className="h-10 rounded-md border bg-background px-3 font-normal" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                <AppText en="Message to customers" hi="ग्राहकों के लिए संदेश" />
                <textarea className="min-h-28 rounded-md border bg-background px-3 py-2 font-normal" value={template} onChange={(event) => setTemplate(event.target.value)} minLength={2} maxLength={500} required />
              </label>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {text("Up to 30 consented contacts per send.", "हर बार सहमति देने वाले 30 ग्राहकों तक संदेश जाएगा।")} {Array.from(template).length}/500
                </p>
                <Button type="submit" size="sm" variant="gradient" disabled={busy || name.trim().length < 2}>
                  <Plus className="h-3.5 w-3.5" /> {busy ? text("Saving…", "सेव हो रहा है…") : text("Create campaign", "कैंपेन बनाएँ")}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground"><AppText en="Add a business before creating a campaign." hi="कैंपेन बनाने से पहले कारोबार जोड़ें।" /></p>
          )}
          {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
          {notice ? <p role="status" className="mt-3 text-sm text-muted-foreground">{notice}</p> : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold"><AppText en="Your campaigns" hi="आपके कैंपेन" /></h2>
      </div>

      {campaigns.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Send className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold"><AppText en="No campaigns yet" hi="अभी कोई कैंपेन नहीं" /></h3>
            <p className="text-sm text-muted-foreground mt-1"><AppText en="Create a short message for customers who agreed to hear from you." hi="उन ग्राहकों के लिए छोटा संदेश बनाएँ जिन्होंने आपसे संदेश पाने की सहमति दी है।" /></p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{campaign.name}</span>
                    <Badge variant={campaign.status === "ACTIVE" ? "success" : "secondary"}>{campaign.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {campaign.business.name} · {new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium" }).format(new Date(campaign.createdAt))}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>📤 {campaign.sent}</span><span>👁 {campaign.opened}</span><span>⭐ {campaign.reviewed}</span>
                </div>
                <Button size="sm" variant="outline" disabled={!!sendingId} onClick={() => send(campaign)}>
                  <MessageCircle className="h-3.5 w-3.5" /> {sendingId === campaign.id ? text("Sending…", "भेजा जा रहा है…") : text("Send on WhatsApp", "WhatsApp पर भेजें")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

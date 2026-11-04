"use client";

import * as React from "react";
import { toast } from "sonner";
import { Save, SearchCheck } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@/components/admin/ui/controls";
import type { SeoChecklistResult } from "@/lib/seo";
import type { SeoConfig } from "@/lib/settings";

export type SeoRouteRow = { path: string; label: string };

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}</div>;
}

export function SeoForm({ initial, routes, checklist }: { initial: SeoConfig; routes: SeoRouteRow[]; checklist: SeoChecklistResult[] }) {
  const [config, setConfig] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const setValue = (key: keyof SeoConfig, value: SeoConfig[keyof SeoConfig]) => setConfig((prev) => ({ ...prev, [key]: value }));
  const setOrg = (key: keyof SeoConfig["organization"], value: SeoConfig["organization"][typeof key]) => setConfig((prev) => ({ ...prev, organization: { ...prev.organization, [key]: value } }));
  const setVerification = (key: keyof SeoConfig["verification"], value: string) => setConfig((prev) => ({ ...prev, verification: { ...prev.verification, [key]: value } }));
  const setAnalytics = (key: keyof SeoConfig["analytics"], value: string | boolean) => setConfig((prev) => ({ ...prev, analytics: { ...prev.analytics, [key]: value } }));
  const setOverride = (path: string, key: keyof SeoConfig["overrides"][string], value: string | boolean) => setConfig((prev) => {
    const current = prev.overrides[path] || { title: "", description: "", ogImageUrl: "", noindex: false };
    return { ...prev, overrides: { ...prev.overrides, [path]: { ...current, [key]: value } } };
  });

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings/seo", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Save failed");
      toast.success("SEO settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const checks = checklist.flatMap((row) => row.checks);
  const passes = checks.filter((check) => check.status === "pass").length;
  const warnings = checks.length - passes;

  return <div className="space-y-5">
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Site-wide metadata</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Default title template" hint="Use %s for the page title. Keep the rendered title under 60 characters."><Input value={config.defaultTitleTemplate} onChange={(e) => setValue("defaultTitleTemplate", e.target.value)} /></Field>
        <Field label="Default OG image URL"><Input value={config.defaultOgImageUrl} onChange={(e) => setValue("defaultOgImageUrl", e.target.value)} placeholder="/landing/og-1600.webp" /></Field>
        <Field label="Default description (English)" hint="Target 140–160 characters."><Textarea rows={3} value={config.defaultDescriptionEn} onChange={(e) => setValue("defaultDescriptionEn", e.target.value)} /></Field>
        <Field label="Default description (Hindi)" hint="Target 140–160 characters."><Textarea rows={3} value={config.defaultDescriptionHi} onChange={(e) => setValue("defaultDescriptionHi", e.target.value)} /></Field>
        <Field label="Twitter handle"><Input value={config.twitterHandle} onChange={(e) => setValue("twitterHandle", e.target.value)} placeholder="@qr24x7" /></Field>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Organization schema</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Legal name"><Input value={config.organization.legalName} onChange={(e) => setOrg("legalName", e.target.value)} /></Field>
        <Field label="Logo URL"><Input value={config.organization.logoUrl} onChange={(e) => setOrg("logoUrl", e.target.value)} /></Field>
        <Field label="Phone"><Input value={config.organization.phone} onChange={(e) => setOrg("phone", e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={config.organization.email} onChange={(e) => setOrg("email", e.target.value)} /></Field>
        <Field label="City"><Input value={config.organization.addressLocality} onChange={(e) => setOrg("addressLocality", e.target.value)} /></Field>
        <Field label="State"><Input value={config.organization.addressRegion} onChange={(e) => setOrg("addressRegion", e.target.value)} /></Field>
        <Field label="PIN code"><Input value={config.organization.postalCode} onChange={(e) => setOrg("postalCode", e.target.value)} /></Field>
        <Field label="Social profile URLs (one per line)"><Textarea rows={3} value={config.organization.sameAs.join("\n")} onChange={(e) => setOrg("sameAs", e.target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean))} /></Field>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Search verification</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3">
        <Field label="Google Search Console token"><Input value={config.verification.google} onChange={(e) => setVerification("google", e.target.value)} /></Field>
        <Field label="Bing Webmaster token"><Input value={config.verification.bing} onChange={(e) => setVerification("bing", e.target.value)} /></Field>
        <Field label="Yandex token (optional)"><Input value={config.verification.yandex} onChange={(e) => setVerification("yandex", e.target.value)} /></Field>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Analytics</CardTitle></CardHeader><CardContent className="space-y-4">
        <Field label="GA4 Measurement ID"><Input value={config.analytics.ga4MeasurementId} onChange={(e) => setAnalytics("ga4MeasurementId", e.target.value)} placeholder="G-XXXXXXXXXX" /></Field>
        <Field label="Google Tag Manager ID"><Input value={config.analytics.gtmId} onChange={(e) => setAnalytics("gtmId", e.target.value)} placeholder="GTM-XXXXXXX" /></Field>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={config.analytics.respectDnt} onChange={(e) => setAnalytics("respectDnt", e.target.checked)} /><span>Respect browser Do Not Track</span></label>
        <p className="text-xs text-muted-foreground">Analytics loads after interaction on public marketing pages. Do Not Track is ignored by default.</p>
      </CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>Per-page overrides</CardTitle></CardHeader><CardContent>
      <p className="mb-4 text-sm text-muted-foreground">Leave a field blank to use the page’s code default. Overrides apply to each English or Hindi path separately.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm">
        <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-2">Route</th><th className="p-2">Title</th><th className="p-2">Description</th><th className="p-2">OG image URL</th><th className="p-2">Noindex</th></tr></thead>
        <tbody>{routes.map((route) => {
          const value = config.overrides[route.path] || { title: "", description: "", ogImageUrl: "", noindex: false };
          return <tr key={route.path} className="border-b align-top"><th scope="row" className="p-2 font-medium">{route.label}<br /><code className="text-xs text-muted-foreground">{route.path}</code></th>
            <td className="p-2"><Input aria-label={`Title for ${route.path}`} value={value.title} onChange={(e) => setOverride(route.path, "title", e.target.value)} /></td>
            <td className="p-2"><Textarea aria-label={`Description for ${route.path}`} rows={2} value={value.description} onChange={(e) => setOverride(route.path, "description", e.target.value)} /></td>
            <td className="p-2"><Input aria-label={`OG image for ${route.path}`} value={value.ogImageUrl} onChange={(e) => setOverride(route.path, "ogImageUrl", e.target.value)} /></td>
            <td className="p-2 text-center"><input aria-label={`Noindex ${route.path}`} type="checkbox" checked={value.noindex} onChange={(e) => setOverride(route.path, "noindex", e.target.checked)} /></td>
          </tr>;
        })}</tbody>
      </table></div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><SearchCheck className="h-5 w-5" /> SEO checklist</CardTitle></CardHeader><CardContent>
      <p className="mb-3 text-sm">{passes} checks pass · {warnings} need attention</p>
      <div className="max-h-[520px] overflow-auto"><table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-card"><tr className="border-b text-xs text-muted-foreground"><th className="p-2">Page</th><th className="p-2">Check</th><th className="p-2">Result</th></tr></thead>
        <tbody>{checklist.flatMap((row) => row.checks.map((check) => <tr key={`${row.path}-${check.key}`} className="border-b">
          <th scope="row" className="p-2 font-normal">{row.path}</th><td className="p-2">{check.label}</td><td className={`p-2 ${check.status === "pass" ? "text-emerald-700" : "text-amber-700"}`}><strong>{check.status === "pass" ? "Pass" : "Warn"}</strong> · {check.detail}</td>
        </tr>))}</tbody>
      </table></div>
    </CardContent></Card>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2"><a className="text-sm underline" href="/sitemap.xml" target="_blank" rel="noreferrer">View sitemap</a><a className="text-sm underline" href="/robots.txt" target="_blank" rel="noreferrer">View robots.txt</a></div>
      <Button onClick={save} disabled={saving} variant="gradient" size="lg"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save SEO settings"}</Button>
    </div>
  </div>;
}

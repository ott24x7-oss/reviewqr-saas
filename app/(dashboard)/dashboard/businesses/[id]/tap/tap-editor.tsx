"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { tapFontClass } from "@/components/brand/tap-font";
import { LinkRows } from "@/components/dashboard/link-rows";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { directCopy, directTypeAllowed, storedDirectOptions } from "@/lib/tap/direct";
import { presentBusiness } from "@/lib/tap/links";
import { WEEK_DAYS, type WeekHours } from "@/lib/tap/hours";
import type { StoredLink } from "@/lib/tap/presets";

export function TapEditor({
  businessId,
  businessName,
  logo,
  cover,
  description,
  canEdit,
  code,
  publishedAt,
  bio: initialBio,
  bioHi: initialBioHi,
  links: initialLinks,
  hours: initialHours,
  gallery: initialGallery,
  modules,
  limited,
  directMode: initialDirectMode,
  directTarget: initialDirectTarget
}: {
  businessId: string;
  businessName: string;
  logo: string | null;
  cover: string | null;
  description: string;
  canEdit: boolean;
  code: string | null;
  publishedAt: string | null;
  bio: string;
  bioHi: string;
  links: StoredLink[];
  hours: Record<string, { open: string; close: string }>;
  gallery: string[];
  modules: string[];
  limited: boolean;
  directMode: "TAP_PAGE" | "DIRECT";
  directTarget: string;
}) {
  const router = useRouter();
  const [bio, setBio] = React.useState(initialBio);
  const [bioHi, setBioHi] = React.useState(initialBioHi);
  const [links, setLinks] = React.useState(initialLinks);
  const [hours, setHours] = React.useState(initialHours);
  const [galleryText, setGalleryText] = React.useState(initialGallery.join("\n"));
  const [directMode, setDirectMode] = React.useState(initialDirectMode);
  const [directTarget, setDirectTarget] = React.useState(initialDirectTarget);
  const [lang, setLang] = React.useState<"en" | "hi">("en");
  const [busy, setBusy] = React.useState(false);
  const copy = directCopy[lang];
  const directOptions = storedDirectOptions(links, "q", code || "preview").filter((item) => directTypeAllowed(item.type, modules));
  const chosen = directOptions.find((item) => item.key === directTarget) || null;
  const enabledCount = links.filter((item) => item.enabled).length;
  const previewCode = code || "preview";
  const view = presentBusiness(
    {
      name: businessName,
      slug: "preview",
      description,
      logo,
      cover,
      phone: null,
      address: null,
      city: null,
      state: null,
      pincode: null,
      googleReviewUrl: null,
      whatsappNumber: null,
      menuCount: 0,
      published: {
        bio,
        bioHi,
        links,
        hours: hoursPayload(hours),
        gallery: galleryText.split(/\n+/).map((line) => line.trim()).filter(Boolean)
      }
    },
    "q",
    previewCode
  );

  async function save(action: "draft" | "publish") {
    if (directMode === "DIRECT" && !chosen) {
      toast.error(lang === "hi" ? "एक चालू बटन चुनें" : "Choose an enabled button");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/tap`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          bio,
          bioHi,
          links,
          hours: hoursPayload(hours),
          gallery: galleryText.split(/\n+/).map((line) => line.trim()).filter(Boolean),
          directMode,
          directTarget: directMode === "DIRECT" ? directTarget : ""
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save the page");
      toast.success(action === "publish" ? "Page published" : "Draft saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the page");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display">Customer page</h1>
        <p className="text-sm text-muted-foreground">
          {publishedAt ? `Live since ${new Date(publishedAt).toLocaleDateString("en-IN")}` : "Not published yet. Visitors still see the automatic buttons."}
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>{copy.target}</CardTitle>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={lang === "en" ? "default" : "outline"} aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</Button>
            <Button type="button" size="sm" variant={lang === "hi" ? "default" : "outline"} aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>हिंदी</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex min-h-[44px] items-center gap-2 text-sm">
            <input
              id="direct-link"
              type="checkbox"
              checked={directMode === "DIRECT"}
              disabled={!canEdit}
              onChange={(event) => {
                const on = event.target.checked;
                setDirectMode(on ? "DIRECT" : "TAP_PAGE");
                if (on && !directOptions.some((item) => item.key === directTarget) && directOptions[0]) {
                  setDirectTarget(directOptions[0].key);
                }
              }}
            />
            {copy.toggle}
          </label>
          <label className="block space-y-1 text-sm" htmlFor="direct-target">
            <span>{copy.target}</span>
            <select
              id="direct-target"
              aria-label={copy.target}
              className="input min-h-[44px] w-full"
              disabled={!canEdit || directMode !== "DIRECT"}
              value={chosen ? directTarget : ""}
              onChange={(event) => setDirectTarget(event.target.value)}
            >
              <option value="">{lang === "hi" ? "बटन चुनें" : "Choose a button"}</option>
              {directOptions.map((item) => (
                <option key={item.key} value={item.key}>{lang === "hi" ? item.labelHi : item.labelEn}</option>
              ))}
            </select>
          </label>
          {directMode === "DIRECT" && chosen ? (
            <p className="text-sm">{copy.opens(lang === "hi" ? chosen.labelHi : chosen.labelEn)}</p>
          ) : null}
          {limited ? <p className="text-sm text-muted-foreground">{copy.limited}</p> : null}
          {directMode === "TAP_PAGE" && enabledCount === 1 && directOptions.length === 1 ? (
            <p className="text-sm text-muted-foreground">{copy.hint}</p>
          ) : null}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4 items-start">
        <div className={`${tapFontClass} tap-page tap-preview`}>
          <div className="tap-card">
            <h1>{view.name}</h1>
            {view.bio ? <p className="tap-bio">{view.bio}</p> : null}
            <div className="tap-actions">
              {view.links.filter((link) => link.featured || ["menu", "whatsapp_order", "feedback"].includes(link.type)).map((link) => (
                <span key={link.key} className="tap-primary" data-featured={link.featured ? "true" : "false"}>
                  {link.labelEn}
                </span>
              ))}
            </div>
            <ul className="tap-secondary">
              {view.links
                .filter((link) => !link.featured && !["menu", "whatsapp_order", "feedback"].includes(link.type))
                .map((link) => (
                  <li key={link.key}>{link.labelEn}</li>
                ))}
            </ul>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Short bio</Label>
              <Input value={bio} disabled={!canEdit} onChange={(event) => setBio(event.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Bio in Hindi</Label>
              <Input value={bioHi} disabled={!canEdit} onChange={(event) => setBioHi(event.target.value)} />
            </div>
            <LinkRows links={links} onChange={setLinks} canEdit={canEdit} />
            <div>
              <Label className="text-xs">Photo gallery</Label>
              <textarea
                aria-label="Photo URLs"
                className="input min-h-[88px] w-full"
                disabled={!canEdit}
                value={galleryText}
                placeholder="One https image link per line"
                onChange={(event) => setGalleryText(event.target.value)}
              />
            </div>
            <details>
              <summary className="cursor-pointer text-sm font-medium">Opening hours</summary>
              <div className="mt-3 space-y-2">
                {WEEK_DAYS.map((day) => (
                  <div key={day} className="grid grid-cols-[3rem_1fr_1fr] gap-2 items-center">
                    <span className="text-xs uppercase">{day}</span>
                    <Input
                      aria-label={`${day} opens`}
                      type="time"
                      value={hours[day]?.open || ""}
                      disabled={!canEdit}
                      onChange={(event) => setHours({ ...hours, [day]: { open: event.target.value, close: hours[day]?.close || "" } })}
                    />
                    <Input
                      aria-label={`${day} closes`}
                      type="time"
                      value={hours[day]?.close || ""}
                      disabled={!canEdit}
                      onChange={(event) => setHours({ ...hours, [day]: { open: hours[day]?.open || "", close: event.target.value } })}
                    />
                  </div>
                ))}
              </div>
            </details>
            {links.length === 0 && (
              <p className="text-sm text-muted-foreground">Publishing with no buttons hides the automatic call, map, and feedback buttons.</p>
            )}
            {canEdit && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" disabled={busy} onClick={() => save("draft")}>
                  Save draft
                </Button>
                <Button type="button" disabled={busy} onClick={() => save("publish")}>
                  Publish
                </Button>
              </div>
            )}
            {code ? <p className="text-xs text-muted-foreground">Public link /q/{code}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function hoursPayload(hours: Record<string, { open: string; close: string }>): WeekHours {
  const out: WeekHours = {};
  for (const day of WEEK_DAYS) {
    const row = hours[day];
    if (row?.open && row?.close) out[day] = { open: row.open, close: row.close };
  }
  return out;
}

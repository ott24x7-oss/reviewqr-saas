"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { tapFontClass } from "@/components/brand/tap-font";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  THEME_FONTS,
  buildBackground,
  findTheme,
  tokensToStyle,
  type ButtonStyle,
  type ThemePreset
} from "@/lib/tap/themes";

export type PublishedTheme = {
  theme?: string;
  customTokens?: {
    bg?: string;
    ink?: string;
    buttonBg?: string;
    buttonInk?: string;
    font?: string;
    buttons?: ButtonStyle;
    avatar?: "circle" | "rounded" | "square";
    entrance?: "none" | "fade" | "rise";
    radius?: string;
    background?: string;
  } | null;
  seasonal?: { from?: string; to?: string } | null;
};

const BUTTONS: ButtonStyle[] = ["filled", "outline", "soft", "glass", "pill", "square", "raised"];
const RADII = ["999px", "24px", "16px", "12px", "0px"];

export function ThemeEditor({
  businessId,
  businessName,
  logo,
  canEdit,
  paid,
  presets,
  published
}: {
  businessId: string;
  businessName: string;
  logo: string | null;
  canEdit: boolean;
  paid: boolean;
  presets: ThemePreset[];
  published: PublishedTheme;
}) {
  const router = useRouter();
  const custom = published.customTokens || {};
  const initial = findTheme(String(published.theme || "minimal"), presets) || presets[0];
  const [themeId, setThemeId] = React.useState(initial.id);
  const [bg, setBg] = React.useState(custom.bg || initial.tokens.bg);
  const [ink, setInk] = React.useState(custom.ink || initial.tokens.ink);
  const [buttonBg, setButtonBg] = React.useState(custom.buttonBg || initial.tokens.buttonBg);
  const [buttonInk, setButtonInk] = React.useState(custom.buttonInk || initial.tokens.buttonInk);
  const [font, setFont] = React.useState(custom.font || initial.tokens.font);
  const [buttons, setButtons] = React.useState<ButtonStyle>(custom.buttons || initial.tokens.buttons);
  const [avatar, setAvatar] = React.useState(custom.avatar || initial.tokens.avatar);
  const [entrance, setEntrance] = React.useState(custom.entrance || initial.tokens.entrance);
  const [radius, setRadius] = React.useState(custom.radius || initial.tokens.radius);
  const [backgroundType, setBackgroundType] = React.useState("solid");
  const [backgroundTo, setBackgroundTo] = React.useState("#f4efe6");
  const [imageUrl, setImageUrl] = React.useState("");
  const [video, setVideo] = React.useState("");
  const [seasonalFrom, setSeasonalFrom] = React.useState(published.seasonal?.from || "");
  const [seasonalTo, setSeasonalTo] = React.useState(published.seasonal?.to || "");
  const [copyName, setCopyName] = React.useState("Copy");
  const [busy, setBusy] = React.useState(false);

  function saveBody() {
    return {
      action: "save",
      themeId,
      bg,
      ink,
      buttonBg,
      buttonInk,
      font,
      buttons,
      avatar,
      entrance,
      radius,
      backgroundType,
      ...(backgroundType === "gradient" ? { backgroundTo } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(video ? { video } : {}),
      ...(seasonalFrom ? { seasonalFrom } : {}),
      ...(seasonalTo ? { seasonalTo } : {})
    };
  }

  const selected = findTheme(themeId, presets) || presets[0];
  const locked = !!selected.premium && !paid;
  const style = tokensToStyle({
    ...selected.tokens,
    bg,
    ink,
    buttonBg,
    buttonInk,
    font: THEME_FONTS.includes(font as (typeof THEME_FONTS)[number]) ? (font as (typeof THEME_FONTS)[number]) : "Inter",
    buttons,
    avatar,
    entrance,
    radius,
    background: buildBackground({
      type: backgroundType,
      bg,
      to: backgroundTo,
      imageUrl
    })
  });

  function pick(theme: ThemePreset) {
    setThemeId(theme.id);
    setBg(theme.tokens.bg);
    setInk(theme.tokens.ink);
    setButtonBg(theme.tokens.buttonBg);
    setButtonInk(theme.tokens.buttonInk);
    setFont(theme.tokens.font);
    setButtons(theme.tokens.buttons);
    setAvatar(theme.tokens.avatar);
    setEntrance(theme.tokens.entrance);
    setRadius(theme.tokens.radius);
  }

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/theme`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save the theme");
      if (body.action === "reset") {
        pick(presets[0]);
        setSeasonalFrom("");
        setSeasonalTo("");
        setBackgroundType("solid");
        setImageUrl("");
        setVideo("");
      }
      toast.success(body.action === "reset" ? "Theme reset" : "Theme saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the theme");
    } finally {
      setBusy(false);
    }
  }

  async function fromLogo() {
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/theme/palette`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not read the logo");
      setBg(json.bg);
      setInk(json.ink);
      setButtonBg(json.ink);
      setButtonInk(json.bg);
      toast.success("Colours taken from the logo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the logo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display">Page theme</h1>
        <p className="text-sm text-muted-foreground">{businessName}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4 items-start">
        <div className={`${tapFontClass} tap-page tap-preview`} style={style} data-buttons={buttons} data-avatar={avatar} data-entrance={entrance}>
          <div className="tap-card">
            <div className="tap-id">
              <div className="tap-logo" style={{ background: buttonBg }} />
              <h1>{businessName}</h1>
            </div>
            <p className="tap-bio">Your customer page</p>
            <div className="tap-actions">
              <span className="tap-primary">Give Feedback</span>
            </div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Look</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {presets.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => pick(theme)}
                  aria-pressed={theme.id === themeId}
                  className="min-h-11 rounded-full border px-3 py-2 text-left text-xs font-medium"
                  style={{
                    background: theme.tokens.bg,
                    color: theme.tokens.ink,
                    borderColor: theme.id === themeId ? theme.tokens.ink : "transparent"
                  }}
                >
                  {theme.name}
                  {theme.premium ? " · Paid" : ""}
                </button>
              ))}
            </div>
            {locked && (
              <p className="text-sm text-muted-foreground">That theme is for paid plans. The public page stays on Minimal White.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Background" value={bg} onChange={setBg} />
              <ColorField label="Text" value={ink} onChange={setInk} />
              <ColorField label="Button" value={buttonBg} onChange={setButtonBg} />
              <ColorField label="Button text" value={buttonInk} onChange={setButtonInk} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField label="Font" value={font} options={THEME_FONTS} onChange={setFont} />
              <SelectField label="Buttons" value={buttons} options={BUTTONS} onChange={(value) => setButtons(value as ButtonStyle)} />
              <SelectField label="Avatar" value={avatar} options={["circle", "rounded", "square"]} onChange={(value) => setAvatar(value as typeof avatar)} />
              <SelectField label="Entrance" value={entrance} options={["none", "fade", "rise"]} onChange={(value) => setEntrance(value as typeof entrance)} />
              <SelectField label="Radius" value={radius} options={RADII} onChange={setRadius} />
              <SelectField label="Background type" value={backgroundType} options={["solid", "gradient", "image", "pattern", "video"]} onChange={setBackgroundType} />
            </div>
            {backgroundType === "gradient" && <ColorField label="Gradient end" value={backgroundTo} onChange={setBackgroundTo} />}
            {backgroundType === "image" && (
              <Field label="Image URL">
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://" />
              </Field>
            )}
            {backgroundType === "video" && (
              <Field label="Video URL">
                <Input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://" />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Festive from">
                <Input type="date" value={seasonalFrom} onChange={(e) => setSeasonalFrom(e.target.value)} />
              </Field>
              <Field label="Festive to">
                <Input type="date" value={seasonalTo} onChange={(e) => setSeasonalTo(e.target.value)} />
              </Field>
            </div>
            {canEdit && (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button type="button" disabled={busy || locked} onClick={() => post(saveBody())}>
                  Save theme
                </Button>
                <Button type="button" variant="outline" disabled={busy || !logo} onClick={fromLogo}>
                  Pick colours from logo
                </Button>
                <Button type="button" variant="outline" disabled={busy} onClick={() => post({ action: "reset" })}>
                  Reset
                </Button>
              </div>
            )}
            {canEdit && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={copyName} onChange={(e) => setCopyName(e.target.value)} aria-label="Copy name" />
                <Button type="button" variant="outline" disabled={busy} onClick={() => post({ action: "duplicate", duplicateName: copyName })}>
                  Copy saved theme
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input aria-label={label} type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 rounded-lg border" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

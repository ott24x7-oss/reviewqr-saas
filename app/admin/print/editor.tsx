"use client";

import * as React from "react";
import { Button } from "@/components/admin/ui/controls";
import { tapFontClass } from "@/components/brand/tap-font";
import { tapText } from "@/lib/tap/i18n";
import { THEME_PRESETS } from "@/lib/tap/themes";
import { checkQrInk } from "@/lib/print/qr-check";
import { PRINT_TEMPLATES, sheetById, templateById } from "@/lib/print/templates";
import { backLayout, faceLayout, fitQrMm } from "@/lib/print/layout";
import { buildPrintScenes } from "@/lib/print/scene";
import { sceneToSvg } from "@/lib/print/svg";
import { needsRaster } from "@/lib/print/text";
import { isLookupCode } from "@/lib/tap/ids";
import { PRINT_JOB_KEY, readDataUrl, type HindiFont, type PrintJob } from "@/lib/print/job";
import type { EyeStyle, ModuleStyle, PrintRaster } from "@/lib/print/design";
import { absoluteUrl } from "@/lib/utils";

const HEX = /^#[0-9a-fA-F]{6}$/;

const startJob = (): PrintJob => ({
  templateId: "cr80",
  name: "Spice Junction",
  cta: tapText("en", "printCta"),
  ctaHi: tapText("hi", "printCta"),
  hindiFont: "noto",
  background: "#fff7ed",
  backgroundTo: "#ffd7a8",
  foreground: "#3a2016",
  qrDark: "#111111",
  qrDarkTo: "",
  qrLight: "#ffffff",
  module: "rounded",
  eye: "rounded",
  showNfc: true,
  showStars: true,
  qrMm: 28,
  code: "SAMPLECARD01",
  label: "Counter"
});

function fontVariable(kind: HindiFont) {
  return kind === "noto" ? "--font-noto-deva" : "--font-mukta";
}

async function paintLine(text: string, fontCss: string, color: string, widthMm: number, heightMm: number) {
  await document.fonts.load(`600 16px ${fontCss}`);
  const scale = 600 / 25.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(widthMm * scale));
  canvas.height = Math.max(1, Math.round(heightMm * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  let px = heightMm * scale * 0.72;
  ctx.font = `600 ${px}px ${fontCss}`;
  while (px > 10 && ctx.measureText(text).width > canvas.width * 0.98) {
    px *= 0.94;
    ctx.font = `600 ${px}px ${fontCss}`;
  }
  ctx.fillText(text, 0, canvas.height / 2);
  return canvas.toDataURL("image/png");
}

export function PrintEditor({
  mode = "proof",
  businessId,
  businessName
}: {
  mode?: "proof" | "tables";
  businessId?: string;
  businessName?: string;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [job, setJob] = React.useState<PrintJob>(() => ({ ...startJob(), name: businessName || "Spice Junction" }));
  const [copies, setCopies] = React.useState(mode === "tables" ? 4 : 10);
  const [face, setFace] = React.useState<"front" | "back">("front");
  const [preset, setPreset] = React.useState<"exact" | "bleed" | "sheet">("exact");
  const [sheetId, setSheetId] = React.useState("a4");
  const [previewWidth, setPreviewWidth] = React.useState(320);
  const [svgUrl, setSvgUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const template = templateById(job.templateId) || PRINT_TEMPLATES[0];
  const qrMm = fitQrMm(template, job.qrMm);
  const layout = faceLayout(template, qrMm);
  const ink = checkQrInk(
    { dark: job.qrDark, darkTo: HEX.test(job.qrDarkTo) ? job.qrDarkTo : undefined, light: job.qrLight },
    qrMm
  );
  const codeOk = isLookupCode(job.code);
  const canExport = ink.ok && codeOk && HEX.test(job.background) && HEX.test(job.foreground) && HEX.test(job.qrDark) && HEX.test(job.qrLight);

  const scene = React.useMemo(() => {
    if (!codeOk) return null;
    const scenes = buildPrintScenes({
      design: {
        templateId: template.id,
        name: job.name,
        cta: job.cta,
        ctaHi: "",
        backLine: "Tap the other side",
        background: HEX.test(job.background) ? job.background : "#ffffff",
        backgroundTo: HEX.test(job.backgroundTo) ? job.backgroundTo : undefined,
        foreground: HEX.test(job.foreground) ? job.foreground : "#111111",
        qrDark: HEX.test(job.qrDark) ? job.qrDark : "#111111",
        qrDarkTo: HEX.test(job.qrDarkTo) ? job.qrDarkTo : undefined,
        qrLight: HEX.test(job.qrLight) ? job.qrLight : "#ffffff",
        module: job.module,
        eye: job.eye,
        showNfc: job.showNfc,
        showStars: job.showStars,
        logo: readDataUrl(job.logo),
        backgroundImage: readDataUrl(job.backgroundImage),
        rasters: []
      },
      template,
      preset: "exact",
      sheet: null,
      qrMm,
      codes: [{ code: job.code, label: job.label, url: absoluteUrl(`/q/${job.code}?src=qr`) }]
    });
    return scenes[face === "back" && scenes[1] ? 1 : 0] || null;
  }, [job, template, qrMm, codeOk, face]);

  React.useEffect(() => {
    if (!scene) return;
    const url = URL.createObjectURL(new Blob([sceneToSvg(scene)], { type: "image/svg+xml;charset=utf-8" }));
    setSvgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [scene]);

  React.useEffect(() => {
    const node = previewRef.current;
    if (!node) return;
    const watch = new ResizeObserver(() => setPreviewWidth(node.clientWidth));
    watch.observe(node);
    setPreviewWidth(node.clientWidth);
    return () => watch.disconnect();
  }, []);

  function patch(partial: Partial<PrintJob>) {
    setJob((current) => ({ ...current, ...partial }));
  }

  function applyTheme(id: string) {
    const theme = THEME_PRESETS.find((item) => item.id === id);
    if (!theme || !HEX.test(theme.tokens.bg) || !HEX.test(theme.tokens.ink)) return;
    const button = HEX.test(theme.tokens.buttonBg) ? theme.tokens.buttonBg : "#111111";
    patch({ background: theme.tokens.bg, foreground: theme.tokens.ink, qrDark: button, backgroundTo: "", qrDarkTo: "" });
  }

  function fontCss() {
    const name = fontVariable(job.hindiFont);
    const value = rootRef.current ? getComputedStyle(rootRef.current).getPropertyValue(name).trim() : "";
    return value || "sans-serif";
  }

  async function rastersFor(): Promise<Array<PrintRaster & { dataUrl: string }>> {
    const family = fontCss();
    const color = job.foreground;
    const made: Array<PrintRaster & { dataUrl: string }> = [];
    const add = async (id: PrintRaster["id"], text: string, slot: { x: number; y: number; size: number; maxWidth: number }) => {
      const heightMm = slot.size * 1.35;
      const dataUrl = await paintLine(text, family, color, slot.maxWidth, heightMm);
      const bytes = readDataUrl(dataUrl);
      if (!bytes) return;
      made.push({ id, bytes, dataUrl, xMm: slot.x, yMm: slot.y, widthMm: slot.maxWidth, heightMm });
    };
    if (needsRaster(job.name)) {
      await add("name", job.name, layout.name);
      if (template.faces === 2) await add("back-name", job.name, backLayout(template).name);
    }
    if (needsRaster(job.cta)) await add("cta", job.cta, layout.cta);
    if (job.ctaHi.trim()) await add("cta-hi", job.ctaHi, layout.ctaHi);
    return made;
  }

  function payload(rasters: Array<PrintRaster & { dataUrl: string }>) {
    return {
      templateId: template.id,
      preset,
      sheetId,
      name: job.name,
      cta: job.cta,
      ctaHi: job.ctaHi,
      backLine: "Tap the other side",
      background: job.background,
      backgroundTo: HEX.test(job.backgroundTo) ? job.backgroundTo : undefined,
      foreground: job.foreground,
      qrDark: job.qrDark,
      qrDarkTo: HEX.test(job.qrDarkTo) ? job.qrDarkTo : undefined,
      qrLight: job.qrLight,
      module: job.module,
      eye: job.eye,
      showNfc: job.showNfc,
      showStars: job.showStars,
      qrMm,
      logo: job.logo,
      backgroundImage: job.backgroundImage,
      rasters: rasters.map((item) => ({
        id: item.id,
        data: item.dataUrl,
        xMm: item.xMm,
        yMm: item.yMm,
        widthMm: item.widthMm,
        heightMm: item.heightMm
      })),
      codes: [{ code: job.code, label: job.label }]
    };
  }

  async function download(format: "pdf" | "svg" | "zip", bulk = false) {
    setBusy(true);
    setMessage("");
    try {
      const rasters = await rastersFor();
      const endpoint = bulk
        ? mode === "tables"
          ? `/api/businesses/${businessId}/print`
          : "/api/admin/print/batch"
        : "/api/admin/print";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(bulk ? { ...payload(rasters), format, count: copies } : { ...payload(rasters), format })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(typeof data.error === "string" ? data.error : "Export failed");
        return;
      }
      const warning = res.headers.get("x-print-warning");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${template.id}.${format === "svg" && template.faces === 2 ? "zip" : format === "zip" ? "zip" : format}`;
      link.click();
      URL.revokeObjectURL(url);
      if (warning) setMessage(warning);
    } catch {
      setMessage("Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPng() {
    if (!scene || !previewRef.current) return;
    setBusy(true);
    setMessage("");
    try {
      const scale = 300 / 25.4;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(scene.widthMm * scale));
      canvas.height = Math.max(1, Math.round(scene.heightMm * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx || !svgUrl) return;
      const image = new Image();
      image.src = svgUrl;
      await image.decode();
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      if (face === "front" && job.ctaHi.trim()) {
        const family = fontCss();
        await document.fonts.load(`600 16px ${family}`);
        ctx.fillStyle = job.foreground;
        ctx.textBaseline = "top";
        ctx.font = `600 ${layout.ctaHi.size * scale}px ${family}`;
        ctx.fillText(job.ctaHi, layout.ctaHi.x * scale, layout.ctaHi.y * scale, layout.ctaHi.maxWidth * scale);
      }
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${template.id}.png`;
      link.click();
    } catch {
      setMessage("Could not build the PNG");
    } finally {
      setBusy(false);
    }
  }

  function openPrint() {
    try {
      sessionStorage.setItem(PRINT_JOB_KEY, JSON.stringify(job));
      window.open(mode === "tables" ? "/dashboard/print/paper" : "/admin/print/paper", "_blank", "noopener");
    } catch {
      setMessage("Could not open the print view");
    }
  }

  async function onFile(key: "logo" | "backgroundImage", file: File | undefined) {
    if (!file) {
      patch({ [key]: undefined });
      return;
    }
    if (file.size > 1_500_000) {
      setMessage("Image is too large");
      return;
    }
    const data = await file.arrayBuffer();
    const bytes = new Uint8Array(data);
    const png = bytes[0] === 0x89 && bytes[1] === 0x50;
    const jpg = bytes[0] === 0xff && bytes[1] === 0xd8;
    if (!png && !jpg) {
      setMessage("Use a PNG or JPEG image");
      return;
    }
    const blob = new Blob([bytes], { type: png ? "image/png" : "image/jpeg" });
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
    patch({ [key]: dataUrl });
  }

  const px = previewWidth / template.widthMm;
  const hindiFont = fontVariable(job.hindiFont);

  return (
    <div ref={rootRef} className={`${tapFontClass} space-y-4`}>
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{mode === "tables" ? "Print tables" : "Print studio"}</h1>
        <p className="text-sm text-muted-foreground">
          {mode === "tables"
            ? "One design for every table. Each card gets its own code."
            : "Exact size, 3 mm bleed, or a cut sheet. Latin text and the QR stay vector."}
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRINT_TEMPLATES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === template.id}
            className={`min-h-11 shrink-0 rounded-full border px-3 text-sm ${item.id === template.id ? "bg-foreground text-white" : "bg-white"}`}
            onClick={() => {
              setFace("front");
              patch({ templateId: item.id });
            }}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,380px)]">
        <div ref={previewRef} className="order-1 min-w-0 lg:order-2">
          <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border bg-white" style={{ aspectRatio: `${template.widthMm} / ${template.heightMm}` }}>
            {svgUrl ? <img src={svgUrl} alt="" className="h-full w-full" /> : null}
            {face === "front" && needsRaster(job.name) ? (
              <div className="absolute font-semibold leading-tight" style={{ left: layout.name.x * px, top: layout.name.y * px, width: layout.name.maxWidth * px, fontSize: layout.name.size * px, color: job.foreground, fontFamily: `var(${hindiFont})` }}>{job.name}</div>
            ) : null}
            {face === "front" && needsRaster(job.cta) ? (
              <div className="absolute leading-tight" style={{ left: layout.cta.x * px, top: layout.cta.y * px, width: layout.cta.maxWidth * px, fontSize: layout.cta.size * px, color: job.foreground, fontFamily: `var(${hindiFont})` }}>{job.cta}</div>
            ) : null}
            {face === "front" && job.ctaHi.trim() ? (
              <div className="absolute leading-tight" style={{ left: layout.ctaHi.x * px, top: layout.ctaHi.y * px, width: layout.ctaHi.maxWidth * px, fontSize: layout.ctaHi.size * px, color: job.foreground, fontFamily: `var(${hindiFont})` }}>{job.ctaHi}</div>
            ) : null}
          </div>
          {template.faces === 2 ? (
            <div className="mt-2 flex gap-2">
              <button type="button" className="min-h-11 rounded-full border px-3 text-sm" aria-pressed={face === "front"} onClick={() => setFace("front")}>Front</button>
              <button type="button" className="min-h-11 rounded-full border px-3 text-sm" aria-pressed={face === "back"} onClick={() => setFace("back")}>Back</button>
            </div>
          ) : null}
          <div className="mt-3 space-y-1 text-sm" aria-live="polite">
            {!ink.polarityOk ? <p>QR modules must be darker than the light background.</p> : null}
            {!ink.contrastOk ? <p>QR contrast is too low. Use a darker module colour.</p> : null}
            {ink.tooSmall ? <p>This QR prints smaller than 20 mm. It may not scan.</p> : null}
            {!codeOk ? <p>Enter a valid QR code.</p> : null}
            {message ? <p>{message}</p> : null}
          </div>
        </div>
        <form className="order-2 min-w-0 space-y-3 lg:order-1" onSubmit={(event) => event.preventDefault()}>
          <label className="block text-sm font-medium">Business name
            <input className="input mt-1 min-h-11 w-full" value={job.name} onChange={(event) => patch({ name: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">Call to action (English)
            <input className="input mt-1 min-h-11 w-full" value={job.cta} onChange={(event) => patch({ cta: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">Call to action (Hindi)
            <input className="input mt-1 min-h-11 w-full" value={job.ctaHi} onChange={(event) => patch({ ctaHi: event.target.value })} />
          </label>
          <label className="block text-sm font-medium">Hindi font
            <select className="input mt-1 min-h-11 w-full" value={job.hindiFont} onChange={(event) => patch({ hindiFont: event.target.value as HindiFont })}>
              <option value="noto">Noto Sans Devanagari</option>
              <option value="mukta">Mukta</option>
            </select>
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {THEME_PRESETS.map((theme) => (
              <button key={theme.id} type="button" className="min-h-11 shrink-0 rounded-full border bg-white px-3 text-sm" onClick={() => applyTheme(theme.id)}>
                <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: theme.tokens.buttonBg }} />
                {theme.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Colour label="Background" value={job.background} onChange={(background) => patch({ background })} />
            <Colour label="Gradient end" value={job.backgroundTo || "#ffffff"} onChange={(backgroundTo) => patch({ backgroundTo })} />
            <Colour label="Text" value={job.foreground} onChange={(foreground) => patch({ foreground })} />
            <Colour label="QR" value={job.qrDark} onChange={(qrDark) => patch({ qrDark })} />
            <Colour label="QR gradient" value={job.qrDarkTo || job.qrDark} onChange={(qrDarkTo) => patch({ qrDarkTo })} />
            <Colour label="QR ground" value={job.qrLight} onChange={(qrLight) => patch({ qrLight })} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">QR style</legend>
            <Choice
              label="Modules"
              value={job.module}
              options={[["square", "Square"], ["rounded", "Rounded"], ["dots", "Dots"]]}
              onChange={(module) => patch({ module: module as ModuleStyle })}
            />
            <Choice
              label="Eyes"
              value={job.eye}
              options={[["square", "Square"], ["rounded", "Rounded"], ["circle", "Circle"]]}
              onChange={(eye) => patch({ eye: eye as EyeStyle })}
            />
          </fieldset>
          <label className="block text-sm font-medium">QR size (mm)
            <input className="input mt-1 min-h-11 w-full" type="number" min={8} max={120} value={job.qrMm} onChange={(event) => patch({ qrMm: Number(event.target.value) })} />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={job.showNfc} onChange={(event) => patch({ showNfc: event.target.checked })} /> NFC tap mark</label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={job.showStars} onChange={(event) => patch({ showStars: event.target.checked })} /> Review stars</label>
          <label className="block text-sm font-medium">Logo
            <input className="mt-1 block w-full text-sm" type="file" accept="image/png,image/jpeg" onChange={(event) => onFile("logo", event.target.files?.[0])} />
          </label>
          <label className="block text-sm font-medium">Background image
            <input className="mt-1 block w-full text-sm" type="file" accept="image/png,image/jpeg" onChange={(event) => onFile("backgroundImage", event.target.files?.[0])} />
          </label>
          {mode === "proof" ? (
            <label className="block text-sm font-medium">Proof code
              <input className="input mt-1 min-h-11 w-full" value={job.code} onChange={(event) => patch({ code: event.target.value.trim() })} />
            </label>
          ) : null}
          <label className="block text-sm font-medium">Label
            <input className="input mt-1 min-h-11 w-full" value={job.label} onChange={(event) => patch({ label: event.target.value })} />
          </label>
          <fieldset>
            <legend className="text-sm font-medium">Export</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["exact", "bleed", "sheet"] as const).map((item) => (
                <button key={item} type="button" aria-pressed={preset === item} className={`min-h-11 rounded-full border px-3 text-sm ${preset === item ? "bg-foreground text-white" : "bg-white"}`} onClick={() => setPreset(item)}>
                  {item === "exact" ? "Exact size" : item === "bleed" ? "3 mm bleed" : "Sheet"}
                </button>
              ))}
            </div>
          </fieldset>
          {preset === "sheet" ? (
            <label className="block text-sm font-medium">Sheet
              <select className="input mt-1 min-h-11 w-full" value={sheetId} onChange={(event) => setSheetId(event.target.value)}>
                <option value="a4">A4</option>
                <option value="a3">A3</option>
                <option value="sra3">SRA3</option>
                <option value="12x18">12×18 in</option>
              </select>
            </label>
          ) : null}
          <label className="block text-sm font-medium">{mode === "tables" ? "Tables" : "Blank stock"}
            <input className="input mt-1 min-h-11 w-full" type="number" min={1} max={100} value={copies} onChange={(event) => setCopies(Number(event.target.value))} />
          </label>
          {mode === "tables" ? (
            <p className="text-xs text-muted-foreground">Labels run from Table 1. Nothing is saved if this would pass the plan limit.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Blank stock stays unassigned until someone activates it.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {mode === "proof" ? (
              <>
                <Button type="button" className="min-h-11" disabled={!canExport || busy} onClick={() => download("pdf")}>PDF</Button>
                <Button type="button" variant="outline" className="min-h-11" disabled={!canExport || busy} onClick={() => download("svg")}>SVG</Button>
                <Button type="button" variant="outline" className="min-h-11" disabled={!canExport || busy} onClick={() => download("zip")}>ZIP</Button>
              </>
            ) : null}
            <Button type="button" className="min-h-11" disabled={!canExport || busy || !Number.isInteger(copies) || copies < 1 || copies > 100} onClick={() => download("pdf", true)}>
              {mode === "tables" ? "Tables PDF" : "Stock PDF"}
            </Button>
            <Button type="button" variant="outline" className="min-h-11" disabled={!canExport || busy || !Number.isInteger(copies) || copies < 1 || copies > 100} onClick={() => download("zip", true)}>
              {mode === "tables" ? "Tables ZIP" : "Stock ZIP"}
            </Button>
            <Button type="button" variant="outline" className="min-h-11" disabled={!scene || busy} onClick={downloadPng}>PNG 300 DPI</Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={openPrint}>Browser print</Button>
          </div>
          {preset === "sheet" && sheetById(sheetId) ? (
            <p className="text-xs text-muted-foreground">Sheet export places fronts with cut marks. Exact size is one card per page, front then back.</p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function Colour({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium">{label}
      <input className="mt-1 h-11 w-full" type="color" value={HEX.test(value) ? value : "#111111"} aria-label={label} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Choice({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">{label}</span>
      {options.map(([id, name]) => (
        <button key={id} type="button" aria-pressed={value === id} className={`min-h-11 rounded-full border px-3 text-sm ${value === id ? "bg-foreground text-white" : "bg-white"}`} onClick={() => onChange(id)}>
          {name}
        </button>
      ))}
    </div>
  );
}

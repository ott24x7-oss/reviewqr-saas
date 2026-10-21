"use client";

import * as React from "react";
import { tapFontClass } from "@/components/brand/tap-font";
import { buildPrintScenes } from "@/lib/print/scene";
import { sceneToSvg } from "@/lib/print/svg";
import { faceLayout, fitQrMm } from "@/lib/print/layout";
import { templateById } from "@/lib/print/templates";
import { needsRaster } from "@/lib/print/text";
import { PRINT_JOB_KEY, readDataUrl, type PrintJob } from "@/lib/print/job";
import { isLookupCode } from "@/lib/tap/ids";

export default function PrintPaperPage() {
  const [job, setJob] = React.useState<PrintJob | null>(null);
  const [pages, setPages] = React.useState<{ url: string; widthMm: number; heightMm: number }[]>([]);

  React.useEffect(() => {
    const raw = sessionStorage.getItem(PRINT_JOB_KEY);
    if (!raw) return;
    try {
      setJob(JSON.parse(raw) as PrintJob);
    } catch {
      setJob(null);
    }
  }, []);

  React.useEffect(() => {
    if (!job || !isLookupCode(job.code)) return;
    const template = templateById(job.templateId);
    if (!template) return;
    const qrMm = fitQrMm(template, job.qrMm);
    const scenes = buildPrintScenes({
      design: {
        templateId: template.id,
        name: job.name,
        cta: job.cta,
        ctaHi: "",
        backLine: "Tap the other side",
        background: job.background,
        backgroundTo: /^#[0-9a-fA-F]{6}$/.test(job.backgroundTo) ? job.backgroundTo : undefined,
        foreground: job.foreground,
        qrDark: job.qrDark,
        qrDarkTo: /^#[0-9a-fA-F]{6}$/.test(job.qrDarkTo) ? job.qrDarkTo : undefined,
        qrLight: job.qrLight,
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
      codes: [{ code: job.code, label: job.label, url: `https://reviewqr.example/q/${job.code}?src=qr` }]
    });
    const next = scenes.map((scene) => ({
      url: URL.createObjectURL(new Blob([sceneToSvg(scene)], { type: "image/svg+xml;charset=utf-8" })),
      widthMm: scene.widthMm,
      heightMm: scene.heightMm
    }));
    setPages(next);
    return () => next.forEach((page) => URL.revokeObjectURL(page.url));
  }, [job]);

  const template = job ? templateById(job.templateId) : null;
  const qrMm = template && job ? fitQrMm(template, job.qrMm) : 0;
  const layout = template && job ? faceLayout(template, qrMm) : null;
  const pageSize = pages[0];

  return (
    <div className={tapFontClass}>
      {pageSize ? (
        <style>{`
          @page { size: ${pageSize.widthMm}mm ${pageSize.heightMm}mm; margin: 0; }
          @media print {
            header, aside, .print-chrome { display: none !important; }
            main { padding: 0 !important; }
            main > div { padding: 0 !important; max-width: none !important; }
          }
        `}</style>
      ) : null}
      <div className="print-chrome mb-4 space-y-2">
        <p className="text-sm font-medium">Print at 100% / actual size. Turn off headers and footers.</p>
        <button type="button" className="min-h-11 rounded-full bg-foreground px-4 text-sm text-white" onClick={() => window.print()}>Print</button>
      </div>
      {job && layout && template
        ? pages.map((page, index) => (
            <div key={page.url} className="relative bg-white" style={{ width: `${page.widthMm}mm`, height: `${page.heightMm}mm`, breakAfter: "page" }}>
              <img src={page.url} alt="" className="h-full w-full" />
              {index === 0 && needsRaster(job.name) ? (
                <div className="absolute font-semibold leading-tight" style={{ left: `${layout.name.x}mm`, top: `${layout.name.y}mm`, width: `${layout.name.maxWidth}mm`, fontSize: `${layout.name.size}mm`, color: job.foreground, fontFamily: job.hindiFont === "noto" ? "var(--font-noto-deva)" : "var(--font-mukta)" }}>{job.name}</div>
              ) : null}
              {index === 0 && job.ctaHi.trim() ? (
                <div className="absolute leading-tight" style={{ left: `${layout.ctaHi.x}mm`, top: `${layout.ctaHi.y}mm`, width: `${layout.ctaHi.maxWidth}mm`, fontSize: `${layout.ctaHi.size}mm`, color: job.foreground, fontFamily: job.hindiFont === "noto" ? "var(--font-noto-deva)" : "var(--font-mukta)" }}>{job.ctaHi}</div>
              ) : null}
            </div>
          ))
        : <p className="text-sm">Open this page from Print studio.</p>}
    </div>
  );
}

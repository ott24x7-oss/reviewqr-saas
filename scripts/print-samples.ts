import { mkdirSync, writeFileSync } from "fs";
import type { PrintDesign } from "../lib/print/design";
import { exportPrint } from "../lib/print/export";

const design: PrintDesign = {
  templateId: "cr80",
  name: "Spice Junction",
  cta: "Scan or tap to order and review",
  ctaHi: "",
  backLine: "Tap the other side",
  background: "#fff7ed",
  backgroundTo: "#ffd7a8",
  foreground: "#3a2016",
  qrDark: "#111111",
  qrLight: "#ffffff",
  module: "rounded",
  eye: "rounded",
  showNfc: true,
  showStars: true,
  qrMm: 28,
  rasters: []
};

async function main() {
  mkdirSync("docs/print-nfc", { recursive: true });
  const exact = await exportPrint({
    design,
    preset: "exact",
    format: "pdf",
    codes: [{ code: "SAMPLECARD01", label: "Counter" }]
  });
  writeFileSync("docs/print-nfc/cr80-exact.pdf", exact.body);
  const sheet = await exportPrint({
    design,
    preset: "sheet",
    sheetId: "a4",
    format: "pdf",
    codes: Array.from({ length: 10 }, (_, index) => ({
      code: `SAMPLEA4${String(index + 1).padStart(2, "0")}X`,
      label: `Card ${index + 1}`
    }))
  });
  writeFileSync("docs/print-nfc/cr80-a4-10up.pdf", sheet.body);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

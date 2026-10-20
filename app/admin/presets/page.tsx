import { requireAdminPage } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { CODE_PRESETS } from "@/lib/tap/presets";
import { PresetForm } from "./preset-form";

export const dynamic = "force-dynamic";

export default async function AdminPresetsPage() {
  await requireAdminPage();
  const saved = await prisma.industryPreset.findMany({ orderBy: { industry: "asc" } });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Industry presets</h1>
        <p className="text-sm text-muted-foreground">
          A new business copies the saved buttons for its category. Built-in sets are used until you save one.
        </p>
      </div>
      <PresetForm
        code={Object.entries(CODE_PRESETS).map(([industry, links]) => ({ industry, links }))}
        saved={saved.map((row) => ({ industry: row.industry, links: row.links }))}
      />
    </div>
  );
}

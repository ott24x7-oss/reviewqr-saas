import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { planOwner, requireBusinessRole } from "@/lib/tenant";
import { effectiveTier } from "@/lib/payments";
import { readAdminThemes } from "@/lib/tap/theme-store";
import { THEME_PRESETS, type ThemePreset } from "@/lib/tap/themes";
import { ThemeEditor, type PublishedTheme } from "./theme-editor";

export const dynamic = "force-dynamic";

export default async function BusinessThemePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const access = await requireBusinessRole(user.id, params.id, "read");
  if (!access) notFound();
  const owner = await planOwner(user, access.ownerId);
  const [page, extra] = await Promise.all([
    prisma.tapPage.findUnique({ where: { businessId: access.id } }),
    readAdminThemes().catch(() => [] as ThemePreset[])
  ]);
  const published = readPublished(page?.published);

  return (
    <ThemeEditor
      businessId={access.id}
      businessName={access.name}
      logo={access.logo}
      canEdit={access.accessRole !== "STAFF"}
      paid={!!owner && effectiveTier(owner) !== "FREE"}
      presets={[...THEME_PRESETS, ...extra]}
      published={published}
    />
  );
}

function readPublished(value: Prisma.JsonValue | null | undefined): PublishedTheme {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, Prisma.JsonValue>;
  const custom =
    row.customTokens && typeof row.customTokens === "object" && !Array.isArray(row.customTokens)
      ? (row.customTokens as PublishedTheme["customTokens"])
      : null;
  const seasonal =
    row.seasonal && typeof row.seasonal === "object" && !Array.isArray(row.seasonal)
      ? (row.seasonal as Record<string, Prisma.JsonValue>)
      : null;
  return {
    theme: typeof row.theme === "string" ? row.theme : undefined,
    customTokens: custom,
    seasonal: seasonal
      ? {
          from: typeof seasonal.from === "string" ? seasonal.from : undefined,
          to: typeof seasonal.to === "string" ? seasonal.to : undefined
        }
      : null
  };
}

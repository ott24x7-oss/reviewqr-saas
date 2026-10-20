/**
 * Copy stored data-URL images to object storage and rewrite the rows.
 * Manual. Not part of deploy.
 *
 *   npx tsx scripts/migrate-images.ts
 *   npx tsx scripts/migrate-images.ts --dry-run
 */
import "./load-env";
import { PrismaClient } from "@prisma/client";
import { parseDataImage, storageConfigured } from "../lib/images";
import { storeUpload, type ImageVariant } from "../lib/storage";

type Hit = { id: string; value: string };

const prisma = new PrismaClient();

async function migrateField(
  label: string,
  variant: ImageVariant,
  rows: Hit[],
  save: (id: string, url: string) => Promise<void>,
  dryRun: boolean
) {
  let moved = 0;
  let skipped = 0;
  for (const row of rows) {
    const parsed = parseDataImage(row.value);
    if (!parsed) {
      skipped += 1;
      console.warn(`[skip] ${label} ${row.id}: not a base64 data URL`);
      continue;
    }
    if (dryRun) {
      moved += 1;
      console.log(`[dry-run] ${label} ${row.id} (${parsed.bytes.length} bytes)`);
      continue;
    }
    try {
      const stored = await storeUpload({ bytes: parsed.bytes, variant });
      await save(row.id, stored.url);
      moved += 1;
      console.log(`[moved] ${label} ${row.id} -> ${stored.url}`);
    } catch (err) {
      skipped += 1;
      const message = err instanceof Error ? err.message : "failed";
      console.warn(`[skip] ${label} ${row.id}: ${message}`);
    }
  }
  return { moved, skipped };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  if (!storageConfigured()) {
    console.error(
      "Object storage is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and an https S3_PUBLIC_BASE_URL."
    );
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  const totals = { moved: 0, skipped: 0 };
  const add = (result: { moved: number; skipped: number }) => {
    totals.moved += result.moved;
    totals.skipped += result.skipped;
  };

  const businesses = await prisma.business.findMany({
    where: { OR: [{ logo: { startsWith: "data:image" } }, { coverImage: { startsWith: "data:image" } }] },
    select: { id: true, logo: true, coverImage: true }
  });
  add(
    await migrateField(
      "Business.logo",
      "logo",
      businesses
        .filter((row) => row.logo?.startsWith("data:image"))
        .map((row) => ({ id: row.id, value: row.logo! })),
      (id, url) => prisma.business.update({ where: { id }, data: { logo: url } }).then(() => undefined),
      dryRun
    )
  );
  add(
    await migrateField(
      "Business.coverImage",
      "cover",
      businesses
        .filter((row) => row.coverImage?.startsWith("data:image"))
        .map((row) => ({ id: row.id, value: row.coverImage! })),
      (id, url) =>
        prisma.business.update({ where: { id }, data: { coverImage: url } }).then(() => undefined),
      dryRun
    )
  );

  const users = await prisma.user.findMany({
    where: {
      OR: [{ image: { startsWith: "data:image" } }, { whiteLabelLogo: { startsWith: "data:image" } }]
    },
    select: { id: true, image: true, whiteLabelLogo: true }
  });
  add(
    await migrateField(
      "User.image",
      "logo",
      users.filter((row) => row.image?.startsWith("data:image")).map((row) => ({ id: row.id, value: row.image! })),
      (id, url) => prisma.user.update({ where: { id }, data: { image: url } }).then(() => undefined),
      dryRun
    )
  );
  add(
    await migrateField(
      "User.whiteLabelLogo",
      "logo",
      users
        .filter((row) => row.whiteLabelLogo?.startsWith("data:image"))
        .map((row) => ({ id: row.id, value: row.whiteLabelLogo! })),
      (id, url) =>
        prisma.user.update({ where: { id }, data: { whiteLabelLogo: url } }).then(() => undefined),
      dryRun
    )
  );

  const testimonials = await prisma.testimonial.findMany({
    where: { authorImage: { startsWith: "data:image" } },
    select: { id: true, authorImage: true }
  });
  add(
    await migrateField(
      "Testimonial.authorImage",
      "logo",
      testimonials.map((row) => ({ id: row.id, value: row.authorImage! })),
      (id, url) =>
        prisma.testimonial.update({ where: { id }, data: { authorImage: url } }).then(() => undefined),
      dryRun
    )
  );

  const branding = await prisma.platformBranding.findMany({
    where: { logoDataUrl: { startsWith: "data:image" } },
    select: { id: true, logoDataUrl: true }
  });
  add(
    await migrateField(
      "PlatformBranding.logoDataUrl",
      "logo",
      branding.map((row) => ({ id: row.id, value: row.logoDataUrl })),
      (id, url) =>
        prisma.platformBranding.update({ where: { id }, data: { logoDataUrl: url } }).then(() => undefined),
      dryRun
    )
  );

  const site = await prisma.appSetting.findUnique({ where: { key: "site" } });
  if (site) {
    let json: { logoUrl?: unknown } = {};
    try {
      json = JSON.parse(site.value);
    } catch {
      json = {};
    }
    if (typeof json.logoUrl === "string" && json.logoUrl.startsWith("data:image")) {
      add(
        await migrateField(
          "AppSetting.site.logoUrl",
          "logo",
          [{ id: "site", value: json.logoUrl }],
          async (_id, url) => {
            json.logoUrl = url;
            await prisma.appSetting.update({
              where: { key: "site" },
              data: { value: JSON.stringify(json) }
            });
          },
          dryRun
        )
      );
    }
  }

  console.log(
    `${dryRun ? "Would move" : "Moved"} ${totals.moved} image(s). Skipped ${totals.skipped}.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

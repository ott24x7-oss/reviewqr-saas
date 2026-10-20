/**
 * Pre-deploy migrations.
 *
 * Databases created earlier with `prisma db push` have the tables but no
 * migration history. On those, mark the baseline (and the platform-branding
 * migration that db push already applied) as applied once, then run
 * `prisma migrate deploy`. Fresh databases skip straight to migrate deploy.
 * Safe to run on every deploy.
 */
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const ALREADY_PUSHED = ["20260426000000_baseline", "20260427000000_platform_branding"];

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

async function readState(prisma) {
  try {
    const [state] = await prisma.$queryRawUnsafe(
      `SELECT to_regclass('public."User"')::text AS users, to_regclass('public."_prisma_migrations"')::text AS history`
    );
    return state;
  } catch (e) {
    // Database not created yet: nothing to baseline, migrate deploy creates it.
    console.log(`Skipping baseline check: ${String(e.message).trim().split("\n").pop()}`);
    return { users: null, history: null };
  }
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const state = await readState(prisma);
    if (state.users) {
      for (const name of ALREADY_PUSHED) {
        let recorded = false;
        if (state.history) {
          const rows = await prisma.$queryRawUnsafe(
            `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL`,
            name
          );
          recorded = rows.length > 0;
        }
        if (!recorded) run(`npx prisma migrate resolve --applied ${name}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
  run("npx prisma migrate deploy");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

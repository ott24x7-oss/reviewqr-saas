/**
 * Admin-only seed (no demo data). Useful for production deploys
 * where you only want to create the super admin.
 *
 * Run with: npm run seed:admin
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("❌ Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    process.exit(1);
  }
  if (PASSWORD.length < 8) {
    console.error("❌ Admin password must be at least 8 characters.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      name: "Super Admin",
      password: hash,
      role: "ADMIN",
      subscriptionTier: "AGENCY",
      subscriptionStatus: "ACTIVE",
      subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    },
    update: { password: hash, role: "ADMIN" }
  });
  console.log(`✅ Admin ready: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error("❌", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

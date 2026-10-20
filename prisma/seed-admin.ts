/**
 * Admin-only seed (no demo data). Creates the super admin once.
 * Later runs do not change the password or the role.
 *
 * Run with: npm run seed:admin
 * Requires ADMIN_EMAIL and ADMIN_PASSWORD. There is no default password.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim() ?? "";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "";

async function main() {
  if (!EMAIL || !EMAIL.includes("@")) {
    console.error("ADMIN_EMAIL is required (a real email address).");
    process.exit(1);
  }
  if (PASSWORD.length < 8) {
    console.error("ADMIN_PASSWORD is required and must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.log(`Admin already exists: ${existing.email} (password unchanged)`);
    return;
  }

  const hash = await bcrypt.hash(PASSWORD, 12);
  const admin = await prisma.user.create({
    data: {
      email: EMAIL,
      name: "Super Admin",
      password: hash,
      role: "ADMIN",
      subscriptionTier: "AGENCY",
      subscriptionStatus: "ACTIVE",
      subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
  });
  console.log(`Admin created: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

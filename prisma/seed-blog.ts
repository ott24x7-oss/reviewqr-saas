import { PrismaClient } from "@prisma/client";
import { addStarterGuides } from "../lib/blog/starter-guides";

const prisma = new PrismaClient();

async function main() {
  const created = await addStarterGuides(prisma);
  console.log(`Created ${created} starter guide drafts; existing posts were left untouched.`);
}

main().finally(() => prisma.$disconnect());
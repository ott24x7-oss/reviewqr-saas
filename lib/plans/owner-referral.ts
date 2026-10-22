import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { makeCode } from "./codes";

export async function ensureOwnerReferral(userId: string) {
  const existing = await prisma.ownerReferral.findUnique({ where: { userId } });
  if (existing) return existing;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await prisma.ownerReferral.create({ data: { userId, code: makeCode(8) } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return prisma.ownerReferral.findUniqueOrThrow({ where: { userId } });
}

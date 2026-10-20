import { prisma } from "@/lib/db";

/** First write wins. Later calls for the same owner and kind do not move the timestamp. */
export async function markOnboarding(userId: string, kind: string) {
  await prisma.onboardingMark
    .upsert({
      where: { userId_kind: { userId, kind } },
      create: { userId, kind },
      update: {}
    })
    .catch(() => {});
}

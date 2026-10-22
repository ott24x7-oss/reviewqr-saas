import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Error, v1From } from "@/lib/api/v1";
import { prisma } from "@/lib/db";
import { finishOnboarding } from "@/lib/onboarding/finish";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      id: true,
      email: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionEndsAt: true
    }
  });
  if (!user) return v1Error(401, "UNAUTHORIZED", "Sign in required");
  return v1From(await finishOnboarding(user));
}

export const POST = observe(postHandler);

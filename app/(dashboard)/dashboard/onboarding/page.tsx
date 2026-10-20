import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingWizard } from "./wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/onboarding");

  const business = await prisma.business.findFirst({
    where: { ownerId: user.id, archived: false },
    select: { id: true, name: true, industry: true, whatsappNumber: true, googleReviewUrl: true },
    orderBy: { createdAt: "asc" }
  });

  return (
    <div className="mx-auto max-w-xl">
      <OnboardingWizard
        existing={
          business
            ? {
                id: business.id,
                name: business.name,
                industry: business.industry,
                whatsappNumber: business.whatsappNumber,
                googleReviewUrl: business.googleReviewUrl
              }
            : null
        }
      />
    </div>
  );
}

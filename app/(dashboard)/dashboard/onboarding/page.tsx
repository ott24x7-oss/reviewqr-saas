import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { placesEnabled, supportWhatsAppLink } from "@/lib/places";
import { OnboardingWizard } from "./wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/onboarding");

  const owned = await prisma.business.count({ where: { ownerId: user.id, archived: false } });
  if (owned > 0) redirect("/dashboard");

  return (
    <div className="max-w-xl mx-auto">
      <OnboardingWizard placesEnabled={placesEnabled()} orderHref={supportWhatsAppLink("my business")} />
    </div>
  );
}

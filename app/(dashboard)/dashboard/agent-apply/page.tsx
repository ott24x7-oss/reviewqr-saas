import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import { getCurrentUser } from "@/lib/auth";
import { ResellerApplicationForm } from "./application-form";

export const dynamic = "force-dynamic";

export default async function ResellerApplicationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/agent-apply");
  if (user.role === "AGENT") redirect("/dashboard/agent");
  return <div className="mx-auto max-w-3xl space-y-5">
    <PageHeader
      title={<AppText en="Become a reseller" hi="रीसेलर बनें" />}
      description={<AppText en="Apply to work with QR24x7 and earn commission on eligible paid sales." hi="QR24x7 के साथ काम करने और योग्य भुगतान वाली बिक्री पर कमीशन कमाने के लिए आवेदन करें।" />}
    />
    <ResellerApplicationForm initialName={user.name || ""} initialPhone={user.phone || ""} />
  </div>;
}

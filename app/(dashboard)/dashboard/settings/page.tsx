import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Settings</h1>
        <p className="text-sm text-muted-foreground">Account, notifications, and white-label</p>
      </div>

      <SettingsForm
        user={{
          id: user.id,
          name: user.name || "",
          email: user.email,
          phone: user.phone || "",
          whiteLabelEnabled: user.whiteLabelEnabled,
          whiteLabelName: user.whiteLabelName || "",
          whiteLabelDomain: user.whiteLabelDomain || "",
          whiteLabelColor: user.whiteLabelColor || "#1a73e8",
          tier: user.subscriptionTier
        }}
      />
    </div>
  );
}

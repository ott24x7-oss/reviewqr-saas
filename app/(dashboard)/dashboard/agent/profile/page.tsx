import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadAgentProfile } from "@/lib/plans/agent-team";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function AgentProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await loadAgentProfile(user.id);
  if (!profile.ok) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">{profile.error}</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Profile</h1>
      <p className="text-sm text-muted-foreground">A payout needs a PAN and either a UPI ID or a bank account. The PAN is stored encrypted and shown as the last 4 characters.</p>
      <ProfileForm initial={profile.data} />
    </div>
  );
}

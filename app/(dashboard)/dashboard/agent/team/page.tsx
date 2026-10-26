import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { generateQrDataUrl } from "@/lib/qr";
import { loadAgentTeam } from "@/lib/plans/agent-team";
import { TeamPanel } from "./team-panel";

export const dynamic = "force-dynamic";

export default async function AgentTeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const team = await loadAgentTeam(user.id);
  if (!team.ok) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold">Team</h1>
        <p className="mt-2 text-sm text-muted-foreground">{team.error}</p>
      </div>
    );
  }
  const qr = team.data.inviteLink ? await generateQrDataUrl(team.data.inviteLink, { size: 280 }) : "";
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Team</h1>
      <TeamPanel team={team.data} qr={qr} />
    </div>
  );
}

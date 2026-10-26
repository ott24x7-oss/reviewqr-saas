import { prisma } from "@/lib/db";
import { agentLeaderboard, loadTeamAdmin } from "@/lib/plans/admin-team";
import { formatINR } from "@/lib/utils";
import { AgentsBoard } from "./agents-board";
import { TeamDesk } from "./team-desk";
import { TeamSettingsForm } from "./team-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage({ searchParams }: { searchParams?: { month?: string } }) {
  const [agents, rules, plans, team, board] = await Promise.all([
    prisma.agentProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, phone: true, email: true } } }
    }),
    prisma.commissionRule.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true } }),
    loadTeamAdmin(),
    agentLeaderboard(searchParams?.month || null)
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Agents</h1>
        <p className="text-sm text-muted-foreground">
          An agent signs in with WhatsApp OTP. Their link is /join/code. The first attribution wins unless you reassign it here.
        </p>
      </div>
      <AgentsBoard
        agents={agents.map((agent) => ({
          id: agent.id,
          userId: agent.userId,
          name: agent.user.name || "Agent",
          phone: agent.user.phone || "",
          email: agent.user.email,
          upiId: agent.upiId,
          city: agent.city,
          active: agent.active,
          code: agent.code
        }))}
        rules={rules.map((rule) => ({
          id: rule.id,
          agentId: rule.agentId,
          planId: rule.planId,
          hardware: rule.hardware,
          firstPercent: rule.firstPercent,
          renewalPercent: rule.renewalPercent,
          renewalMonths: rule.renewalMonths,
          active: rule.active
        }))}
        plans={plans}
      />
      <TeamSettingsForm initial={team.settings} />
      <TeamDesk agents={team.agents} settings={team.settings} />
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Leaderboard</h2>
        <form className="flex flex-wrap items-end gap-2" action="/admin/agents">
          <div>
            <label className="text-sm font-medium" htmlFor="board-month">
              Month
            </label>
            <input id="board-month" className="flex h-10 rounded-md border bg-background px-3 text-sm" name="month" type="month" defaultValue={board.label} />
          </div>
          <button className="inline-flex h-10 items-center rounded-md border px-3 text-sm" type="submit">
            Show month
          </button>
        </form>
        <ol className="space-y-2">
          {board.rows.length === 0 ? <li className="text-sm text-muted-foreground">No commission this month.</li> : null}
          {board.rows.map((row, index) => (
            <li key={row.agentId} className="flex justify-between rounded-xl border px-3 py-2 text-sm">
              <span>
                {index + 1}. {row.name}
              </span>
              <span>{formatINR(row.amountPaise)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

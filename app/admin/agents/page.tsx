import { prisma } from "@/lib/db";
import { AgentsBoard } from "./agents-board";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  const [agents, rules, plans] = await Promise.all([
    prisma.agentProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, phone: true, email: true } } }
    }),
    prisma.commissionRule.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameEn: true } })
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
    </div>
  );
}

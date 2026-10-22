"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AgentRow = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  upiId: string;
  city: string;
  active: boolean;
  code: string;
};

export type RuleRow = {
  id: string;
  agentId: string | null;
  planId: string | null;
  hardware: boolean;
  firstPercent: number;
  renewalPercent: number;
  renewalMonths: number | null;
  active: boolean;
};

export function AgentsBoard({
  agents,
  rules,
  plans
}: {
  agents: AgentRow[];
  rules: RuleRow[];
  plans: Array<{ id: string; nameEn: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState({ name: "", phone: "", email: "", upiId: "", city: "" });
  const [businessId, setBusinessId] = React.useState("");
  const [agentUserId, setAgentUserId] = React.useState(agents[0]?.userId || "");
  const [rule, setRule] = React.useState({
    agentId: "",
    planId: "",
    hardware: false,
    firstPercent: 10,
    renewalPercent: 5,
    renewalMonths: "" as string,
    active: true
  });

  async function createAgent(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/admin/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Could not create the agent");
      return;
    }
    toast.success(`Agent code ${json.code}`);
    setForm({ name: "", phone: "", email: "", upiId: "", city: "" });
    router.refresh();
  }

  async function toggle(agent: AgentRow) {
    const res = await fetch(`/api/admin/agents/${agent.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "update", active: !agent.active })
    });
    if (!res.ok) toast.error("Could not update the agent");
    else router.refresh();
  }

  async function reassign(event: React.FormEvent) {
    event.preventDefault();
    const agent = agents.find((row) => row.userId === agentUserId);
    if (!agent) return;
    const res = await fetch(`/api/admin/agents/${agent.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reassign", businessId, agentUserId })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(json.error || "Could not reassign");
    else {
      toast.success("Business reassigned");
      setBusinessId("");
      router.refresh();
    }
  }

  async function saveRule(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/admin/commission-rules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agentId: rule.agentId || null,
        planId: rule.planId || null,
        hardware: rule.hardware,
        firstBasis: "PERCENT",
        firstPercent: rule.firstPercent,
        firstFlatPaise: 0,
        renewalBasis: "PERCENT",
        renewalPercent: rule.renewalPercent,
        renewalFlatPaise: 0,
        renewalMonths: rule.renewalMonths === "" ? null : Number(rule.renewalMonths),
        active: rule.active
      })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(json.error || "Could not save the rule");
    else {
      toast.success("Commission rule saved");
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={createAgent} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 font-display text-xl font-bold">New agent</h2>
        <div>
          <Label htmlFor="agent-name">Name</Label>
          <Input id="agent-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </div>
        <div>
          <Label htmlFor="agent-phone">Phone</Label>
          <Input id="agent-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
        </div>
        <div>
          <Label htmlFor="agent-email">Email</Label>
          <Input id="agent-email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </div>
        <div>
          <Label htmlFor="agent-upi">UPI ID</Label>
          <Input id="agent-upi" value={form.upiId} onChange={(event) => setForm({ ...form, upiId: event.target.value })} />
        </div>
        <div>
          <Label htmlFor="agent-city">City</Label>
          <Input id="agent-city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
        </div>
        <div className="flex items-end">
          <Button type="submit">Create agent</Button>
        </div>
      </form>

      <ul className="space-y-2">
        {agents.map((agent) => (
          <li key={agent.id} className="rounded-xl border p-3">
            <p className="font-medium">
              {agent.name} <span className="text-sm text-muted-foreground">{agent.active ? "" : "· inactive"}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {agent.phone} · {agent.city || "No city"} · UPI {agent.upiId || "—"} · code {agent.code}
            </p>
            <p className="text-sm">Link: /join/{agent.code}</p>
            <Button type="button" variant="outline" className="mt-2" onClick={() => void toggle(agent)}>
              {agent.active ? "Deactivate" : "Activate"}
            </Button>
          </li>
        ))}
      </ul>

      <form onSubmit={reassign} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
        <h2 className="sm:col-span-3 font-display text-xl font-bold">Reassign a business</h2>
        <div>
          <Label htmlFor="business-id">Business id</Label>
          <Input id="business-id" value={businessId} onChange={(event) => setBusinessId(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="agent-pick">Agent</Label>
          <select id="agent-pick" className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm" value={agentUserId} onChange={(event) => setAgentUserId(event.target.value)}>
            {agents.map((agent) => (
              <option key={agent.userId} value={agent.userId}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit">Reassign</Button>
        </div>
      </form>

      <form onSubmit={saveRule} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <h2 className="sm:col-span-2 font-display text-xl font-bold">Commission rule</h2>
        <p className="sm:col-span-2 text-sm text-muted-foreground">
          A plan rule beats an agent rule, which beats the default. Leave agent and plan empty for the default. Hardware uses the first-sale percent.
        </p>
        <div>
          <Label htmlFor="rule-agent">Agent override</Label>
          <select id="rule-agent" className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm" value={rule.agentId} onChange={(event) => setRule({ ...rule, agentId: event.target.value })}>
            <option value="">All agents</option>
            {agents.map((agent) => (
              <option key={agent.userId} value={agent.userId}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="rule-plan">Plan override</Label>
          <select id="rule-plan" className="mt-1 h-10 w-full rounded-md border bg-background px-2 text-sm" value={rule.planId} onChange={(event) => setRule({ ...rule, planId: event.target.value })}>
            <option value="">All plans</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.nameEn}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={rule.hardware} onChange={(event) => setRule({ ...rule, hardware: event.target.checked })} />
          Hardware (QR / NFC stand)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={rule.active} onChange={(event) => setRule({ ...rule, active: event.target.checked })} />
          Active
        </label>
        <div>
          <Label htmlFor="first-percent">First sale %</Label>
          <Input id="first-percent" type="number" min={0} max={100} value={rule.firstPercent} onChange={(event) => setRule({ ...rule, firstPercent: Number(event.target.value) })} />
        </div>
        <div>
          <Label htmlFor="renew-percent">Renewal %</Label>
          <Input id="renew-percent" type="number" min={0} max={100} value={rule.renewalPercent} onChange={(event) => setRule({ ...rule, renewalPercent: Number(event.target.value) })} />
        </div>
        <div>
          <Label htmlFor="renew-months">Renewal months (blank = forever)</Label>
          <Input id="renew-months" value={rule.renewalMonths} onChange={(event) => setRule({ ...rule, renewalMonths: event.target.value })} />
        </div>
        <div className="flex items-end">
          <Button type="submit">Save rule</Button>
        </div>
        <ul className="sm:col-span-2 space-y-1 text-sm">
          {rules.map((row) => (
            <li key={row.id}>
              {row.hardware ? "Hardware" : "Plan"} · agent {row.agentId || "default"} · plan {row.planId || "all"} · first {row.firstPercent}% · renewal {row.renewalPercent}%
              {row.renewalMonths == null ? " forever" : ` for ${row.renewalMonths} months`}
              {row.active ? "" : " · off"}
            </li>
          ))}
        </ul>
      </form>
    </div>
  );
}

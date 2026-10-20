"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Member = { id: string; role: string; email: string; name: string | null };
type Invite = { id: string; email: string; role: string };

export function TeamPanel({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"MANAGER" | "STAFF">("STAFF");
  const [members, setMembers] = React.useState<Member[]>([]);
  const [invites, setInvites] = React.useState<Invite[]>([]);
  const [busy, setBusy] = React.useState(false);

  async function load() {
    const res = await fetch(`/api/businesses/${businessId}/members`);
    if (!res.ok) return;
    const json = await res.json();
    setMembers(json.members || []);
    setInvites(json.invites || []);
  }

  React.useEffect(() => {
    let active = true;
    fetch(`/api/businesses/${businessId}/members`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json) return;
        setMembers(json.members || []);
        setInvites(json.invites || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [businessId]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Invite failed");
      setEmail("");
      toast.success("Invite sent");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(memberId: string) {
    const res = await fetch(`/api/businesses/${businessId}/members?memberId=${memberId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      toast.error("Could not remove that person");
      return;
    }
    router.refresh();
    await load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={invite} className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            required
            placeholder="teammate@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "MANAGER" | "STAFF")}
            className="h-10 rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="STAFF">Staff — read feedback</option>
            <option value="MANAGER">Manager — edit this business</option>
          </select>
          <Button type="submit" disabled={busy}>
            Invite
          </Button>
        </form>
        <ul className="space-y-2 text-sm">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-2">
              <span>
                {member.email} · {member.role.toLowerCase()}
              </span>
              <button type="button" className="text-xs underline" onClick={() => remove(member.id)}>
                Remove
              </button>
            </li>
          ))}
          {invites.map((invite) => (
            <li key={invite.id} className="text-muted-foreground">
              Pending {invite.email} · {invite.role.toLowerCase()}
            </li>
          ))}
          {members.length === 0 && invites.length === 0 && (
            <li className="text-muted-foreground">No teammates yet.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

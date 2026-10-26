"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/utils";
import type { AgentTeam } from "@reviewqr/shared";

export function TeamPanel({ team, qr }: { team: AgentTeam; qr: string }) {
  const router = useRouter();
  const [phone, setPhone] = React.useState("");
  const [shares, setShares] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(team.members.map((member) => [member.id, member.sharePercent == null ? "" : String(member.sharePercent)]))
  );

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/v1/agent/team/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(phone.trim() ? { phone: phone.trim() } : {})
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error?.message || "Could not create the invite");
      return;
    }
    toast.success(phone.trim() ? "Invite sent" : "Invite link ready");
    setPhone("");
    router.refresh();
  }

  async function saveShare(memberId: string) {
    const res = await fetch(`/api/v1/agent/team/${memberId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sharePercent: Number(shares[memberId]) })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(json.error?.message || "Could not save the share");
    else {
      toast.success("Share saved for future sales");
      router.refresh();
    }
  }

  async function setStatus(memberId: string, action: "pause" | "resume") {
    const res = await fetch(`/api/v1/agent/team/${memberId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(json.error?.message || "Could not update the member");
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border p-4">
        <h2 className="font-display text-xl font-bold">Invite</h2>
        <p className="mt-1 text-sm text-muted-foreground">There is no joining fee. A member earns only from real sales.</p>
        {team.canRecruit && team.inviteLink ? (
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            {qr ? <img src={qr} alt="Invite QR" className="h-40 w-40" /> : null}
            <div className="min-w-0">
              <p className="break-all text-sm">{team.inviteLink}</p>
              <Button
                type="button"
                className="mt-2"
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(team.inviteLink).then(() => toast.success("Link copied"))}
              >
                Copy link
              </Button>
            </div>
          </div>
        ) : null}
        {team.canRecruit ? (
          <form onSubmit={invite} className="mt-4 flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="invite-phone">WhatsApp number (optional)</Label>
              <Input id="invite-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="10-digit mobile" />
            </div>
            <Button type="submit">{team.inviteLink ? "New invite" : "Create invite link"}</Button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Your team is at the depth limit, so new invites are closed.</p>
        )}
      </section>
      <section>
        <h2 className="font-display text-xl font-bold">Members</h2>
        <ul className="mt-3 space-y-3">
          {team.members.length === 0 ? <li className="text-sm text-muted-foreground">No members yet.</li> : null}
          {team.members.map((member) => (
            <li key={member.id} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/dashboard/agent/team/${member.id}`} className="font-medium underline">
                  {member.name}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {member.phoneMasked} · {member.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                This month {formatINR(member.monthSalesPaise)} sales commission · your override {formatINR(member.monthOverridePaise)} · {member.businesses} businesses
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div>
                  <Label htmlFor={`share-${member.id}`}>
                    Share % ({team.minSharePercent}–{team.maxSharePercent})
                  </Label>
                  <Input
                    id={`share-${member.id}`}
                    type="number"
                    min={team.minSharePercent}
                    max={team.maxSharePercent}
                    value={shares[member.id] ?? ""}
                    onChange={(event) => setShares({ ...shares, [member.id]: event.target.value })}
                  />
                </div>
                <Button type="button" onClick={() => void saveShare(member.id)}>
                  Save share
                </Button>
                {member.status === "ACTIVE" ? (
                  <Button type="button" variant="outline" onClick={() => void setStatus(member.id, "pause")}>
                    Pause
                  </Button>
                ) : null}
                {member.status === "PAUSED" ? (
                  <Button type="button" variant="outline" onClick={() => void setStatus(member.id, "resume")}>
                    Resume
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

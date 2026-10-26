"use client";

import { useState } from "react";
import { toast } from "sonner";
import { StepUpDialog } from "@/components/admin/ui/dialogs";
import { Button } from "@/components/ui/button";

type DeviceRow = {
  id: string;
  name: string;
  platform: string;
  status: "PENDING" | "ACTIVE" | "REVOKED";
  lastSeenAt: string | null;
  adminName: string;
};

export function AdminDevices({ initial }: { initial: DeviceRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [stepFor, setStepFor] = useState<string | null>(null);

  async function post(action: "approve" | "revoke" | "signout", deviceId?: string) {
    setBusy(deviceId || action);
    try {
      const res = await fetch("/api/admin/devices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, deviceId })
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; devices?: DeviceRow[]; stepUp?: string };
      if (res.status === 403 && json.stepUp === "approve_device" && deviceId) {
        setStepFor(deviceId);
        return;
      }
      if (!res.ok) throw new Error(json.error || "Could not update the device");
      if (json.devices) setRows(json.devices);
      if (action === "signout") toast.success("Signed out every admin device");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the device");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Admin devices</h2>
          <p className="text-sm text-muted-foreground">A new phone stays pending until you approve it.</p>
        </div>
        <Button type="button" variant="outline" disabled={busy === "signout"} onClick={() => post("signout")}>
          Sign out all admin devices
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="px-4 py-2 font-medium">Phone</th>
            <th className="px-4 py-2 font-medium">Admin</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="border-t">
              <td className="px-4 py-3 text-muted-foreground" colSpan={4}>
                No admin phones yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-2">
                  {row.name}
                  <div className="text-xs text-muted-foreground">{row.platform}</div>
                </td>
                <td className="px-4 py-2">{row.adminName}</td>
                <td className="px-4 py-2">{row.status}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    {row.status === "PENDING" ? (
                      <Button type="button" size="sm" disabled={busy === row.id} onClick={() => post("approve", row.id)}>
                        Approve
                      </Button>
                    ) : null}
                    {row.status !== "REVOKED" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy === row.id}
                        onClick={() => post("revoke", row.id)}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <StepUpDialog
        open={!!stepFor}
        title="Confirm device approval"
        action="approve_device"
        onClose={() => setStepFor(null)}
        onConfirmed={async () => {
          if (stepFor) await post("approve", stepFor);
        }}
      />
    </div>
  );
}

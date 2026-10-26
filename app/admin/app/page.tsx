import { adminDeviceRows } from "@/lib/admin/devices";
import { appFunnel } from "@/lib/app/funnel";
import { getAppReleaseConfig } from "@/lib/settings";
import { AppReleaseForm } from "./app-form";
import { AdminDevices } from "./devices";

export const dynamic = "force-dynamic";

export default async function AdminAppPage() {
  const [release, funnel, devices] = await Promise.all([getAppReleaseConfig(), appFunnel(), adminDeviceRows()]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Android app</h1>
        <p className="text-sm text-muted-foreground">
          Play in-app updates. A build below the minimum is immediate. Other updates are flexible.
        </p>
      </div>
      <AppReleaseForm initial={release} />
      <AdminDevices initial={devices} />
      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-display text-lg font-semibold">Funnel, last 30 days</h2>
          <p className="text-sm text-muted-foreground">Counts of devices. No phone, email, or account id is stored.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">Event</th>
              <th className="px-4 py-2 font-medium">Events</th>
              <th className="px-4 py-2 font-medium">Devices</th>
            </tr>
          </thead>
          <tbody>
            {funnel.map((row) => (
              <tr key={row.name} className="border-t">
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2">{row.events}</td>
                <td className="px-4 py-2">{row.installs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

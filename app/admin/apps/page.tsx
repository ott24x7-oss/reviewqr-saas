import { PageHeader } from "@/components/admin/ui/primitives";
import { adminDeviceRows } from "@/lib/admin/devices";
import { appFunnel } from "@/lib/app/funnel";
import { getAppReleaseConfig } from "@/lib/settings";
import { AppReleaseForm } from "../app/app-form";
import { AdminDevices } from "../app/devices";

export const dynamic = "force-dynamic";

export default async function AdminAppsPage() {
  const [release, funnel, devices] = await Promise.all([getAppReleaseConfig(), appFunnel(), adminDeviceRows()]);
  return (
    <div className="space-y-5">
      <PageHeader title="Apps & devices" subtitle="Play in-app updates and the phones allowed to call the admin API." />
      <AppReleaseForm initial={release} />
      <AdminDevices initial={devices} />
      <div className="rounded-[14px] border border-zinc-200 dark:border-zinc-800">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Funnel, last 30 days</h2>
          <p className="text-sm text-zinc-500">Counts of devices. No phone, email, or account id is stored.</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
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

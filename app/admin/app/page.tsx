import { getAppReleaseConfig } from "@/lib/settings";
import { AppReleaseForm } from "./app-form";

export const dynamic = "force-dynamic";

export default async function AdminAppPage() {
  const release = await getAppReleaseConfig();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Android app</h1>
        <p className="text-sm text-muted-foreground">
          Play in-app updates. A build below the minimum is immediate. Other updates are flexible.
        </p>
      </div>
      <AppReleaseForm initial={release} />
    </div>
  );
}

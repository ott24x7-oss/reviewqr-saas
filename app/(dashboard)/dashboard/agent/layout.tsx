import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AgentTabs } from "./agent-tabs";

export const dynamic = "force-dynamic";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "AGENT" && user.role !== "ADMIN") redirect("/dashboard");
  return (
    <div className="space-y-6">
      <AgentTabs />
      {children}
    </div>
  );
}

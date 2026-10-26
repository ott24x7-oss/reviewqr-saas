import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { loadAgentHome } from "@/lib/plans/agent-home";
import { formatDate } from "@/lib/utils";
import { PageHeader, EmptyState, StatusBadge } from "@/components/app-ui/primitives";
import { AppText } from "@/components/app-ui/i18n";
import { AgentTabs } from "../agent-tabs";

export const dynamic = "force-dynamic";

export default async function AgentBusinessesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "AGENT" && user.role !== "ADMIN") redirect("/dashboard");
  const home = await loadAgentHome(user.id);
  if (!home) return <EmptyState icon={<Building2 className="h-5 w-5" />} title={<AppText en="Agent profile not ready" hi="एजेंट प्रोफ़ाइल तैयार नहीं" />} description={<AppText en="Ask support to check your agent account." hi="अपने एजेंट खाते की जाँच के लिए सहायता से संपर्क करें।" />} />;
  return <div className="space-y-5">
    <PageHeader title={<AppText en="Businesses" hi="कारोबार" />} description={<AppText en="Businesses you brought to QR24x7, their plans and renewal dates." hi="वे कारोबार जिन्हें आपने QR24x7 से जोड़ा, उनके प्लान और नवीनीकरण की तारीखें।" />} />
    <AgentTabs />
    {home.businesses.length === 0 ? <div className="app-ui-panel"><EmptyState icon={<Building2 className="h-5 w-5" />} title={<AppText en="No businesses yet" hi="अभी कोई कारोबार नहीं" />} description={<AppText en="When a business joins with your code, it will show up here." hi="आपके कोड से जुड़ने पर कारोबार यहाँ दिखेगा।" />} /></div> : <div className="app-ui-panel overflow-hidden"><ul className="divide-y">{home.businesses.map((business) => <li className="flex flex-wrap items-center gap-3 p-4 sm:p-5" key={business.id}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><p className="truncate font-medium">{business.name}</p><p className="mt-1 text-sm text-muted-foreground">{business.owner} · {business.endsAt ? <><AppText en="Renews" hi="नवीनीकरण" /> {formatDate(business.endsAt)}</> : <AppText en="No renewal date" hi="नवीनीकरण की तारीख नहीं" />}</p></div>
      <div className="flex flex-wrap gap-2"><StatusBadge tone={business.status === "ACTIVE" ? "success" : business.dueSoon ? "warning" : "neutral"}>{business.status}</StatusBadge><StatusBadge>{business.plan}</StatusBadge>{business.dueSoon ? <StatusBadge tone="warning"><AppText en="Renewal due soon" hi="नवीनीकरण जल्द है" /></StatusBadge> : null}</div>
    </li>)}</ul></div>}
  </div>;
}

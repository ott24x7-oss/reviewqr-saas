import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { generateQrDataUrl } from "@/lib/qr";
import { loadAgentHome } from "@/lib/plans/agent-home";
import { formatINR, formatDate } from "@/lib/utils";
import { AgentTools } from "./agent-tools";

export const dynamic = "force-dynamic";

export default async function AgentHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "AGENT" && user.role !== "ADMIN") redirect("/dashboard");
  const home = await loadAgentHome(user.id);
  if (!home) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold">My sales</h1>
        <p className="mt-2 text-sm text-muted-foreground">This account has no agent profile.</p>
      </div>
    );
  }
  const qr = await generateQrDataUrl(home.link, { size: 280 });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">My sales</h1>
        <p className="text-sm text-muted-foreground">Businesses you brought in, and commission still on hold.</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold">{formatINR(home.totals.PENDING)}</p>
        </article>
        <article className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Approved</p>
          <p className="text-2xl font-bold">{formatINR(home.totals.APPROVED)}</p>
        </article>
        <article className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-2xl font-bold">{formatINR(home.totals.PAID)}</p>
        </article>
      </section>
      <AgentTools link={home.link} shareText={home.shareText} qr={qr} />
      <section>
        <h2 className="font-display text-xl font-bold">Businesses</h2>
        <ul className="mt-3 space-y-2">
          {home.businesses.length === 0 ? <li className="text-sm text-muted-foreground">No businesses yet.</li> : null}
          {home.businesses.map((business) => (
            <li key={business.id} className="rounded-xl border p-3">
              <p className="font-medium">{business.name}</p>
              <p className="text-sm text-muted-foreground">
                {business.owner} · {business.plan} · {business.status}
                {business.endsAt ? ` · until ${formatDate(business.endsAt)}` : ""}
                {business.dueSoon ? " · renewal due soon" : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-display text-xl font-bold">Payouts</h2>
        <ul className="mt-3 space-y-2">
          {home.payouts.length === 0 ? <li className="text-sm text-muted-foreground">No payouts yet.</li> : null}
          {home.payouts.map((payout) => (
            <li key={payout.id} className="text-sm">
              {formatDate(payout.paidAt)} · {formatINR(payout.amountPaise)} · UTR {payout.utr}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

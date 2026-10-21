import { ShopCreditForm } from "@/components/admin/shop-credit-form";
import { requireAdminPage } from "@/lib/admin";
import { shopMonthReport } from "@/lib/shop/reports";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ShopReportsPage() {
  await requireAdminPage();
  const report = await shopMonthReport();
  return (
    <div className="space-y-4 text-ink">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Shop reports</h1>
        <p className="text-sm text-muted-foreground">{report.label}. Paid shop orders, GST, and agent payouts.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card title="Orders" value={String(report.orders)} />
        <Card title="Revenue" value={formatINR(report.revenuePaise)} />
        <Card title="Taxable" value={formatINR(report.taxablePaise)} />
        <Card title="MRR" value={formatINR(report.mrrPaise)} />
      </div>
      <section className="space-y-2 rounded-[20px] bg-white p-4 text-sm shadow-sm">
        <h2 className="font-semibold">GST this month</h2>
        <p>CGST {formatINR(report.cgstPaise)} · SGST {formatINR(report.sgstPaise)} · IGST {formatINR(report.igstPaise)}</p>
        <p>
          Credit notes {report.credits.count} · {formatINR(report.credits.amountPaise)} · CGST {formatINR(report.credits.cgstPaise)} · SGST {formatINR(report.credits.sgstPaise)} · IGST {formatINR(report.credits.igstPaise)}
        </p>
        {report.credits.notes.length === 0 && <p>No credit notes this month.</p>}
        <ul className="space-y-1">
          {report.credits.notes.map((note) => (
            <li key={note.number}>
              {note.number} · {formatINR(note.amountPaise)} · {note.reason}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2 rounded-[20px] bg-white p-4 text-sm shadow-sm">
        <h2 className="font-semibold">Top products</h2>
        {report.products.length === 0 && <p>No paid shop orders this month.</p>}
        <ul className="space-y-1">
          {report.products.map((product) => (
            <li key={product.sku}>
              {product.name} · {product.sku} · {product.qty}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2 rounded-[20px] bg-white p-4 text-sm shadow-sm">
        <h2 className="font-semibold">Agent payouts</h2>
        {report.agents.length === 0 && <p>No commission this month.</p>}
        <ul className="space-y-1">
          {report.agents.map((agent) => (
            <li key={agent.agentId}>
              {agent.name} · {formatINR(agent.amountPaise)} · {agent.orders} orders · {agent.renewals} renewals
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2 rounded-[20px] bg-white p-4 text-sm shadow-sm">
        <h2 className="font-semibold">Renewals due in 30 days</h2>
        {report.renewals.length === 0 && <p>No active plans end in the next 30 days.</p>}
        <ul className="space-y-1">
          {report.renewals.map((user) => (
            <li key={user.id}>
              {user.name || user.email} · {user.subscriptionTier}
              {user.subscriptionEndsAt ? ` · ${user.subscriptionEndsAt.toLocaleDateString("en-IN")}` : ""}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2 rounded-[20px] bg-white p-4 text-sm shadow-sm">
        <h2 className="font-semibold">Low stock</h2>
        {report.lowStock.length === 0 && <p>No variant is at or below its low-stock level.</p>}
        <ul className="space-y-1">
          {report.lowStock.map((variant) => (
            <li key={variant.sku}>
              {variant.name} · {variant.sku} · {variant.stock} left · alert at {variant.lowStockAt}
            </li>
          ))}
        </ul>
      </section>
      <ShopCreditForm />
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-[20px] bg-white p-4 shadow-sm">
      <h2 className="text-sm text-muted-foreground">{title}</h2>
      <p className="text-xl font-semibold">{value}</p>
    </section>
  );
}

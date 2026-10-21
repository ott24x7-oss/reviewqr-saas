import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shopCopy } from "@/lib/shop/i18n";
import { isShopOrderStatus, shopStatusLabel } from "@/lib/shop/order-status";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ShopOrderPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const order = await prisma.shopOrder.findFirst({
    where: { id: params.id, userId: user.id },
    include: { lines: true }
  });
  if (!order) notFound();
  const copy = shopCopy("en");
  const printed = order.lines.some((line) => line.needsDesign);
  const status = isShopOrderStatus(order.status) ? shopStatusLabel(order.status) : order.status;
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-ink">
      <Link href="/dashboard/shop/orders" className="text-sm text-muted-ink">{copy.orders}</Link>
      <h1 className="font-display text-2xl font-bold">{status}</h1>
      <section className="space-y-2 rounded-[20px] bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Tax invoice</h2>
        <p className="text-sm">{order.invoiceNumber || "Invoice number is issued after payment."}</p>
        <p className="text-sm">{order.sellerName}{order.sellerGstin ? ` · ${order.sellerGstin}` : ""}</p>
        {order.buyerLegalName && <p className="text-sm">{order.buyerLegalName}</p>}
        {order.buyerGstin && <p className="text-sm">GSTIN {order.buyerGstin}</p>}
        <p className="text-sm">Place of supply {order.buyerState || order.sellerState || "Same as seller"}</p>
        <ul className="space-y-2 pt-2 text-sm">
          {order.lines.map((line) => (
            <li key={line.id}>
              <p className="font-medium">{line.name} × {line.qty}</p>
              <p>HSN {line.hsn} · {line.gstPercent}% · {formatINR(line.netPaise)}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm">Taxable {formatINR(order.taxablePaise)}</p>
        <p className="text-sm">CGST {formatINR(order.cgstPaise)} · SGST {formatINR(order.sgstPaise)} · IGST {formatINR(order.igstPaise)}</p>
        <p className="text-lg font-semibold">{copy.total} {formatINR(order.totalPaise)}</p>
        {order.balancePaise > 0 && <p className="text-sm">Paid now {formatINR(order.advancePaise)} · Balance {formatINR(order.balancePaise)}</p>}
      </section>
      {printed && <p className="rounded-[20px] bg-white p-4 text-sm shadow-sm">{copy.policy}</p>}
    </div>
  );
}

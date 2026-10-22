import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shopCopy } from "@/lib/shop/i18n";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ShopCommissionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const copy = shopCopy("en");
  const rows = await prisma.shopCommission.findMany({
    where: { agentId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-ink">
      <Link href="/dashboard/shop" className="text-sm text-muted-ink">{copy.shop}</Link>
      <h1 className="font-display text-2xl font-bold">{copy.commission}</h1>
      {rows.length === 0 && <p className="rounded-[20px] bg-white p-4 text-sm shadow-sm">No commission yet.</p>}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-[20px] bg-white p-4 text-sm shadow-sm">
            <p className="font-semibold">{formatINR(row.amountPaise)}</p>
            <p>{row.kind === "RENEWAL" ? "Renewal" : "Order"} · {row.percent}%</p>
            <p>{row.createdAt.toLocaleDateString("en-IN")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

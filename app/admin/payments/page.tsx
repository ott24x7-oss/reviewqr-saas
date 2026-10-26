import { Suspense } from "react";
import { PageHeader, TableSkeleton } from "@/components/admin/ui/primitives";
import { maskSecret } from "@/lib/admin";
import { listAdminPaymentsPage } from "@/lib/admin/money";
import { adminSearchParams } from "@/lib/admin/web-search";
import { prisma } from "@/lib/db";
import { getPaymentsConfig } from "@/lib/settings";
import { formatINR } from "@/lib/utils";
import { PaymentsConfigForm } from "./payments-form";
import { PaymentsTable } from "./table";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const search = adminSearchParams(searchParams);
  const since = new Date(Date.now() - 30 * 86400_000);
  const [cfg, listed, agg, agg30] = await Promise.all([
    getPaymentsConfig(),
    listAdminPaymentsPage(search),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: { _all: true }, where: { status: "COMPLETED" } }),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: { _all: true }, where: { status: "COMPLETED", createdAt: { gte: since } } })
  ]);
  return (
    <div>
      <PageHeader title="Payments" subtitle="Gateway settings, the queue, and refunds." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-[14px] border border-zinc-200 p-4 dark:border-zinc-800"><div className="text-xs text-zinc-500">Total revenue</div><div className="mt-1 text-2xl font-semibold tabular-nums">{formatINR(agg._sum.amount || 0)}</div></div>
        <div className="rounded-[14px] border border-zinc-200 p-4 dark:border-zinc-800"><div className="text-xs text-zinc-500">Last 30 days</div><div className="mt-1 text-2xl font-semibold tabular-nums">{formatINR(agg30._sum.amount || 0)}</div></div>
        <div className="rounded-[14px] border border-zinc-200 p-4 dark:border-zinc-800"><div className="text-xs text-zinc-500">Completed</div><div className="mt-1 text-2xl font-semibold tabular-nums">{agg._count._all}</div></div>
        <div className="rounded-[14px] border border-zinc-200 p-4 dark:border-zinc-800"><div className="text-xs text-zinc-500">Last 30d count</div><div className="mt-1 text-2xl font-semibold tabular-nums">{agg30._count._all}</div></div>
      </div>
      <PaymentsConfigForm
        initial={{
          ...cfg,
          mailImapPass: maskSecret(cfg.mailImapPass),
          razorpayKeySecret: maskSecret(cfg.razorpayKeySecret),
          razorpayWebhookSecret: maskSecret(cfg.razorpayWebhookSecret),
          youpiWebhookSecret: maskSecret(cfg.youpiWebhookSecret),
          stripeSecretKey: maskSecret(cfg.stripeSecretKey),
          stripeWebhookSecret: maskSecret(cfg.stripeWebhookSecret)
        }}
      />
      <div className="mt-6">
        {!listed.ok ? <p className="text-sm text-rose-600">{listed.error}</p> : (
          <Suspense fallback={<TableSkeleton />}>
            <PaymentsTable rows={listed.data.items} total={listed.data.total} page={listed.data.page} pageSize={listed.data.pageSize} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

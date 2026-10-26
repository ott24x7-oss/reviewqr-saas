import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, RefreshCw, Send, X } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { adminApi, useAdminCommissions, useAdminPayments } from "./api";
import { useAdminCopy } from "./copy";
import type { AdminCommission, AdminPayment, AdminPaymentProvider, AdminPaymentStatus } from "./types";
import { AdminAction, AdminConfirmSheet, AdminFrame, AdminLoadState, AdminStatus } from "./screen-kit";
import { AdminCard, AdminChip } from "./components";
import { formatAdminCompact, formatAdminDate, formatAdminMoney } from "./format";
import { useAdminScreenCapture, useAdminSecurity } from "./security";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";

type MoneyTab = "payments" | "commissions";
/** Sheet actions need a reason (and a UTR for refund and pay) before the step-up. */
type MoneySheet =
  | { kind: "payment"; action: "refund" | "approve"; payment: AdminPayment }
  | { kind: "commission"; action: "pay"; commission: AdminCommission }
  | null;

const PAYMENT_STATUSES: AdminPaymentStatus[] = ["COMPLETED", "PENDING", "QUEUED", "FAILED", "REFUNDED", "EXPIRED", "CANCELLED"];
const PROVIDERS: AdminPaymentProvider[] = ["RAZORPAY", "YOUPI", "UPI", "MANUAL", "STRIPE", "USDT"];

export function AdminMoneyScreen() {
  useAdminScreenCapture("admin-money");
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ tab?: string; status?: string }>();
  const [tab, setTab] = useState<MoneyTab>(params.tab === "commissions" ? "commissions" : "payments");
  const [paymentStatus, setPaymentStatus] = useState<AdminPaymentStatus | undefined>(PAYMENT_STATUSES.includes(params.status as AdminPaymentStatus) ? params.status as AdminPaymentStatus : undefined);
  const [provider, setProvider] = useState<AdminPaymentProvider | undefined>(undefined);
  const [planFilter, setPlanFilter] = useState("ALL");
  const [sheet, setSheet] = useState<MoneySheet>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const queryClient = useQueryClient();
  const { withStepUp } = useAdminSecurity();
  const payments = useAdminPayments({ status: paymentStatus, provider });
  const commissions = useAdminCommissions();
  const paymentRows = useMemo(() => payments.data?.pages.flatMap((page) => page.items) ?? [], [payments.data]);
  const commissionRows = useMemo(() => commissions.data?.pages.flatMap((page) => page.items) ?? [], [commissions.data]);
  const plans = Array.from(new Set(paymentRows.map((item) => item.plan).filter((plan): plan is string => !!plan)));
  const filteredPayments = paymentRows.filter((item) => planFilter === "ALL" || item.plan === planFilter);
  // The server has no money totals route; these sum the commissions loaded so far.
  const due = commissionRows.filter((row) => row.status === "APPROVED").reduce((sum, row) => sum + row.amountPaise, 0);
  const pending = commissionRows.filter((row) => row.status === "PENDING").reduce((sum, row) => sum + row.amountPaise, 0);
  const active = tab === "payments" ? payments : commissions;

  async function act(work: () => Promise<unknown>) {
    setBusy(true);
    setError(false);
    try {
      const done = await work();
      if (done === null) return;
      await queryClient.invalidateQueries({ queryKey: ["admin", tab] });
      setSheet(null);
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  async function submitSheet({ reason, utr }: { reason: string; utr?: string }) {
    if (!sheet) return;
    if (sheet.kind === "commission") {
      const agentId = sheet.commission.agentId;
      await act(() => withStepUp("mark_payout_paid", (stepUp) => adminApi.commissionAction({ action: "pay", agentId, utr, reason }, stepUp), true));
    } else if (sheet.action === "refund") {
      const paymentId = sheet.payment.id;
      await act(() => withStepUp("refund_payment", (stepUp) => adminApi.paymentAction(paymentId, { action: "refund", refundUtr: utr, reason }, stepUp), true));
    } else {
      const paymentId = sheet.payment.id;
      await act(() => withStepUp("approve_payment", (stepUp) => adminApi.paymentAction(paymentId, { action: "approve", reason }, stepUp), true));
    }
  }

  const paymentAction = (item: AdminPayment, action: "reject" | "reconcile" | "invoice") => act(() => adminApi.paymentAction(item.id, { action }));
  const approveAgent = (item: AdminCommission) => act(() => adminApi.commissionAction({ action: "approve", agentId: item.agentId }));

  const sheetTitle = !sheet ? t.moneyConfirm : sheet.kind === "commission" ? `${t.markPaid} · ${sheet.commission.agentName}` : sheet.action === "refund" ? t.refund : t.approve;
  const sheetBody = !sheet ? undefined : sheet.kind === "commission" ? formatAdminMoney(commissionRows.filter((row) => row.agentId === sheet.commission.agentId && row.status === "APPROVED").reduce((sum, row) => sum + row.amountPaise, 0), lang) : `${sheet.payment.email} · ${formatAdminMoney(sheet.payment.amount, lang)}`;

  return (
    <AdminFrame title={t.money} subtitle={t.moneySubtitle} refreshing={active.isRefetching} onRefresh={() => active.refetch()}>
      <View style={styles.summaryRow}>
        <Summary label={t.payoutsDue} amount={due} icon={<ArrowUpRight color={palette.success} size={17} />} tone="success" />
        <Summary label={t.pending} amount={pending} icon={<ArrowDownLeft color={palette.warning} size={17} />} tone="warning" />
      </View>
      <View style={styles.tabs}>{(["payments", "commissions"] as const).map((key) => <AdminChip key={key} label={key === "payments" ? t.payments : t.commissions} selected={tab === key} onPress={() => setTab(key)} />)}</View>
      {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
      {tab === "payments" ? <View style={styles.filters}>
        <View style={styles.filterGroup}>{[undefined, ...PAYMENT_STATUSES].map((status) => <AdminChip key={status ?? "ALL"} label={status ? statusLabel(status, t) : t.all} selected={paymentStatus === status} onPress={() => setPaymentStatus(status)} />)}</View>
        <View style={styles.filterGroup}>{[undefined, ...PROVIDERS].map((item) => <AdminChip key={item ?? "ALL"} label={item ?? t.allGateways} selected={provider === item} onPress={() => setProvider(item)} />)}</View>
        {plans.length ? <View style={styles.filterGroup}>{["ALL", ...plans].map((plan) => <AdminChip key={plan} label={plan === "ALL" ? t.allPlans : plan} selected={planFilter === plan} onPress={() => setPlanFilter(plan)} />)}</View> : null}
      </View> : null}
      <AdminLoadState loading={active.isLoading} error={active.isError} retry={() => active.refetch()} empty={active.isSuccess && (tab === "payments" ? !filteredPayments.length : !commissionRows.length)}>
        {tab === "payments" ? filteredPayments.map((item) => <PaymentRow key={item.id} item={item} lang={lang} t={t} disabled={busy}
          onRefund={() => setSheet({ kind: "payment", action: "refund", payment: item })}
          onApprove={() => setSheet({ kind: "payment", action: "approve", payment: item })}
          onAction={(action) => paymentAction(item, action).catch(() => undefined)} />) : null}
        {tab === "commissions" ? commissionRows.map((item) => <CommissionRow key={item.id} item={item} lang={lang} t={t} disabled={busy}
          onApprove={() => approveAgent(item).catch(() => undefined)}
          onPay={() => setSheet({ kind: "commission", action: "pay", commission: item })} />) : null}
      </AdminLoadState>
      {active.hasNextPage ? <AdminAction label={active.isFetchingNextPage ? t.loading : t.more} tone="outline" onPress={() => active.fetchNextPage()} disabled={active.isFetchingNextPage} /> : null}
      <AdminConfirmSheet visible={!!sheet} title={sheetTitle} body={sheetBody} needsUtr={sheet?.kind === "commission" || sheet?.action === "refund"} saving={busy} onClose={() => setSheet(null)} onConfirm={submitSheet} />
    </AdminFrame>
  );
}

function Summary({ label, amount, icon, tone }: { label: string; amount: number; icon: React.ReactNode; tone: "success" | "warning" }) {
  const { palette } = useTheme();
  const { lang } = useI18n();
  const color = tone === "success" ? palette.success : palette.warning;
  return <AdminCard style={styles.summary}><View style={[styles.summaryIcon, { backgroundColor: `${color}18` }]}>{icon}</View><Text style={[styles.summaryLabel, { color: palette.muted }]}>{label}</Text><Text style={[styles.summaryAmount, { color: palette.ink }]}>{formatAdminCompact(amount, lang)}</Text></AdminCard>;
}

function PaymentRow({ item, lang, t, disabled, onRefund, onApprove, onAction }: {
  item: AdminPayment; lang: "en" | "hi"; t: ReturnType<typeof useAdminCopy>; disabled: boolean;
  onRefund: () => void; onApprove: () => void; onAction: (action: "reject" | "reconcile" | "invoice") => void;
}) {
  const { palette } = useTheme();
  const open = item.status === "PENDING" || item.status === "QUEUED";
  return <AdminCard style={styles.moneyCard}>
    <View style={styles.moneyTop}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: palette.ink }]}>{item.email}</Text><Text style={[styles.rowSubtitle, { color: palette.muted }]}>{[item.plan, item.provider, item.phone].filter(Boolean).join(" · ")}</Text></View><Text style={[styles.moneyAmount, { color: palette.ink }]}>{formatAdminMoney(item.amount, lang)}</Text></View>
    <View style={styles.reference}><Text style={[styles.referenceText, { color: palette.muted }]}>{[item.invoiceNumber, item.utr, formatAdminDate(item.createdAt, lang)].filter(Boolean).join(" · ")}</Text><AdminStatus label={item.status} /></View>
    <View style={styles.buttonRow}>
      <AdminAction label={t.recheck} tone="outline" disabled={disabled} onPress={() => onAction("reconcile")} icon={<RefreshCw color={palette.ink} size={15} />} />
      {open ? <AdminAction label={t.approve} disabled={disabled} onPress={onApprove} /> : null}
      {open ? <AdminAction label={t.reject} tone="outline" disabled={disabled} onPress={() => onAction("reject")} icon={<X color={palette.ink} size={15} />} /> : null}
      {item.status === "COMPLETED" ? <AdminAction label={t.refund} tone="danger" disabled={disabled} onPress={onRefund} /> : null}
      {item.status === "COMPLETED" ? <AdminAction label={t.resendInvoice} tone="outline" disabled={disabled} onPress={() => onAction("invoice")} icon={<Send color={palette.ink} size={15} />} /> : null}
    </View>
  </AdminCard>;
}

function statusLabel(status: AdminPaymentStatus, t: ReturnType<typeof useAdminCopy>) {
  if (status === "COMPLETED") return t.statusPaid;
  if (status === "PENDING" || status === "QUEUED") return t.statusPending;
  if (status === "FAILED") return t.statusFailed;
  if (status === "REFUNDED") return t.statusRefunded;
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/** Approve and pay act on every due commission of that agent, as the server does. */
function CommissionRow({ item, lang, t, disabled, onApprove, onPay }: { item: AdminCommission; lang: "en" | "hi"; t: ReturnType<typeof useAdminCopy>; disabled: boolean; onApprove: () => void; onPay: () => void }) {
  const { palette } = useTheme();
  return <AdminCard style={styles.moneyCard}>
    <View style={styles.moneyTop}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: palette.ink }]}>{item.agentName}</Text><Text style={[styles.rowSubtitle, { color: palette.muted }]}>{item.kind.replaceAll("_", " ")} · {formatAdminDate(item.createdAt, lang)}</Text></View><Text style={[styles.moneyAmount, { color: palette.ink }]}>{formatAdminMoney(item.amountPaise, lang)}</Text></View>
    <View style={styles.reference}><AdminStatus label={item.status} /></View>
    <View style={styles.buttonRow}>
      {item.status === "PENDING" ? <AdminAction label={t.approve} disabled={disabled} onPress={onApprove} /> : null}
      {item.status === "APPROVED" ? <AdminAction label={t.markPaid} disabled={disabled} onPress={onPay} icon={<CircleDollarSign color={palette.onPrimary} size={16} />} /> : null}
    </View>
  </AdminCard>;
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", gap: 9 }, summary: { flex: 1, gap: 9, minHeight: 115 }, summaryIcon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" }, summaryLabel: { fontFamily: fonts.body, fontSize: 12 }, summaryAmount: { fontFamily: fonts.title, fontSize: 20 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, filters: { gap: 6 }, filterGroup: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, error: { fontFamily: fonts.bodyStrong, fontSize: 13 }, moneyCard: { gap: 12 }, moneyTop: { flexDirection: "row", alignItems: "center", gap: 10 }, rowTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 }, rowSubtitle: { fontFamily: fonts.body, fontSize: 12, marginTop: 4 }, moneyAmount: { fontFamily: fonts.title, fontSize: 17 }, reference: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, referenceText: { flex: 1, fontFamily: fonts.body, fontSize: 10 }, buttonRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" }
});

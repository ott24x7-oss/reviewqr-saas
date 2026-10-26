import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, RefreshCw, ReceiptText, Send } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { adminFetch, useAdminMoney } from "./api";
import { useAdminCopy } from "./copy";
import type { AdminCommission, AdminPayment } from "./types";
import { AdminAction, AdminConfirmSheet, AdminFrame, AdminLoadState, AdminStatus } from "./screen-kit";
import { AdminCard, AdminChip, AdminRow } from "./components";
import { formatAdminCompact, formatAdminDate, formatAdminMoney } from "./format";
import { useAdminScreenCapture, useAdminSecurity } from "./security";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";

type MoneyTab = "payments" | "commissions" | "payouts";
type MoneySelection = { kind: "payment" | "commission"; id: string; action: "refund" | "recheck" | "resend-invoice" | "approve" | "mark-paid"; title: string } | null;

export function AdminMoneyScreen() {
  useAdminScreenCapture("admin-money");
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const query = useAdminMoney();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<MoneyTab>(params.tab === "commissions" || params.tab === "payouts" ? params.tab : "payments");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [gatewayFilter, setGatewayFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [selection, setSelection] = useState<MoneySelection>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const queryClient = useQueryClient();
  const { requestStepUpToken } = useAdminSecurity();
  const data = query.data;
  const filteredPayments = (data?.payments ?? []).filter((item) => (paymentStatus === "ALL" || item.status === paymentStatus) && (gatewayFilter === "ALL" || item.gateway === gatewayFilter) && (planFilter === "ALL" || item.plan === planFilter));
  const gateways = Array.from(new Set(data?.payments.map((item) => item.gateway) ?? []));
  const plans = Array.from(new Set(data?.payments.map((item) => item.plan) ?? []));
  const tabs: { key: MoneyTab; label: string }[] = [{ key: "payments", label: t.payments }, { key: "commissions", label: t.commissions }, { key: "payouts", label: t.payoutHistory }];

  async function submit({ reason, utr }: { reason: string; utr?: string }) {
    if (!selection) return;
    setBusy(true);
    setError(false);
    try {
      let stepUp: string | null = null;
      if (selection.action === "refund" || selection.action === "mark-paid") stepUp = await requestStepUpToken(selection.action === "refund" ? "refund_payment" : "mark_payout_paid", selection.id);
      if ((selection.action === "refund" || selection.action === "mark-paid") && !stepUp) return;
      const endpoint = selection.kind === "payment" ? `/payments/${selection.id}/action` : `/commissions/${selection.id}/action`;
      await adminFetch(endpoint, { method: "POST", headers: stepUp ? { "X-Step-Up": stepUp } : undefined, body: JSON.stringify({ action: selection.action, reason, utr }) });
      await queryClient.invalidateQueries({ queryKey: ["admin", "money"] });
      setSelection(null);
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  async function approvePendingCommissions() {
    const pending = data?.commissions.filter((item) => item.status === "PENDING") ?? [];
    if (!pending.length) return;
    setBusy(true); setError(false);
    try {
      for (const item of pending) await adminFetch(`/commissions/${item.id}/action`, { method: "POST", body: JSON.stringify({ action: "approve" }) });
      await queryClient.invalidateQueries({ queryKey: ["admin", "money"] });
    } catch { setError(true); }
    finally { setBusy(false); }
  }

  return (
    <AdminFrame title={t.money} subtitle={t.moneySubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      {data ? <>
        <View style={styles.summaryRow}>
          <Summary label={t.paid} amount={data.totals.paidPaise} icon={<ArrowUpRight color={palette.success} size={17} />} tone="success" />
          <Summary label={t.pending} amount={data.totals.pendingPaise} icon={<ArrowDownLeft color={palette.warning} size={17} />} tone="warning" />
        </View>
        <AdminCard style={styles.statementCard}>
          <View style={styles.statementHead}><View style={[styles.statementIcon, { backgroundColor: palette.accentSoft }]}><ReceiptText color={palette.primary} size={19} /></View><View style={{ flex: 1 }}><Text style={[styles.statementTitle, { color: palette.ink }]}>{t.statement}</Text><Text style={[styles.statementCaption, { color: palette.muted }]}>{t.thisMonth}</Text></View><Text style={[styles.netAmount, { color: palette.ink }]}>{formatAdminCompact(Math.max(0, data.totals.paidPaise - data.totals.tdsPaise), lang)}</Text></View>
          <View style={[styles.statementLine, { borderColor: palette.line }]}><Text style={[styles.statementLabel, { color: palette.muted }]}>{t.gross}</Text><Text style={[styles.statementValue, { color: palette.ink }]}>{formatAdminMoney(data.totals.paidPaise, lang)}</Text></View>
          <View style={[styles.statementLine, { borderColor: palette.line }]}><Text style={[styles.statementLabel, { color: palette.muted }]}>{t.tds}</Text><Text style={[styles.statementValue, { color: palette.ink }]}>{formatAdminMoney(data.totals.tdsPaise, lang)}</Text></View>
          <View style={styles.statementLine}><Text style={[styles.statementLabel, { color: palette.ink }]}>{t.net}</Text><Text style={[styles.statementValue, { color: palette.ink }]}>{formatAdminMoney(Math.max(0, data.totals.paidPaise - data.totals.tdsPaise), lang)}</Text></View>
        </AdminCard>
      </> : null}
      <View style={styles.tabs}>{tabs.map((item) => <AdminChip key={item.key} label={item.label} selected={tab === item.key} onPress={() => setTab(item.key)} />)}</View>
      {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
      {tab === "payments" ? <View style={styles.filters}>
        <View style={styles.filterGroup}>{["ALL", "PAID", "PENDING", "FAILED", "REFUNDED"].map((status) => <AdminChip key={status} label={status === "ALL" ? t.all : statusLabel(status, t)} selected={paymentStatus === status} onPress={() => setPaymentStatus(status)} />)}</View>
        <View style={styles.filterGroup}>{["ALL", ...gateways].map((gateway) => <AdminChip key={gateway} label={gateway === "ALL" ? t.allGateways : gateway} selected={gatewayFilter === gateway} onPress={() => setGatewayFilter(gateway)} />)}</View>
        <View style={styles.filterGroup}>{["ALL", ...plans].map((plan) => <AdminChip key={plan} label={plan === "ALL" ? t.allPlans : plan} selected={planFilter === plan} onPress={() => setPlanFilter(plan)} />)}</View>
      </View> : null}
      {tab === "commissions" && data?.commissions.some((item) => item.status === "PENDING") ? <AdminAction label={busy ? t.loading : t.approveAll} onPress={() => approvePendingCommissions().catch(() => undefined)} disabled={busy} /> : null}
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={!!data && ((tab === "payments" && !filteredPayments.length) || (tab === "commissions" && !data.commissions.length) || (tab === "payouts" && !data.payouts.length))}>
        {data && tab === "payments" ? filteredPayments.map((item) => <PaymentRow key={item.id} item={item} lang={lang} t={t} onSelect={(action) => setSelection({ kind: "payment", id: item.id, action, title: action === "refund" ? t.refund : action === "recheck" ? t.recheck : t.resendInvoice })} />) : null}
        {data && tab === "commissions" ? data.commissions.map((item) => <CommissionRow key={item.id} item={item} lang={lang} t={t} onSelect={(action) => setSelection({ kind: "commission", id: item.id, action, title: action === "mark-paid" ? t.markPaid : t.approve })} />) : null}
        {data && tab === "payouts" ? data.payouts.map((item) => <AdminCard key={item.id} style={styles.payoutCard}><AdminRow icon={CircleDollarSign} title={item.agent} subtitle={`${formatAdminDate(item.createdAt, lang)} · ${item.utr}`} trailing={<AdminStatus label={item.status} />} /><View style={[styles.netTable, { borderTopColor: palette.line }]}><MoneyCell label={t.gross} value={formatAdminMoney(item.grossPaise, lang)} /><MoneyCell label={t.tds} value={formatAdminMoney(item.tdsPaise, lang)} /><MoneyCell label={t.net} value={formatAdminMoney(item.netPaise, lang)} strong /></View></AdminCard>) : null}
      </AdminLoadState>
      <AdminConfirmSheet visible={!!selection && (selection.action === "refund" || selection.action === "mark-paid")} title={selection?.title ?? t.moneyConfirm} body={selection?.id} needsUtr={selection?.action === "mark-paid"} saving={busy} onClose={() => setSelection(null)} onConfirm={submit} />
      {selection && selection.action !== "refund" && selection.action !== "mark-paid" ? <AdminAction label={busy ? t.loading : selection.title} onPress={() => submit({ reason: "Admin verified the record" }).catch(() => undefined)} disabled={busy} /> : null}
    </AdminFrame>
  );
}

function Summary({ label, amount, icon, tone }: { label: string; amount: number; icon: React.ReactNode; tone: "success" | "warning" }) {
  const { palette } = useTheme();
  const { lang } = useI18n();
  const color = tone === "success" ? palette.success : palette.warning;
  return <AdminCard style={styles.summary}><View style={[styles.summaryIcon, { backgroundColor: `${color}18` }]}>{icon}</View><Text style={[styles.summaryLabel, { color: palette.muted }]}>{label}</Text><Text style={[styles.summaryAmount, { color: palette.ink }]}>{formatAdminCompact(amount, lang)}</Text></AdminCard>;
}

function PaymentRow({ item, lang, t, onSelect }: { item: AdminPayment; lang: "en" | "hi"; t: ReturnType<typeof useAdminCopy>; onSelect: (action: "refund" | "recheck" | "resend-invoice") => void }) {
  const { palette } = useTheme();
  return <AdminCard style={styles.moneyCard}><View style={styles.moneyTop}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: palette.ink }]}>{item.business}</Text><Text style={[styles.rowSubtitle, { color: palette.muted }]}>{item.plan} · {item.gateway} · {item.ownerPhoneMasked}</Text></View><Text style={[styles.moneyAmount, { color: palette.ink }]}>{formatAdminMoney(item.amountPaise, lang)}</Text></View><View style={styles.reference}><Text style={[styles.referenceText, { color: palette.muted }]}>{item.ref} · {formatAdminDate(item.createdAt, lang)}</Text><AdminStatus label={item.status} /></View><View style={styles.buttonRow}><AdminAction label={t.recheck} tone="outline" onPress={() => onSelect("recheck")} icon={<RefreshCw color={palette.ink} size={15} />} />{item.status === "PAID" ? <AdminAction label={t.refund} tone="danger" onPress={() => onSelect("refund")} /> : null}<AdminAction label={t.resendInvoice} tone="outline" onPress={() => onSelect("resend-invoice")} icon={<Send color={palette.ink} size={15} />} /></View></AdminCard>;
}

function statusLabel(status: string, t: ReturnType<typeof useAdminCopy>) { return status === "PAID" ? t.statusPaid : status === "PENDING" ? t.statusPending : status === "FAILED" ? t.statusFailed : t.statusRefunded; }

function CommissionRow({ item, lang, t, onSelect }: { item: AdminCommission; lang: "en" | "hi"; t: ReturnType<typeof useAdminCopy>; onSelect: (action: "approve" | "mark-paid") => void }) {
  const { palette } = useTheme();
  return <AdminCard style={styles.moneyCard}><View style={styles.moneyTop}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: palette.ink }]}>{item.agent}</Text><Text style={[styles.rowSubtitle, { color: palette.muted }]}>{item.business} · {formatAdminDate(item.createdAt, lang)}</Text></View><AdminStatus label={item.status} /></View><View style={[styles.netTable, { borderTopColor: palette.line }]}><MoneyCell label={t.gross} value={formatAdminMoney(item.grossPaise, lang)} /><MoneyCell label={t.tds} value={formatAdminMoney(item.tdsPaise, lang)} /><MoneyCell label={t.net} value={formatAdminMoney(item.netPaise, lang)} strong /></View><View style={styles.buttonRow}>{item.status === "PENDING" ? <AdminAction label={t.approved} onPress={() => onSelect("approve")} /> : item.status !== "PAID" ? <AdminAction label={t.markPaid} onPress={() => onSelect("mark-paid")} icon={<CircleDollarSign color={palette.onPrimary} size={16} />} /> : null}</View></AdminCard>;
}

function MoneyCell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { palette } = useTheme();
  return <View style={{ flex: 1, gap: 4 }}><Text style={[styles.cellLabel, { color: palette.muted }]}>{label}</Text><Text style={[styles.cellValue, { color: palette.ink, fontFamily: strong ? fonts.bodyStrong : fonts.body }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", gap: 9 }, summary: { flex: 1, gap: 9, minHeight: 115 }, summaryIcon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" }, summaryLabel: { fontFamily: fonts.body, fontSize: 12 }, summaryAmount: { fontFamily: fonts.title, fontSize: 20 },
  statementCard: { gap: 11 }, statementHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 3 }, statementIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, statementTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 }, statementCaption: { fontFamily: fonts.body, fontSize: 11, marginTop: 2 }, netAmount: { fontFamily: fonts.title, fontSize: 16 }, statementLine: { minHeight: 30, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, statementLabel: { fontFamily: fonts.body, fontSize: 13 }, statementValue: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, filters: { gap: 6 }, filterGroup: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, error: { fontFamily: fonts.bodyStrong, fontSize: 13 }, moneyCard: { gap: 12 }, moneyTop: { flexDirection: "row", alignItems: "center", gap: 10 }, rowTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 }, rowSubtitle: { fontFamily: fonts.body, fontSize: 12, marginTop: 4 }, moneyAmount: { fontFamily: fonts.title, fontSize: 17 }, reference: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, referenceText: { flex: 1, fontFamily: fonts.body, fontSize: 10 }, buttonRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" }, netTable: { flexDirection: "row", gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth }, cellLabel: { fontFamily: fonts.body, fontSize: 10 }, cellValue: { fontSize: 12 }, payoutCard: { gap: 9 }
});

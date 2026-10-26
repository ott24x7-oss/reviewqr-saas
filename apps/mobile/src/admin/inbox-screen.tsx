import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, router } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, CircleAlert, ShieldCheck, X } from "lucide-react-native";
import type { AdminInbox, AdminInboxAction, AdminInboxItem, AdminInboxSegment } from "./types";
import { adminFetch, useAdminInbox } from "./api";
import { useAdminCopy } from "./copy";
import { AdminCard, AdminChip } from "./components";
import { AdminStatus, AdminAction, AdminConfirmSheet, AdminFrame, AdminLoadState } from "./screen-kit";
import { formatAdminDate, formatAdminMoney } from "./format";
import { optimisticallyResolveInbox, restoreInboxItem } from "./inbox-state";
import { useAdminSecurity } from "./security";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";

const segments: AdminInboxSegment[] = ["agents", "devices", "proofs", "payouts", "refunds", "orders", "support", "payments"];

export function AdminInboxScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ segment?: string }>();
  const segment: AdminInboxSegment | "all" = segments.includes(params.segment as AdminInboxSegment) ? params.segment as AdminInboxSegment : "all";
  const [selected, setSelected] = useState<{ item: AdminInboxItem; action: AdminInboxAction } | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const queryClient = useQueryClient();
  const inboxQuery = useAdminInbox(segment);
  const { requestStepUpToken } = useAdminSecurity();
  const selectSegment = (next: AdminInboxSegment | "all") => router.setParams({ segment: next === "all" ? undefined : next } as never);
  const inbox = inboxQuery.data;
  const labels: Record<AdminInboxSegment, string> = { agents: t.agentsPending, devices: t.devicesPending, proofs: t.proofs, payouts: t.payoutsDue, refunds: t.refunds, orders: t.shopOrdersSegment, support: t.supportTickets, payments: t.failedPayments };
  const pendingAgentItems = useMemo(() => inbox?.items.filter((item) => item.segment === "agents" && item.actions.includes("approve")) ?? [], [inbox]);

  async function perform(item: AdminInboxItem, action: AdminInboxAction, reason = "", utr = "") {
    setWorkingId(item.id);
    setError(false);
    const key = ["admin", "inbox", segment] as const;
    const previous = queryClient.getQueryData<AdminInbox>(key);
    if (previous) queryClient.setQueryData(key, optimisticallyResolveInbox(previous, item.id));
    try {
      let stepUp: string | null = null;
      if (action === "mark-paid" || (action === "approve" && item.segment === "devices")) {
        stepUp = await requestStepUpToken(action === "mark-paid" ? "mark_payout_paid" : "approve_device", item.id);
        if (!stepUp) {
          if (previous) queryClient.setQueryData(key, restoreInboxItem(queryClient.getQueryData<AdminInbox>(key) ?? previous, item));
          return;
        }
      }
      await adminFetch(`/inbox/${encodeURIComponent(item.id)}/action`, {
        method: "POST",
        headers: stepUp ? { "X-Step-Up": stepUp } : undefined,
        body: JSON.stringify({ action, reason, utr })
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "inbox"] });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch {
      if (previous) queryClient.setQueryData(key, restoreInboxItem(queryClient.getQueryData<AdminInbox>(key) ?? previous, item));
      setError(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } finally {
      setWorkingId(null);
      setSelected(null);
    }
  }

  async function bulkApproveAgents() {
    if (!inbox || pendingAgentItems.length === 0) return;
    setWorkingId("bulk");
    setError(false);
    try {
      for (const item of pendingAgentItems) await adminFetch(`/inbox/${encodeURIComponent(item.id)}/action`, { method: "POST", body: JSON.stringify({ action: "approve" }) });
      await queryClient.invalidateQueries({ queryKey: ["admin", "inbox"] });
    } catch { setError(true); }
    finally { setWorkingId(null); }
  }

  const onAction = (item: AdminInboxItem, action: AdminInboxAction) => {
    if (action === "reply") { router.push("/(admin)/support"); return; }
    if (action === "ship") { router.push({ pathname: "/(admin)/shop", params: { id: item.id } }); return; }
    if (action === "reject" || action === "mark-paid") setSelected({ item, action });
    else perform(item, action).catch(() => undefined);
  };
  const onConfirm = async ({ reason, utr }: { reason: string; utr?: string }) => {
    if (selected) await perform(selected.item, selected.action, reason, utr ?? "");
  };

  return (
    <AdminFrame title={t.inbox} subtitle={t.inboxSubtitle} refreshing={inboxQuery.isRefetching} onRefresh={() => inboxQuery.refetch()}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
        <AdminChip label={`${t.all} · ${Object.values(inbox?.counts ?? {}).reduce((a, b) => a + b, 0)}`} selected={segment === "all"} onPress={() => selectSegment("all")} />
        {segments.map((key) => <AdminChip key={key} label={`${labels[key]} · ${inbox?.counts[key] ?? 0}`} selected={segment === key} onPress={() => selectSegment(key)} />)}
      </ScrollView>
      {segment === "agents" && pendingAgentItems.length > 1 ? <AdminAction label={t.approveAll} onPress={() => bulkApproveAgents().catch(() => undefined)} disabled={workingId === "bulk"} icon={workingId === "bulk" ? <ActivityIndicator color={palette.onPrimary} /> : <ShieldCheck color={palette.onPrimary} size={17} />} /> : null}
      {error ? <View style={[styles.error, { backgroundColor: `${palette.danger}14` }]}><CircleAlert size={16} color={palette.danger} /><Text style={[styles.errorText, { color: palette.danger }]}>{t.actionFailed}</Text></View> : null}
      <AdminLoadState loading={inboxQuery.isLoading} error={inboxQuery.isError} retry={() => inboxQuery.refetch()} empty={!!inbox && inbox.items.length === 0}>
        {inbox?.items.map((item) => <InboxCard key={item.id} item={item} label={labels[item.segment]} lang={lang} working={workingId === item.id} onAction={(action) => onAction(item, action)} />)}
      </AdminLoadState>
      <AdminConfirmSheet visible={!!selected} title={selected?.action === "mark-paid" ? t.markPaid : t.reject} body={selected?.item.title} needsUtr={selected?.action === "mark-paid"} saving={!!workingId} onClose={() => setSelected(null)} onConfirm={onConfirm} />
    </AdminFrame>
  );
}

function InboxCard({ item, label, lang, working, onAction }: { item: AdminInboxItem; label: string; lang: "en" | "hi"; working: boolean; onAction: (action: AdminInboxAction) => void }) {
  const { palette } = useTheme();
  const t = useAdminCopy();
  const offset = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const swipe = Gesture.Pan().activeOffsetX([-12, 12]).onUpdate((event) => { offset.value = Math.max(-100, Math.min(100, event.translationX)); }).onEnd((event) => {
    if (event.translationX > 72 && item.actions.includes("approve")) runOnJS(onAction)("approve");
    else if (event.translationX < -72 && item.actions.includes("reject")) runOnJS(onAction)("reject");
    offset.value = withSpring(0, { damping: 18, stiffness: 180 });
  });
  return (
    <GestureDetector gesture={swipe}>
      <Animated.View style={style}>
        <AdminCard style={styles.itemCard}>
          <View style={styles.itemTop}><View style={{ flex: 1, gap: 4 }}><Text style={[styles.itemTitle, { color: palette.ink }]}>{item.title}</Text><Text style={[styles.itemSubtitle, { color: palette.muted }]}>{item.subtitle}</Text></View><AdminStatus label={t.pending} /></View>
          <View style={styles.itemMeta}><Text style={[styles.metaText, { color: palette.muted }]}>{label}</Text><Text style={[styles.metaText, { color: palette.muted }]}>{formatAdminDate(item.createdAt, lang)}</Text>{item.amountPaise !== undefined ? <Text style={[styles.amount, { color: palette.ink }]}>{formatAdminMoney(item.amountPaise, lang)}</Text> : null}</View>
          <View style={styles.actions}>{item.actions.map((action) => <AdminAction key={action} label={actionLabel(action, t)} tone={action === "reject" ? "outline" : "primary"} disabled={working} onPress={() => onAction(action)} icon={working ? <ActivityIndicator color={action === "reject" ? palette.ink : palette.onPrimary} /> : action === "reject" ? <X color={palette.ink} size={16} /> : <Check color={palette.onPrimary} size={16} />} />)}</View>
          <Text style={[styles.swipeHint, { color: palette.muted }]}>{t.swipeHint}</Text>
        </AdminCard>
      </Animated.View>
    </GestureDetector>
  );
}

function actionLabel(action: AdminInboxAction, t: ReturnType<typeof useAdminCopy>) {
  if (action === "approve") return t.approve;
  if (action === "reject") return t.reject;
  if (action === "mark-paid") return t.markPaid;
  if (action === "reply") return t.reply;
  if (action === "ship") return t.updateStage;
  return t.pause;
}

const styles = StyleSheet.create({
  segmentRow: { gap: 7, paddingBottom: 2 }, itemCard: { gap: 12 }, itemTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 }, itemTitle: { fontFamily: fonts.bodyStrong, fontSize: 16 }, itemSubtitle: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }, itemMeta: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }, metaText: { fontFamily: fonts.body, fontSize: 11 }, amount: { marginLeft: "auto", fontFamily: fonts.bodyStrong, fontSize: 14 }, actions: { flexDirection: "row", gap: 8 }, swipeHint: { fontFamily: fonts.body, fontSize: 10, textAlign: "right", marginTop: -5 }, error: { borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 7 }, errorText: { fontFamily: fonts.bodyStrong, fontSize: 12 }
});

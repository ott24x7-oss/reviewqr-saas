import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, router } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, CircleAlert, ShieldCheck, X } from "lucide-react-native";
import type { AdminInbox, AdminInboxAction, AdminInboxItem, AdminInboxSegment } from "./types";
import { adminApi, useAdminInbox } from "./api";
import { useAdminCopy } from "./copy";
import { AdminCard, AdminChip } from "./components";
import { AdminStatus, AdminAction, AdminConfirmSheet, AdminFrame, AdminLoadState } from "./screen-kit";
import { formatAdminDate } from "./format";
import { optimisticallyResolveInbox, restoreInboxItem } from "./inbox-state";
import { useAdminSecurity } from "./security";
import { INBOX_SEGMENTS, inboxActions } from "./view";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";

/** Card buttons: the server's actions, plus shortcuts to the screen that handles the rest. */
type InboxButton = AdminInboxAction | "reply" | "pay";

function buttonsFor(segment: AdminInboxSegment): InboxButton[] {
  if (segment === "payouts") return ["pay"];
  if (segment === "support" || segment === "refunds") return ["reply", "close"];
  return inboxActions(segment);
}

export function AdminInboxScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ segment?: string }>();
  // The server lists one segment per request; there is no "all" list.
  const segment: AdminInboxSegment = INBOX_SEGMENTS.includes(params.segment as AdminInboxSegment) ? params.segment as AdminInboxSegment : "agents";
  const [selected, setSelected] = useState<{ item: AdminInboxItem; action: AdminInboxAction } | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const queryClient = useQueryClient();
  const inboxQuery = useAdminInbox(segment);
  const { withStepUp } = useAdminSecurity();
  const selectSegment = (next: AdminInboxSegment) => router.setParams({ segment: next } as never);
  const inbox = inboxQuery.data;
  const labels: Record<AdminInboxSegment, string> = { agents: t.agentsPending, devices: t.devicesPending, proofs: t.proofs, payouts: t.payoutsDue, refunds: t.refunds, shop: t.shopOrdersSegment, support: t.supportTickets, failed: t.failedPayments };
  const pendingAgents = useMemo(() => segment === "agents" ? inbox?.items ?? [] : [], [inbox, segment]);
  const total = Object.values(inbox?.counts ?? {}).reduce((a, b) => a + b, 0);

  async function perform(items: AdminInboxItem[], action: AdminInboxAction, reason = "") {
    if (!items.length) return;
    setWorkingId(items.length > 1 ? "bulk" : items[0].id);
    setError(false);
    const key = ["admin", "inbox", segment] as const;
    const previous = queryClient.getQueryData<AdminInbox>(key);
    const ids = items.map((item) => item.id);
    if (previous) queryClient.setQueryData(key, optimisticallyResolveInbox(previous, ids));
    const restore = () => {
      if (!previous) return;
      let current = queryClient.getQueryData<AdminInbox>(key) ?? previous;
      for (const item of items) current = restoreInboxItem(current, item);
      queryClient.setQueryData(key, current);
    };
    try {
      const body = { segment, action, ...(ids.length > 1 ? { ids } : { id: ids[0] }), ...(reason ? { reason } : {}) };
      // Only approving an admin phone needs a step-up here.
      const needsStepUp = segment === "devices" && action === "approve";
      const done = await withStepUp("approve_device", (stepUp) => adminApi.inboxAction(body, stepUp), needsStepUp);
      if (done === null) { restore(); return; }
      await queryClient.invalidateQueries({ queryKey: ["admin", "inbox"] });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch {
      restore();
      setError(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } finally {
      setWorkingId(null);
      setSelected(null);
    }
  }

  const onAction = (item: AdminInboxItem, action: InboxButton) => {
    if (action === "reply") { router.push({ pathname: "/(admin)/support", params: { id: item.id } }); return; }
    if (action === "pay") { router.push("/(admin)/(tabs)/money?tab=commissions"); return; }
    if (action === "reject" || action === "revoke") setSelected({ item, action });
    else perform([item], action).catch(() => undefined);
  };
  const onConfirm = async ({ reason }: { reason: string }) => {
    if (selected) await perform([selected.item], selected.action, reason);
  };

  return (
    <AdminFrame title={t.inbox} subtitle={`${t.inboxSubtitle} · ${total}`} refreshing={inboxQuery.isRefetching} onRefresh={() => inboxQuery.refetch()}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
        {INBOX_SEGMENTS.map((key) => <AdminChip key={key} label={`${labels[key]} · ${inbox?.counts[key] ?? 0}`} selected={segment === key} onPress={() => selectSegment(key)} />)}
      </ScrollView>
      {pendingAgents.length > 1 ? <AdminAction label={t.approveAll} onPress={() => perform(pendingAgents, "approve").catch(() => undefined)} disabled={workingId === "bulk"} icon={workingId === "bulk" ? <ActivityIndicator color={palette.onPrimary} /> : <ShieldCheck color={palette.onPrimary} size={17} />} /> : null}
      {error ? <View style={[styles.error, { backgroundColor: `${palette.danger}14` }]}><CircleAlert size={16} color={palette.danger} /><Text style={[styles.errorText, { color: palette.danger }]}>{t.actionFailed}</Text></View> : null}
      <AdminLoadState loading={inboxQuery.isLoading} error={inboxQuery.isError} retry={() => inboxQuery.refetch()} empty={!!inbox && inbox.items.length === 0}>
        {inbox?.items.map((item) => <InboxCard key={item.id} item={item} buttons={buttonsFor(segment)} label={labels[segment]} lang={lang} working={workingId === item.id} onAction={(action) => onAction(item, action)} />)}
      </AdminLoadState>
      <AdminConfirmSheet visible={!!selected} title={selected?.action === "revoke" ? t.revokeDevice : t.reject} body={selected?.item.title} saving={!!workingId} onClose={() => setSelected(null)} onConfirm={onConfirm} />
    </AdminFrame>
  );
}

function InboxCard({ item, buttons, label, lang, working, onAction }: { item: AdminInboxItem; buttons: InboxButton[]; label: string; lang: "en" | "hi"; working: boolean; onAction: (action: InboxButton) => void }) {
  const { palette } = useTheme();
  const t = useAdminCopy();
  const offset = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const swipe = Gesture.Pan().activeOffsetX([-12, 12]).onUpdate((event) => { offset.value = Math.max(-100, Math.min(100, event.translationX)); }).onEnd((event) => {
    if (event.translationX > 72 && buttons.includes("approve")) runOnJS(onAction)("approve");
    else if (event.translationX < -72 && buttons.includes("reject")) runOnJS(onAction)("reject");
    offset.value = withSpring(0, { damping: 18, stiffness: 180 });
  });
  const outline = (action: InboxButton) => action === "reject" || action === "revoke" || action === "close";
  return (
    <GestureDetector gesture={swipe}>
      <Animated.View style={style}>
        <AdminCard style={styles.itemCard}>
          <View style={styles.itemTop}><View style={{ flex: 1, gap: 4 }}><Text style={[styles.itemTitle, { color: palette.ink }]}>{item.title}</Text><Text style={[styles.itemSubtitle, { color: palette.muted }]}>{item.subtitle}</Text></View><AdminStatus label={item.status} /></View>
          <View style={styles.itemMeta}><Text style={[styles.metaText, { color: palette.muted }]}>{label}</Text><Text style={[styles.metaText, { color: palette.muted }]}>{formatAdminDate(item.createdAt, lang)}</Text></View>
          <View style={styles.actions}>{buttons.map((action) => <AdminAction key={action} label={actionLabel(action, t)} tone={outline(action) ? "outline" : "primary"} disabled={working} onPress={() => onAction(action)} icon={working ? <ActivityIndicator color={outline(action) ? palette.ink : palette.onPrimary} /> : outline(action) ? <X color={palette.ink} size={16} /> : <Check color={palette.onPrimary} size={16} />} />)}</View>
          {buttons.includes("approve") ? <Text style={[styles.swipeHint, { color: palette.muted }]}>{t.swipeHint}</Text> : null}
        </AdminCard>
      </Animated.View>
    </GestureDetector>
  );
}

function actionLabel(action: InboxButton, t: ReturnType<typeof useAdminCopy>) {
  if (action === "approve") return t.approve;
  if (action === "reject") return t.reject;
  if (action === "revoke") return t.revokeDevice;
  if (action === "close") return t.closeTicket;
  if (action === "advance") return t.updateStage;
  if (action === "reply") return t.reply;
  return t.markPaid;
}

const styles = StyleSheet.create({
  segmentRow: { gap: 7, paddingBottom: 2 }, itemCard: { gap: 12 }, itemTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 }, itemTitle: { fontFamily: fonts.bodyStrong, fontSize: 16 }, itemSubtitle: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }, itemMeta: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }, metaText: { fontFamily: fonts.body, fontSize: 11 }, amount: { marginLeft: "auto", fontFamily: fonts.bodyStrong, fontSize: 14 }, actions: { flexDirection: "row", gap: 8 }, swipeHint: { fontFamily: fonts.body, fontSize: 10, textAlign: "right", marginTop: -5 }, error: { borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 7 }, errorText: { fontFamily: fonts.bodyStrong, fontSize: 12 }
});

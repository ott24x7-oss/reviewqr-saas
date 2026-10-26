import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCode from "react-native-qrcode-svg";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Check, ChevronRight, MessageCircle, Package, Send, Shield, Smartphone, X } from "lucide-react-native";
import { adminFetch, useAdminAudit, useAdminSettings, useAdminShopOrders, useAdminSupport, useAdminWhatsApp } from "./api";
import type { AdminShopOrder, AdminSupportTicket } from "./types";
import { useAdminCopy } from "./copy";
import { AdminCard, AdminRow } from "./components";
import { AdminAction, AdminFrame, AdminLoadState, AdminStatus, openAdminWeb } from "./screen-kit";
import { useAdminScreenCapture, useAdminSecurity } from "./security";
import { Field } from "../ui/controls";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";
import { formatAdminDate, formatAdminMoney } from "./format";

const pipeline = ["PAID", "PROOF", "PRINTING", "PACKED", "SHIPPED", "DELIVERED"];

export function AdminShopScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const query = useAdminShopOrders();
  const params = useLocalSearchParams<{ id?: string }>();
  const [stage, setStage] = useState("ALL");
  const [tracking, setTracking] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const orders = useMemo(() => (query.data ?? []).filter((order) => stage === "ALL" || order.status === stage).sort((a, b) => Number(b.id === params.id) - Number(a.id === params.id)), [params.id, query.data, stage]);
  const stageLabel: Record<string, string> = { ALL: t.all, PAID: t.paidStage, PROOF: t.proofStage, PRINTING: t.printing, PACKED: t.packed, SHIPPED: t.shipped, DELIVERED: t.delivered };
  async function update(order: AdminShopOrder, next: string, action: string, code = "") {
    setWorking(order.id); setError(false);
    try {
      await adminFetch("/shop/orders/action", { method: "POST", body: JSON.stringify({ id: order.id, action, status: next, trackingNumber: code }) });
      await query.refetch(); setTracking("");
    } catch { setError(true); }
    finally { setWorking(null); }
  }
  function nextStage(order: AdminShopOrder) { return pipeline[Math.min(pipeline.indexOf(order.status) + 1, pipeline.length - 1)] ?? "DELIVERED"; }
  return (
    <AdminFrame title={t.shop} subtitle={t.shopSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} form back>
      <View style={styles.pipeline}>{pipeline.map((item, index) => <View key={item} style={styles.pipelineStep}><View style={[styles.stepDot, { backgroundColor: palette.primary }]}><Text style={[styles.stepIndex, { color: palette.onPrimary }]}>{index + 1}</Text></View><Text style={[styles.stepLabel, { color: palette.muted }]}>{stageLabel[item]}</Text></View>)}</View>
      <AdminCard style={styles.stockCard}><View style={[styles.stockIcon, { backgroundColor: palette.accentSoft }]}><Package color={palette.primary} size={19} /></View><View style={{ flex: 1 }}><Text style={[styles.stockTitle, { color: palette.ink }]}>{t.productionStock}</Text><Text style={[styles.stockCaption, { color: palette.muted }]}>{t.productionStockCaption}</Text></View><ChevronRight color={palette.muted} size={18} /></AdminCard>
      <View style={styles.stages}>{["ALL", ...pipeline].map((item) => <Pressable key={item} onPress={() => setStage(item)} style={[styles.stageChip, { backgroundColor: stage === item ? palette.accentSoft : palette.card, borderColor: stage === item ? palette.primary : palette.line }]}><Text style={[styles.stageText, { color: stage === item ? palette.primary : palette.muted }]}>{stageLabel[item]}</Text></Pressable>)}</View>
      {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={query.isSuccess && orders.length === 0}>
        {orders.map((order) => <AdminCard key={order.id} style={styles.orderCard}>
          <View style={styles.orderHead}><View style={{ flex: 1 }}><Text style={[styles.orderTitle, { color: palette.ink }]}>{order.business}</Text><Text style={[styles.orderSubtitle, { color: palette.muted }]}>{order.quantity} × {order.item} · {formatAdminMoney(order.amountPaise, lang)}</Text></View><AdminStatus label={stageLabel[order.status] ?? order.status} /></View>
          <View style={styles.orderMeta}><Text style={[styles.meta, { color: palette.muted }]}>{order.id.toUpperCase()} · {formatAdminDate(order.createdAt, lang)}</Text>{order.trackingNumber ? <Text style={[styles.metaStrong, { color: palette.primary }]}>{order.trackingNumber}</Text> : null}</View>
          {order.status === "PROOF" ? <View style={[styles.proof, { backgroundColor: palette.paper }]}>{order.proofUrl ? <Image source={{ uri: order.proofUrl }} style={styles.proofImage} /> : <Package color={palette.primary} size={24} />}<Text style={[styles.meta, { color: palette.muted }]}>{t.proof} · {t.proofReady}</Text></View> : null}
          {order.status === "SHIPPED" ? <Text style={[styles.metaStrong, { color: palette.success }]}>{t.tracking}: {order.trackingNumber}</Text> : null}
          {order.status === "PACKED" || order.status === "SHIPPED" ? <Field label={t.tracking} value={tracking} onChangeText={setTracking} autoCapitalize="characters" returnKeyType="done" /> : null}
          <AdminAction label={working === order.id ? t.loading : order.status === "PROOF" ? t.approveProof : order.status === "SHIPPED" ? t.delivered : `${t.updateStage}: ${stageLabel[nextStage(order)]}`} onPress={() => update(order, nextStage(order), order.status === "PROOF" ? "approve-proof" : "update-status", tracking).catch(() => undefined)} disabled={working === order.id || order.status === "DELIVERED" || (order.status === "PACKED" && tracking.trim().length < 3)} icon={working === order.id ? <ActivityIndicator color={palette.onPrimary} /> : <Check color={palette.onPrimary} size={16} />} />
        </AdminCard>)}
      </AdminLoadState>
    </AdminFrame>
  );
}

export function AdminSupportScreen() {
  const t = useAdminCopy();
  const { palette } = useTheme();
  const query = useAdminSupport();
  const params = useLocalSearchParams<{ id?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(params.id ?? null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function reply(ticket: AdminSupportTicket) {
    if (!message.trim()) return;
    setBusy(true); setError(false);
    try { await adminFetch(`/support/${ticket.id}/reply`, { method: "POST", body: JSON.stringify({ message: message.trim() }) }); await query.refetch(); setMessage(""); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  async function closeTicket(ticket: AdminSupportTicket) {
    setBusy(true);
    try { await adminFetch(`/support/${ticket.id}/action`, { method: "POST", body: JSON.stringify({ action: "close" }) }); await query.refetch(); setSelectedId(null); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  return (
    <AdminFrame title={t.support} subtitle={t.supportSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} form back>
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={query.isSuccess && query.data.length === 0}>
        {query.data?.map((ticket) => <Pressable key={ticket.id} onPress={() => setSelectedId(selectedId === ticket.id ? null : ticket.id)}><AdminCard style={[styles.ticketCard, selectedId === ticket.id && { borderColor: palette.primary }]}>
          <View style={styles.orderHead}><View style={{ flex: 1 }}><Text style={[styles.orderTitle, { color: palette.ink }]}>{ticket.subject}</Text><Text style={[styles.orderSubtitle, { color: palette.muted }]}>{ticket.business} · {ticket.phoneMasked}</Text></View><AdminStatus label={ticket.status} /></View>
          <Text style={[styles.meta, { color: palette.muted }]}>{ticket.updatedAt} · {t.ticket.toLowerCase()} {ticket.id}</Text>
          {selectedId === ticket.id ? <>
            <View style={[styles.thread, { borderTopColor: palette.line }]}>{ticket.messages.map((item) => <View key={item.id} style={[styles.messageBubble, { backgroundColor: palette.paper }]}><Text style={[styles.messageFrom, { color: palette.primary }]}>{item.from} · {item.createdAt}</Text><Text style={[styles.messageText, { color: palette.ink }]}>{item.text}</Text></View>)}</View>
            <Field label={t.message} value={message} onChangeText={setMessage} multiline returnKeyType="send" />
            {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
            <View style={styles.actionRow}><AdminAction label={busy ? t.loading : t.reply} onPress={() => reply(ticket).catch(() => undefined)} disabled={!message.trim() || busy} icon={<Send color={palette.onPrimary} size={15} />} /><AdminAction label={t.closeTicket} tone="outline" onPress={() => closeTicket(ticket).catch(() => undefined)} disabled={busy} icon={<Check color={palette.ink} size={15} />} /></View>
            <AdminAction label={t.whatsappOwner} tone="outline" onPress={() => openAdminWeb(`support/tickets/${ticket.id}`)} icon={<MessageCircle color={palette.ink} size={15} />} />
          </> : null}
        </AdminCard></Pressable>)}
      </AdminLoadState>
    </AdminFrame>
  );
}

export function AdminWhatsAppScreen() {
  useAdminScreenCapture("admin-whatsapp");
  const t = useAdminCopy();
  const { palette } = useTheme();
  const query = useAdminWhatsApp();
  const { requestStepUpToken } = useAdminSecurity();
  const [pairVisible, setPairVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [error, setError] = useState(false);
  async function reconnect() {
    setBusy(true); setError(false);
    try { const token = await requestStepUpToken("whatsapp_pairing"); if (!token) return; await adminFetch("/whatsapp/action", { method: "POST", headers: { "X-Step-Up": token }, body: JSON.stringify({ action: "reconnect" }) }); setPairVisible(true); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  async function sendTest() {
    setBusy(true); setError(false);
    try { await adminFetch("/whatsapp/action", { method: "POST", body: JSON.stringify({ action: "test-message" }) }); setTestSent(true); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  return (
    <AdminFrame title={t.whatsapp} subtitle={t.whatsappSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} back>
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()}>
        {query.data ? <>
          <AdminCard style={styles.whatsappHero}><View style={[styles.whatsappIcon, { backgroundColor: query.data.senderStatus === "CONNECTED" ? `${palette.success}18` : `${palette.warning}18` }]}><MessageCircle color={query.data.senderStatus === "CONNECTED" ? palette.success : palette.warning} size={23} /></View><View style={{ flex: 1 }}><Text style={[styles.whatsappTitle, { color: palette.ink }]}>{t.sender}</Text><Text style={[styles.whatsappPhone, { color: palette.muted }]}>{query.data.phoneMasked}</Text></View><AdminStatus label={query.data.senderStatus} /></AdminCard>
          <AdminAction label={busy ? t.loading : t.reconnect} onPress={() => reconnect().catch(() => undefined)} disabled={busy} icon={busy ? <ActivityIndicator color={palette.onPrimary} /> : <Shield color={palette.onPrimary} size={16} />} />
          <AdminCard style={styles.templateCard}><Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.cloudApi}</Text>{query.data.cloudTemplates.map((template) => <AdminRow key={template.name} title={template.name.replaceAll("_", " ")} subtitle={t.templateStatus} trailing={<AdminStatus label={template.status} />} />)}</AdminCard>
          <AdminCard style={styles.ownPhone}><View style={[styles.ownIcon, { backgroundColor: palette.accentSoft }]}><Smartphone color={palette.primary} size={18} /></View><View style={{ flex: 1 }}><Text style={[styles.ownTitle, { color: palette.ink }]}>{t.testMessage}</Text><Text style={[styles.ownHint, { color: palette.muted }]}>{t.ownPhone}: {query.data.phoneMasked}</Text></View></AdminCard>
          {testSent ? <Text style={[styles.success, { color: palette.success }]}>{t.testSent}</Text> : null}
          {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
          <AdminAction label={t.testMessage} tone="outline" onPress={() => sendTest().catch(() => undefined)} disabled={busy} icon={<Send color={palette.ink} size={16} />} />
        </> : null}
      </AdminLoadState>
      <Modal visible={pairVisible} animationType="slide" onRequestClose={() => setPairVisible(false)}>
        <View style={[styles.pairPage, { backgroundColor: palette.bg }]}><Pressable accessibilityRole="button" onPress={() => setPairVisible(false)} style={[styles.closePair, { backgroundColor: palette.card }]}><X color={palette.ink} size={21} /></Pressable><View style={[styles.qrFrame, { backgroundColor: palette.paper }]}><QRCode value={query.data?.pairingQr ?? "qr24x7-admin-pairing"} size={234} color={palette.ink} backgroundColor={palette.paper} /></View><Text style={[styles.pairTitle, { color: palette.ink }]}>{t.pairing}</Text><Text style={[styles.pairText, { color: palette.muted }]}>{t.pairingHelp}</Text></View>
      </Modal>
    </AdminFrame>
  );
}

export function AdminSettingsScreen() {
  const t = useAdminCopy();
  const { palette } = useTheme();
  const query = useAdminSettings();
  const [banner, setBanner] = useState<string | null>(null);
  const [teamDepth, setTeamDepth] = useState<string | null>(null);
  const [shareCap, setShareCap] = useState<string | null>(null);
  const [tds, setTds] = useState<string | null>(null);
  const [minimum, setMinimum] = useState<string | null>(null);
  const [latest, setLatest] = useState<string | null>(null);
  const [autoApprove, setAutoApprove] = useState<boolean | null>(null);
  const [lockMinutes, setLockMinutes] = useState("2");
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const { requestStepUpToken } = useAdminSecurity();
  const current = query.data;
  const currentBanner = banner ?? current?.maintenanceBanner ?? "";
  const currentDepth = teamDepth ?? String(current?.teamDepth ?? 4);
  const currentShare = shareCap ?? String(current?.shareCapPercent ?? 80);
  const currentTds = tds ?? String(current?.tdsPercent ?? 10);
  const currentMin = minimum ?? String(current?.minVersionCode ?? 1);
  const currentLatest = latest ?? String(current?.latestVersionCode ?? 1);
  const currentAuto = autoApprove ?? current?.autoApproveAgents ?? false;
  async function saveSettings() {
    if (!current) return;
    setSaving(true); setError(false);
    try {
      await adminFetch("/settings", { method: "PUT", body: JSON.stringify({ maintenanceBanner: currentBanner, autoApproveAgents: currentAuto, teamDepth: Number(currentDepth), shareCapPercent: Number(currentShare), tdsPercent: Number(currentTds), minVersionCode: Number(currentMin), latestVersionCode: Number(currentLatest) }) });
      await query.refetch();
    } catch { setError(true); }
    finally { setSaving(false); }
  }
  async function deviceAction(deviceId: string, action: string) {
    let token: string | null = null;
    if (action === "approve") token = await requestStepUpToken("approve_device", deviceId);
    if (action === "approve" && !token) return;
    try { await adminFetch(`/devices/${deviceId}/action`, { method: "POST", headers: token ? { "X-Step-Up": token } : undefined, body: JSON.stringify({ action }) }); await query.refetch(); }
    catch { setError(true); }
  }
  async function saveLockTimeout(value: string) { setLockMinutes(value); await AsyncStorage.setItem("reviewqr.admin.lockTimeout", value).catch(() => undefined); }
  async function toggleNotifications(value: boolean) { setNotifications(value); await AsyncStorage.setItem("reviewqr.admin.notifications.enabled", String(value)).catch(() => undefined); }
  return (
    <AdminFrame title={t.settings} subtitle={t.settingsSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} form back>
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()}>
        {current ? <>
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.systemSettings}</Text>
          <AdminCard style={styles.formCard}>
            <Field label={t.maintenance} value={currentBanner} onChangeText={setBanner} multiline returnKeyType="done" />
            <View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: palette.ink }]}>{t.autoApprove}</Text><Text style={[styles.settingHint, { color: palette.muted }]}>{t.autoApproveHint}</Text></View><Switch value={currentAuto} onValueChange={setAutoApprove} trackColor={{ true: palette.primary }} /></View>
            <View style={styles.twoFields}><View style={{ flex: 1 }}><Field label={t.teamDepth} value={currentDepth} onChangeText={setTeamDepth} keyboardType="number-pad" /></View><View style={{ flex: 1 }}><Field label={t.shareCap} value={currentShare} onChangeText={setShareCap} keyboardType="number-pad" /></View></View>
            <View style={styles.twoFields}><View style={{ flex: 1 }}><Field label={t.tdsRate} value={currentTds} onChangeText={setTds} keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Field label={t.minVersion} value={currentMin} onChangeText={setMinimum} keyboardType="number-pad" /></View></View>
            <Field label={t.latestVersion} value={currentLatest} onChangeText={setLatest} keyboardType="number-pad" />
            <Text style={[styles.flagTitle, { color: palette.ink }]}>{t.featureFlags}</Text>
            {current.flags.map((flag) => <View key={flag.name} style={styles.switchRow}><Text style={[styles.settingTitle, { color: palette.ink, flex: 1 }]}>{flag.name}</Text><Switch value={flag.enabled} onValueChange={(enabled) => { const next = { ...current, flags: current.flags.map((item) => item.name === flag.name ? { ...item, enabled } : item) }; adminFetch("/settings", { method: "PUT", body: JSON.stringify({ flags: next.flags }) }).then(() => query.refetch()).catch(() => setError(true)); }} trackColor={{ true: palette.primary }} /></View>)}
            {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
            <AdminAction label={saving ? t.loading : t.save} onPress={() => saveSettings().catch(() => undefined)} disabled={saving} icon={saving ? <ActivityIndicator color={palette.onPrimary} /> : <Check color={palette.onPrimary} size={16} />} />
          </AdminCard>
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.devicesTitle}</Text>
          <AdminCard style={styles.deviceList}>{current.devices.map((device) => <View key={device.id} style={[styles.deviceRow, { borderBottomColor: palette.line }]}><View style={[styles.deviceIcon, { backgroundColor: palette.accentSoft }]}><Smartphone color={palette.primary} size={18} /></View><View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: palette.ink }]}>{device.name}</Text><Text style={[styles.settingHint, { color: palette.muted }]}>{device.lastSeenAt}</Text></View><AdminStatus label={device.status} /><AdminAction label={device.status === "PENDING" ? t.approve : t.revokeDevice} tone={device.status === "PENDING" ? "primary" : "outline"} onPress={() => deviceAction(device.id, device.status === "PENDING" ? "approve" : "revoke").catch(() => undefined)} /></View>)}</AdminCard>
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.appSecurity}</Text>
          <AdminCard style={styles.formCard}><Field label={t.lockTimeout} value={lockMinutes} onChangeText={saveLockTimeout} keyboardType="number-pad" /><View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: palette.ink }]}>{t.notificationPrefs}</Text><Text style={[styles.settingHint, { color: palette.muted }]}>{t.adminAlerts}</Text></View><Switch value={notifications} onValueChange={toggleNotifications} trackColor={{ true: palette.primary }} /></View></AdminCard>
        </> : null}
      </AdminLoadState>
    </AdminFrame>
  );
}

export function AdminAuditScreen() {
  const t = useAdminCopy();
  const { palette } = useTheme();
  const { lang } = useI18n();
  const query = useAdminAudit();
  const [needle, setNeedle] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = useMemo(() => (query.data ?? []).filter((item) => `${item.admin} ${item.action} ${item.target}`.toLowerCase().includes(needle.toLowerCase())), [needle, query.data]);
  return (
    <AdminFrame title={t.audit} subtitle={t.auditSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} form back>
      <Field label={t.filterAudit} value={needle} onChangeText={setNeedle} autoCapitalize="none" returnKeyType="search" />
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={query.isSuccess && rows.length === 0}>
        {rows.map((item) => <Pressable key={item.id} onPress={() => setExpanded(expanded === item.id ? null : item.id)}><AdminCard style={styles.auditCard}>
          <View style={styles.auditTop}><View style={{ flex: 1 }}><Text style={[styles.auditAction, { color: palette.ink }]}>{item.action}</Text><Text style={[styles.auditTarget, { color: palette.muted }]}>{item.target}</Text></View><Text style={[styles.auditTime, { color: palette.muted }]}>{formatAdminDate(item.createdAt, lang)}</Text></View>
          <Text style={[styles.auditAdmin, { color: palette.primary }]}>{item.admin}{item.reason ? ` · ${item.reason}` : ""}</Text>
          {expanded === item.id ? <View style={[styles.jsonBox, { backgroundColor: palette.paper }]}><Text style={[styles.jsonLabel, { color: palette.muted }]}>{t.before}</Text><Text selectable style={[styles.jsonText, { color: palette.ink }]}>{JSON.stringify(item.before, null, 2)}</Text><Text style={[styles.jsonLabel, { color: palette.muted }]}>{t.after}</Text><Text selectable style={[styles.jsonText, { color: palette.ink }]}>{JSON.stringify(item.after, null, 2)}</Text></View> : null}
        </AdminCard></Pressable>)}
      </AdminLoadState>
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  pipeline: { flexDirection: "row", justifyContent: "space-between", gap: 2 }, pipelineStep: { flex: 1, alignItems: "center", gap: 5 }, stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" }, stepIndex: { fontFamily: fonts.bodyStrong, fontSize: 10 }, stepLabel: { fontFamily: fonts.body, fontSize: 8, textAlign: "center" }, stockCard: { flexDirection: "row", alignItems: "center", gap: 10 }, stockIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, stockTitle: { fontFamily: fonts.bodyStrong, fontSize: 13 }, stockCaption: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, stages: { flexDirection: "row", gap: 6, flexWrap: "wrap" }, stageChip: { minHeight: 34, borderRadius: 999, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1 }, stageText: { fontFamily: fonts.bodyStrong, fontSize: 10 }, orderCard: { gap: 12 }, orderHead: { flexDirection: "row", alignItems: "center", gap: 10 }, orderTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 }, orderSubtitle: { fontFamily: fonts.body, fontSize: 12, marginTop: 3 }, orderMeta: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, meta: { fontFamily: fonts.body, fontSize: 10 }, metaStrong: { fontFamily: fonts.bodyStrong, fontSize: 11 }, proof: { minHeight: 56, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8, padding: 8 }, proofImage: { width: 40, height: 40, borderRadius: 9 }, error: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  ticketCard: { gap: 10, borderWidth: 1 }, thread: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 8 }, messageBubble: { borderRadius: 14, padding: 12, gap: 5 }, messageFrom: { fontFamily: fonts.bodyStrong, fontSize: 10 }, messageText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }, actionRow: { flexDirection: "row", gap: 8 },
  whatsappHero: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 10 }, whatsappIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" }, whatsappTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 }, whatsappPhone: { fontFamily: fonts.body, fontSize: 12, marginTop: 3 }, templateCard: { gap: 7 }, sectionTitle: { fontFamily: fonts.bodyStrong, fontSize: 16 }, ownPhone: { flexDirection: "row", alignItems: "center", gap: 10 }, ownIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, ownTitle: { fontFamily: fonts.bodyStrong, fontSize: 13 }, ownHint: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, success: { fontFamily: fonts.bodyStrong, fontSize: 13 }, pairPage: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 15 }, closePair: { position: "absolute", top: 54, right: 20, width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" }, qrFrame: { padding: 20, borderRadius: 24 }, pairTitle: { fontFamily: fonts.title, fontSize: 23 }, pairText: { fontFamily: fonts.body, fontSize: 15, textAlign: "center", maxWidth: 300, lineHeight: 21 },
  formCard: { gap: 14 }, switchRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10 }, settingTitle: { fontFamily: fonts.bodyStrong, fontSize: 13 }, settingHint: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, twoFields: { flexDirection: "row", gap: 10 }, flagTitle: { fontFamily: fonts.bodyStrong, fontSize: 14 }, deviceList: { gap: 8 }, deviceRow: { minHeight: 70, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 8 }, deviceIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" }, appSecurity: { fontFamily: fonts.bodyStrong, fontSize: 16 }, auditCard: { gap: 9 }, auditTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 }, auditAction: { fontFamily: fonts.bodyStrong, fontSize: 14 }, auditTarget: { fontFamily: fonts.body, fontSize: 12, marginTop: 3 }, auditTime: { fontFamily: fonts.body, fontSize: 10 }, auditAdmin: { fontFamily: fonts.bodyStrong, fontSize: 11 }, jsonBox: { borderRadius: 12, padding: 11, gap: 4 }, jsonLabel: { fontFamily: fonts.bodyStrong, fontSize: 10, marginTop: 4 }, jsonText: { fontFamily: "monospace", fontSize: 10, lineHeight: 15 }
});

import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Check, MessageCircle, Package, Send, Shield, Smartphone, X } from "lucide-react-native";
import { adminApi, useAdminAudit, useAdminDevices, useAdminSettings, useAdminShopOrders, useAdminTicket, useAdminTickets, useAdminWhatsApp } from "./api";
import type { AdminNotifyPrefs, AdminSettings, AdminSettingsPatch, AdminShopOrder, AdminShopOrderStatus, AdminTicket } from "./types";
import { useAdminCopy } from "./copy";
import { AdminCard, AdminRow } from "./components";
import { AdminAction, AdminFrame, AdminLoadState, AdminStatus, openAdminWeb } from "./screen-kit";
import { useAdminScreenCapture, useAdminSecurity } from "./security";
import { maskPhone, SHOP_PIPELINE } from "./view";
import { Field } from "../ui/controls";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";
import { formatAdminDate, formatAdminMoney } from "./format";

export function AdminShopScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const [stage, setStage] = useState<AdminShopOrderStatus | undefined>(undefined);
  const query = useAdminShopOrders(stage);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const orders = useMemo(() => [...(query.data?.items ?? [])].sort((a, b) => Number(b.id === params.id) - Number(a.id === params.id)), [params.id, query.data]);
  const stageLabel: Partial<Record<AdminShopOrderStatus, string>> = { PAID: t.paidStage, PROOF_SENT: t.proofStage, APPROVED: t.approved, PRINTING: t.printing, PACKED: t.packed, SHIPPED: t.shipped, DELIVERED: t.delivered };
  async function run(order: AdminShopOrder, work: () => Promise<unknown>) {
    setWorking(order.id); setError(false);
    try { await work(); await query.refetch(); setTracking((current) => ({ ...current, [order.id]: "" })); }
    catch { setError(true); }
    finally { setWorking(null); }
  }
  // The server picks the next legal stage (it knows which lines need NFC), via the inbox "advance" action.
  const advance = (order: AdminShopOrder) => run(order, () => adminApi.inboxAction({ segment: "shop", action: "advance", id: order.id }));
  const approveProof = (order: AdminShopOrder) => run(order, () => adminApi.shopAction(order.id, { action: "approve-proof" }));
  const saveTracking = (order: AdminShopOrder) => run(order, () => adminApi.shopAction(order.id, { action: "tracking", awb: (tracking[order.id] ?? "").trim() }));
  const lowStock = query.data?.lowStock ?? [];
  return (
    <AdminFrame title={t.shop} subtitle={t.shopSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} form back>
      <View style={styles.pipeline}>{SHOP_PIPELINE.map((item, index) => <View key={item} style={styles.pipelineStep}><View style={[styles.stepDot, { backgroundColor: palette.primary }]}><Text style={[styles.stepIndex, { color: palette.onPrimary }]}>{index + 1}</Text></View><Text style={[styles.stepLabel, { color: palette.muted }]}>{stageLabel[item]}</Text></View>)}</View>
      <AdminCard style={styles.stockCard}><View style={[styles.stockIcon, { backgroundColor: palette.accentSoft }]}><Package color={palette.primary} size={19} /></View><View style={{ flex: 1 }}><Text style={[styles.stockTitle, { color: palette.ink }]}>{t.productionStock}</Text><Text style={[styles.stockCaption, { color: palette.muted }]}>{lowStock.length ? lowStock.slice(0, 3).map((row) => `${row.name}: ${row.stock}`).join(" · ") : t.productionStockCaption}</Text></View>{lowStock.length ? <AdminStatus label={`${lowStock.length} low`} /> : null}</AdminCard>
      <View style={styles.stages}>{[undefined, ...SHOP_PIPELINE].map((item) => <Pressable key={item ?? "ALL"} onPress={() => setStage(item)} style={[styles.stageChip, { backgroundColor: stage === item ? palette.accentSoft : palette.card, borderColor: stage === item ? palette.primary : palette.line }]}><Text style={[styles.stageText, { color: stage === item ? palette.primary : palette.muted }]}>{item ? stageLabel[item] : t.all}</Text></Pressable>)}</View>
      {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={query.isSuccess && orders.length === 0}>
        {orders.map((order) => {
          const busy = working === order.id;
          const canTrack = order.status === "PACKED" || order.status === "PICKUP_SCHEDULED" || order.status === "SHIPPED";
          const done = order.status === "DELIVERED" || order.status === "CANCELLED";
          return <AdminCard key={order.id} style={styles.orderCard}>
            <View style={styles.orderHead}><View style={{ flex: 1 }}><Text style={[styles.orderTitle, { color: palette.ink }]}>{order.business ?? order.name ?? "—"}</Text><Text style={[styles.orderSubtitle, { color: palette.muted }]}>{[order.name, order.phone, formatAdminMoney(order.totalPaise, lang)].filter(Boolean).join(" · ")}</Text></View><AdminStatus label={stageLabel[order.status] ?? order.status} /></View>
            <View style={styles.orderMeta}><Text style={[styles.meta, { color: palette.muted }]}>{order.invoiceNumber ?? order.id} · {formatAdminDate(order.createdAt, lang)}</Text></View>
            {order.status === "PROOF_SENT" ? <View style={[styles.proof, { backgroundColor: palette.paper }]}><Package color={palette.primary} size={24} /><Text style={[styles.meta, { color: palette.muted }]}>{t.proof} · {t.proofReady}</Text></View> : null}
            {canTrack ? <Field label={t.tracking} value={tracking[order.id] ?? ""} onChangeText={(value) => setTracking((current) => ({ ...current, [order.id]: value }))} autoCapitalize="characters" returnKeyType="done" /> : null}
            {canTrack ? <AdminAction label={busy ? t.loading : t.tracking} tone="outline" onPress={() => saveTracking(order).catch(() => undefined)} disabled={busy || (tracking[order.id] ?? "").trim().length < 4} /> : null}
            {order.status === "PROOF_SENT"
              ? <AdminAction label={busy ? t.loading : t.approveProof} onPress={() => approveProof(order).catch(() => undefined)} disabled={busy} icon={busy ? <ActivityIndicator color={palette.onPrimary} /> : <Check color={palette.onPrimary} size={16} />} />
              : <AdminAction label={busy ? t.loading : t.updateStage} onPress={() => advance(order).catch(() => undefined)} disabled={busy || done} icon={busy ? <ActivityIndicator color={palette.onPrimary} /> : <Check color={palette.onPrimary} size={16} />} />}
          </AdminCard>;
        })}
      </AdminLoadState>
    </AdminFrame>
  );
}

export function AdminSupportScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const query = useAdminTickets();
  const params = useLocalSearchParams<{ id?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(params.id ?? null);
  const detail = useAdminTicket(selectedId);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const client = useQueryClient();
  async function send(ticket: AdminTicket, body: { body?: string; status?: "OPEN" | "CLOSED" }) {
    setBusy(true); setError(false);
    try {
      await adminApi.ticketAction(ticket.id, body);
      await client.invalidateQueries({ queryKey: ["admin", "support"] });
      if (body.body) setMessage("");
      if (body.status === "CLOSED") setSelectedId(null);
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  return (
    <AdminFrame title={t.support} subtitle={t.supportSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} form back>
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={query.isSuccess && query.data.length === 0}>
        {query.data?.map((ticket) => <Pressable key={ticket.id} onPress={() => setSelectedId(selectedId === ticket.id ? null : ticket.id)}><AdminCard style={[styles.ticketCard, selectedId === ticket.id && { borderColor: palette.primary }]}>
          <View style={styles.orderHead}><View style={{ flex: 1 }}><Text style={[styles.orderTitle, { color: palette.ink }]}>{ticket.subject}</Text><Text style={[styles.orderSubtitle, { color: palette.muted }]}>{[ticket.name, ticket.email, ticket.phone].filter(Boolean).join(" · ")}</Text></View><AdminStatus label={ticket.status} /></View>
          <Text style={[styles.meta, { color: palette.muted }]}>{formatAdminDate(ticket.updatedAt, lang)} · {t.ticket.toLowerCase()} {ticket.id}</Text>
          {selectedId === ticket.id ? <>
            {detail.isLoading ? <ActivityIndicator color={palette.primary} /> : null}
            {detail.data ? <View style={[styles.thread, { borderTopColor: palette.line }]}>{detail.data.messages.map((item) => <View key={item.id} style={[styles.messageBubble, { backgroundColor: palette.paper }]}><Text style={[styles.messageFrom, { color: palette.primary }]}>{item.authorId === detail.data?.user.id ? detail.data.user.name || detail.data.user.email : t.admin} · {formatAdminDate(item.createdAt, lang)}</Text><Text style={[styles.messageText, { color: palette.ink }]}>{item.body}</Text></View>)}</View> : null}
            <Field label={t.message} value={message} onChangeText={setMessage} multiline returnKeyType="send" />
            {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
            <View style={styles.actionRow}><AdminAction label={busy ? t.loading : t.reply} onPress={() => send(ticket, { body: message.trim() }).catch(() => undefined)} disabled={!message.trim() || busy} icon={<Send color={palette.onPrimary} size={15} />} /><AdminAction label={t.closeTicket} tone="outline" onPress={() => send(ticket, { status: "CLOSED" }).catch(() => undefined)} disabled={busy || ticket.status === "CLOSED"} icon={<Check color={palette.ink} size={15} />} /></View>
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
  const { lang } = useI18n();
  const { palette } = useTheme();
  const [pairVisible, setPairVisible] = useState(false);
  // While pairing, poll so the QR (and then "connected") shows up as soon as the server has it.
  const query = useAdminWhatsApp(pairVisible ? 3000 : false);
  const { withStepUp } = useAdminSecurity();
  const [busy, setBusy] = useState(false);
  const [testSent, setTestSent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  async function reconnect() {
    setBusy(true); setError(false);
    try {
      const done = await withStepUp("whatsapp_pairing", (stepUp) => adminApi.whatsappReconnect(stepUp ?? ""), true);
      if (done === null) return;
      setPairVisible(true);
      await query.refetch();
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  async function sendTest() {
    setBusy(true); setError(false);
    try { const sent = await adminApi.whatsappTest(); setTestSent(sent.to); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  const info = query.data;
  const connected = info?.status === "connected";
  return (
    <AdminFrame title={t.whatsapp} subtitle={t.whatsappSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} back>
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()}>
        {info ? <>
          <AdminCard style={styles.whatsappHero}><View style={[styles.whatsappIcon, { backgroundColor: connected ? `${palette.success}18` : `${palette.warning}18` }]}><MessageCircle color={connected ? palette.success : palette.warning} size={23} /></View><View style={{ flex: 1 }}><Text style={[styles.whatsappTitle, { color: palette.ink }]}>{t.sender}</Text><Text style={[styles.whatsappPhone, { color: palette.muted }]}>{maskPhone(info.phoneNumber) || "—"}{info.connectedAt ? ` · ${formatAdminDate(info.connectedAt, lang)}` : ""}</Text>{info.error ? <Text style={[styles.whatsappPhone, { color: palette.danger }]}>{info.error}</Text> : null}</View><AdminStatus label={info.status} /></AdminCard>
          <AdminAction label={busy ? t.loading : t.reconnect} onPress={() => reconnect().catch(() => undefined)} disabled={busy} icon={busy ? <ActivityIndicator color={palette.onPrimary} /> : <Shield color={palette.onPrimary} size={16} />} />
          <AdminCard style={styles.templateCard}><Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.healthWhatsapp} · {t.today}</Text>
            <AdminRow title="WhatsApp" trailing={<Text style={[styles.ownTitle, { color: palette.ink }]}>{info.delivery.counts.whatsapp}</Text>} />
            <AdminRow title="Email" trailing={<Text style={[styles.ownTitle, { color: palette.ink }]}>{info.delivery.counts.email}</Text>} />
            {info.delivery.lastAt ? <AdminRow title={info.delivery.lastChannel ?? "—"} subtitle={formatAdminDate(info.delivery.lastAt, lang)} /> : null}
          </AdminCard>
          <AdminCard style={styles.ownPhone}><View style={[styles.ownIcon, { backgroundColor: palette.accentSoft }]}><Smartphone color={palette.primary} size={18} /></View><View style={{ flex: 1 }}><Text style={[styles.ownTitle, { color: palette.ink }]}>{t.testMessage}</Text><Text style={[styles.ownHint, { color: palette.muted }]}>{t.ownPhone}</Text></View></AdminCard>
          {testSent ? <Text style={[styles.success, { color: palette.success }]}>{t.testSent} · {testSent}</Text> : null}
          {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
          <AdminAction label={t.testMessage} tone="outline" onPress={() => sendTest().catch(() => undefined)} disabled={busy} icon={<Send color={palette.ink} size={16} />} />
        </> : null}
      </AdminLoadState>
      <Modal visible={pairVisible} animationType="slide" onRequestClose={() => setPairVisible(false)}>
        <View style={[styles.pairPage, { backgroundColor: palette.bg }]}><Pressable accessibilityRole="button" onPress={() => setPairVisible(false)} style={[styles.closePair, { backgroundColor: palette.card }]}><X color={palette.ink} size={21} /></Pressable>
          <View style={[styles.qrFrame, { backgroundColor: palette.paper }]}>{info?.qrPng ? <Image source={{ uri: info.qrPng }} style={styles.qrImage} resizeMode="contain" /> : connected ? <Check color={palette.success} size={64} /> : <ActivityIndicator color={palette.primary} />}</View>
          <Text style={[styles.pairTitle, { color: palette.ink }]}>{t.pairing}</Text><Text style={[styles.pairText, { color: palette.muted }]}>{connected ? t.connected : t.pairingHelp}</Text></View>
      </Modal>
    </AdminFrame>
  );
}

const NOTIFY_KEYS: (keyof AdminNotifyPrefs)[] = ["paidPayment", "failedPayment", "signup", "agentPending", "printProof", "payoutDue", "supportTicket", "whatsappDown"];

export function AdminSettingsScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const query = useAdminSettings();
  const devices = useAdminDevices();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null);
  const [autoApprove, setAutoApprove] = useState<boolean | null>(null);
  const [lockMinutes, setLockMinutes] = useState("2");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const { withStepUp } = useAdminSecurity();
  const current = query.data;
  const value = (field: string, fallback: string | number | undefined) => draft[field] ?? String(fallback ?? "");
  const edit = (field: string) => (text: string) => setDraft((prev) => ({ ...prev, [field]: text }));

  async function patch(body: AdminSettingsPatch) {
    // Share and TDS changes need a change_settings step-up.
    const sensitive = body.minSharePercent !== undefined || body.maxSharePercent !== undefined || body.tdsPercent !== undefined || body.tdsYearlyThresholdPaise !== undefined;
    setSaving(true); setError(false);
    try {
      const done = await withStepUp("change_settings", (stepUp) => adminApi.patchSettings(body, stepUp), sensitive);
      if (done === null) return;
      setDraft({});
      setMaintenanceMode(null);
      setAutoApprove(null);
      await query.refetch();
    } catch { setError(true); }
    finally { setSaving(false); }
  }

  function saveSettings() {
    if (!current) return;
    const body: AdminSettingsPatch = {};
    const number = (field: keyof AdminSettings & keyof AdminSettingsPatch) => {
      if (draft[field] === undefined) return;
      const next = Number(draft[field]);
      if (Number.isFinite(next) && next !== current[field]) (body as Record<string, number>)[field] = Math.round(next);
    };
    if (draft.maintenanceMessage !== undefined && draft.maintenanceMessage !== current.maintenanceMessage) body.maintenanceMessage = draft.maintenanceMessage;
    if (maintenanceMode !== null && maintenanceMode !== current.maintenanceMode) body.maintenanceMode = maintenanceMode;
    if (autoApprove !== null && autoApprove !== current.autoApproveSubAgents) body.autoApproveSubAgents = autoApprove;
    number("maxTeamDepth"); number("minSharePercent"); number("maxSharePercent"); number("tdsPercent"); number("minVersionCode"); number("latestVersionCode");
    if (!Object.keys(body).length) return;
    patch(body).catch(() => undefined);
  }

  async function deviceAction(deviceId: string, action: "approve" | "revoke") {
    setError(false);
    try {
      const done = await withStepUp("approve_device", (stepUp) => adminApi.deviceAction(deviceId, action, stepUp), action === "approve");
      if (done !== null) await devices.refetch();
    } catch { setError(true); }
  }
  async function saveLockTimeout(next: string) { setLockMinutes(next); await AsyncStorage.setItem("reviewqr.admin.lockTimeout", next).catch(() => undefined); }
  return (
    <AdminFrame title={t.settings} subtitle={t.settingsSubtitle} refreshing={query.isRefetching} onRefresh={() => { query.refetch(); devices.refetch(); }} form back>
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()}>
        {current ? <>
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.systemSettings}</Text>
          <AdminCard style={styles.formCard}>
            <View style={styles.switchRow}><Text style={[styles.settingTitle, { color: palette.ink, flex: 1 }]}>{t.maintenance}</Text><Switch value={maintenanceMode ?? current.maintenanceMode} onValueChange={setMaintenanceMode} trackColor={{ true: palette.primary }} /></View>
            <Field label={t.maintenance} value={value("maintenanceMessage", current.maintenanceMessage)} onChangeText={edit("maintenanceMessage")} multiline maxLength={240} returnKeyType="done" />
            <View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: palette.ink }]}>{t.autoApprove}</Text><Text style={[styles.settingHint, { color: palette.muted }]}>{t.autoApproveHint}</Text></View><Switch value={autoApprove ?? current.autoApproveSubAgents} onValueChange={setAutoApprove} trackColor={{ true: palette.primary }} /></View>
            <View style={styles.twoFields}><View style={{ flex: 1 }}><Field label={t.teamDepth} value={value("maxTeamDepth", current.maxTeamDepth)} onChangeText={edit("maxTeamDepth")} keyboardType="number-pad" /></View><View style={{ flex: 1 }}><Field label={t.tdsRate} value={value("tdsPercent", current.tdsPercent)} onChangeText={edit("tdsPercent")} keyboardType="number-pad" /></View></View>
            <View style={styles.twoFields}><View style={{ flex: 1 }}><Field label={`${t.share} min %`} value={value("minSharePercent", current.minSharePercent)} onChangeText={edit("minSharePercent")} keyboardType="number-pad" /></View><View style={{ flex: 1 }}><Field label={t.shareCap} value={value("maxSharePercent", current.maxSharePercent)} onChangeText={edit("maxSharePercent")} keyboardType="number-pad" /></View></View>
            <View style={styles.twoFields}><View style={{ flex: 1 }}><Field label={t.minVersion} value={value("minVersionCode", current.minVersionCode)} onChangeText={edit("minVersionCode")} keyboardType="number-pad" /></View><View style={{ flex: 1 }}><Field label={t.latestVersion} value={value("latestVersionCode", current.latestVersionCode)} onChangeText={edit("latestVersionCode")} keyboardType="number-pad" /></View></View>
            <Text style={[styles.flagTitle, { color: palette.ink }]}>{t.featureFlags}</Text>
            {Object.entries(current.flags).map(([name, enabled]) => <View key={name} style={styles.switchRow}><Text style={[styles.settingTitle, { color: palette.ink, flex: 1 }]}>{name}</Text><Switch value={enabled} disabled={saving} onValueChange={(next) => patch({ flags: { [name]: next } }).catch(() => undefined)} trackColor={{ true: palette.primary }} /></View>)}
            {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
            <AdminAction label={saving ? t.loading : t.save} onPress={saveSettings} disabled={saving} icon={saving ? <ActivityIndicator color={palette.onPrimary} /> : <Check color={palette.onPrimary} size={16} />} />
          </AdminCard>
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.devicesTitle}</Text>
          <AdminCard style={styles.deviceList}>{(devices.data ?? []).map((device) => <View key={device.id} style={[styles.deviceRow, { borderBottomColor: palette.line }]}><View style={[styles.deviceIcon, { backgroundColor: palette.accentSoft }]}><Smartphone color={palette.primary} size={18} /></View><View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: palette.ink }]}>{device.name} · {device.adminName}</Text><Text style={[styles.settingHint, { color: palette.muted }]}>{device.platform}{device.lastSeenAt ? ` · ${formatAdminDate(device.lastSeenAt, lang)}` : ""}</Text></View><AdminStatus label={device.status} />{device.status !== "REVOKED" ? <AdminAction label={device.status === "PENDING" ? t.approve : t.revokeDevice} tone={device.status === "PENDING" ? "primary" : "outline"} onPress={() => deviceAction(device.id, device.status === "PENDING" ? "approve" : "revoke").catch(() => undefined)} /> : null}</View>)}</AdminCard>
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.notificationPrefs}</Text>
          <AdminCard style={styles.formCard}>{NOTIFY_KEYS.map((name) => <View key={name} style={styles.switchRow}><Text style={[styles.settingTitle, { color: palette.ink, flex: 1 }]}>{name.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</Text><Switch value={current.notify[name]} disabled={saving} onValueChange={(next) => patch({ notify: { [name]: next } }).catch(() => undefined)} trackColor={{ true: palette.primary }} /></View>)}</AdminCard>
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.appSecurity}</Text>
          <AdminCard style={styles.formCard}><Field label={t.lockTimeout} value={lockMinutes} onChangeText={saveLockTimeout} keyboardType="number-pad" /></AdminCard>
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
  const all = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const rows = useMemo(() => all.filter((item) => `${item.adminName ?? ""} ${item.action} ${item.entity} ${item.entityId ?? ""}`.toLowerCase().includes(needle.toLowerCase())), [needle, all]);
  return (
    <AdminFrame title={t.audit} subtitle={t.auditSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} form back>
      <Field label={t.filterAudit} value={needle} onChangeText={setNeedle} autoCapitalize="none" returnKeyType="search" />
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={query.isSuccess && rows.length === 0}>
        {rows.map((item) => <Pressable key={item.id} onPress={() => setExpanded(expanded === item.id ? null : item.id)}><AdminCard style={styles.auditCard}>
          <View style={styles.auditTop}><View style={{ flex: 1 }}><Text style={[styles.auditAction, { color: palette.ink }]}>{item.action}</Text><Text style={[styles.auditTarget, { color: palette.muted }]}>{item.entity}{item.entityId ? ` · ${item.entityId}` : ""}</Text></View><Text style={[styles.auditTime, { color: palette.muted }]}>{formatAdminDate(item.createdAt, lang)}</Text></View>
          <Text style={[styles.auditAdmin, { color: palette.primary }]}>{item.adminName ?? t.admin}{item.reason ? ` · ${item.reason}` : ""}</Text>
          {expanded === item.id ? <View style={[styles.jsonBox, { backgroundColor: palette.paper }]}><Text style={[styles.jsonLabel, { color: palette.muted }]}>{t.before}</Text><Text selectable style={[styles.jsonText, { color: palette.ink }]}>{JSON.stringify(item.before, null, 2)}</Text><Text style={[styles.jsonLabel, { color: palette.muted }]}>{t.after}</Text><Text selectable style={[styles.jsonText, { color: palette.ink }]}>{JSON.stringify(item.after, null, 2)}</Text></View> : null}
        </AdminCard></Pressable>)}
      </AdminLoadState>
      {query.hasNextPage ? <AdminAction label={query.isFetchingNextPage ? t.loading : t.more} tone="outline" onPress={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} /> : null}
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  pipeline: { flexDirection: "row", justifyContent: "space-between", gap: 2 }, pipelineStep: { flex: 1, alignItems: "center", gap: 5 }, stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" }, stepIndex: { fontFamily: fonts.bodyStrong, fontSize: 10 }, stepLabel: { fontFamily: fonts.body, fontSize: 8, textAlign: "center" }, stockCard: { flexDirection: "row", alignItems: "center", gap: 10 }, stockIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, stockTitle: { fontFamily: fonts.bodyStrong, fontSize: 13 }, stockCaption: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, stages: { flexDirection: "row", gap: 6, flexWrap: "wrap" }, stageChip: { minHeight: 34, borderRadius: 999, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1 }, stageText: { fontFamily: fonts.bodyStrong, fontSize: 10 }, orderCard: { gap: 12 }, orderHead: { flexDirection: "row", alignItems: "center", gap: 10 }, orderTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 }, orderSubtitle: { fontFamily: fonts.body, fontSize: 12, marginTop: 3 }, orderMeta: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, meta: { fontFamily: fonts.body, fontSize: 10 }, proof: { minHeight: 56, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8, padding: 8 }, error: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  ticketCard: { gap: 10, borderWidth: 1 }, thread: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 8 }, messageBubble: { borderRadius: 14, padding: 12, gap: 5 }, messageFrom: { fontFamily: fonts.bodyStrong, fontSize: 10 }, messageText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 }, actionRow: { flexDirection: "row", gap: 8 },
  whatsappHero: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 10 }, whatsappIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" }, whatsappTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 }, whatsappPhone: { fontFamily: fonts.body, fontSize: 12, marginTop: 3 }, templateCard: { gap: 7 }, sectionTitle: { fontFamily: fonts.bodyStrong, fontSize: 16 }, ownPhone: { flexDirection: "row", alignItems: "center", gap: 10 }, ownIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, ownTitle: { fontFamily: fonts.bodyStrong, fontSize: 13 }, ownHint: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, success: { fontFamily: fonts.bodyStrong, fontSize: 13 }, pairPage: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 15 }, closePair: { position: "absolute", top: 54, right: 20, width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" }, qrFrame: { padding: 20, borderRadius: 24, minWidth: 274, minHeight: 274, alignItems: "center", justifyContent: "center" }, qrImage: { width: 234, height: 234 }, pairTitle: { fontFamily: fonts.title, fontSize: 23 }, pairText: { fontFamily: fonts.body, fontSize: 15, textAlign: "center", maxWidth: 300, lineHeight: 21 },
  formCard: { gap: 14 }, switchRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10 }, settingTitle: { fontFamily: fonts.bodyStrong, fontSize: 13 }, settingHint: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, twoFields: { flexDirection: "row", gap: 10 }, flagTitle: { fontFamily: fonts.bodyStrong, fontSize: 14 }, deviceList: { gap: 8 }, deviceRow: { minHeight: 70, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 8 }, deviceIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" }, auditCard: { gap: 9 }, auditTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 }, auditAction: { fontFamily: fonts.bodyStrong, fontSize: 14 }, auditTarget: { fontFamily: fonts.body, fontSize: 12, marginTop: 3 }, auditTime: { fontFamily: fonts.body, fontSize: 10 }, auditAdmin: { fontFamily: fonts.bodyStrong, fontSize: 11 }, jsonBox: { borderRadius: 12, padding: 11, gap: 4 }, jsonLabel: { fontFamily: fonts.bodyStrong, fontSize: 10, marginTop: 4 }, jsonText: { fontFamily: "monospace", fontSize: 10, lineHeight: 15 }
});

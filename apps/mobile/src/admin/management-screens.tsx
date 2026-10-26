import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Edit3, Pause, Play, Users } from "lucide-react-native";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { adminFetch, useAdminPlans, useAdminTeam } from "./api";
import type { AdminPlan, AdminTeamMember } from "./types";
import { useAdminCopy } from "./copy";
import { AdminCard, AdminRow } from "./components";
import { AdminAction, AdminFrame, AdminLoadState, AdminStatus } from "./screen-kit";
import { formatAdminMoney, formatAdminCompact } from "./format";
import { useAdminSecurity } from "./security";
import { Field } from "../ui/controls";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";

export function AdminPlansScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const query = useAdminPlans();
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [price, setPrice] = useState("");
  const [modules, setModules] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const client = useQueryClient();
  const { requestStepUpToken } = useAdminSecurity();

  function startEdit(plan: AdminPlan) { setEditing(plan); setPrice(String(Math.round(plan.pricePaise / 100))); setModules(plan.modules.join(", ")); setError(false); }
  async function toggle(plan: AdminPlan, field: "active" | "visible", value: boolean) {
    try { await adminFetch(`/plans/${plan.id}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) }); await client.invalidateQueries({ queryKey: ["admin", "plans"] }); }
    catch { setError(true); }
  }
  async function savePlan() {
    if (!editing || !Number.isFinite(Number(price)) || Number(price) < 0) return;
    setSaving(true); setError(false);
    try {
      const nextModules = modules.split(",").map((value) => value.trim()).filter(Boolean);
      const pricePaise = Math.round(Number(price) * 100);
      const changedSensitive = pricePaise !== editing.pricePaise || nextModules.join("|") !== editing.modules.join("|");
      let token: string | null = null;
      if (changedSensitive) token = await requestStepUpToken(pricePaise !== editing.pricePaise ? "change_plan_price" : "change_plan_modules", editing.id);
      if (changedSensitive && !token) return;
      await adminFetch(`/plans/${editing.id}`, { method: "PATCH", headers: token ? { "X-Step-Up": token } : undefined, body: JSON.stringify({ pricePaise, modules: nextModules }) });
      await client.invalidateQueries({ queryKey: ["admin", "plans"] });
      setEditing(null);
    } catch { setError(true); }
    finally { setSaving(false); }
  }

  return (
    <AdminFrame title={t.plans} subtitle={t.plansSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} back>
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={query.isSuccess && query.data.length === 0}>
        {query.data?.map((plan) => <AdminCard key={plan.id} style={styles.planCard}>
          <View style={styles.planTop}><View style={[styles.planIcon, { backgroundColor: palette.accentSoft }]}><Users color={palette.primary} size={18} /></View><View style={{ flex: 1 }}><Text style={[styles.planName, { color: palette.ink }]}>{lang === "hi" ? plan.nameHi : plan.nameEn}</Text><Text style={[styles.planCaption, { color: palette.muted }]}>{plan.durationDays} {t.days} · {plan.modules.length} {t.modules.toLowerCase()}</Text></View>{plan.badge ? <AdminStatus label={plan.badge} /> : null}</View>
          <View style={styles.priceRow}><Text style={[styles.price, { color: palette.ink }]}>{formatAdminMoney(plan.pricePaise, lang)}</Text><Text style={[styles.duration, { color: palette.muted }]}>/ {plan.durationDays} {t.days}</Text></View>
          <View style={styles.modulePills}>{plan.modules.map((module) => <View key={module} style={[styles.modulePill, { backgroundColor: palette.paper }]}><Text style={[styles.moduleText, { color: palette.muted }]}>{module}</Text></View>)}</View>
          <View style={[styles.switchRow, { borderTopColor: palette.line }]}><Text style={[styles.switchLabel, { color: palette.ink }]}>{t.visible}</Text><Switch value={plan.visible} onValueChange={(value) => toggle(plan, "visible", value)} trackColor={{ true: palette.primary }} thumbColor={palette.onPrimary} /><Text style={[styles.switchLabel, { color: palette.ink }]}>{t.active}</Text><Switch value={plan.active} onValueChange={(value) => toggle(plan, "active", value)} trackColor={{ true: palette.primary }} thumbColor={palette.onPrimary} /></View>
          <AdminAction label={t.editPlan} tone="outline" onPress={() => startEdit(plan)} icon={<Edit3 color={palette.ink} size={16} />} />
        </AdminCard>)}
      </AdminLoadState>
      <AdminAction label={t.editOnWeb} tone="outline" onPress={() => import("./screen-kit").then(({ openAdminWeb }) => openAdminWeb("plans"))} icon={<ChevronRight color={palette.ink} size={17} />} />
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]} onPress={() => setEditing(null)} />
          <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" bottomOffset={20} contentContainerStyle={styles.sheetScroll}>
            <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.line }]}><Text style={[styles.sheetTitle, { color: palette.ink }]}>{t.editPlan} · {editing?.nameEn}</Text><Text style={[styles.sheetHint, { color: palette.muted }]}>{t.stepUpRequired}</Text>
              <Field label={t.priceRupees} value={price} onChangeText={setPrice} keyboardType="decimal-pad" returnKeyType="done" />
              <Field label={t.featureModules} value={modules} onChangeText={setModules} multiline returnKeyType="done" />
              {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
              <AdminAction label={saving ? t.loading : t.save} onPress={() => savePlan().catch(() => undefined)} disabled={saving} icon={saving ? <ActivityIndicator color={palette.onPrimary} /> : <Check color={palette.onPrimary} size={16} />} />
              <AdminAction label={t.stepUpCancel} tone="outline" onPress={() => setEditing(null)} />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </AdminFrame>
  );
}

export function AdminTeamScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const query = useAdminTeam();
  const params = useLocalSearchParams<{ id?: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(params.id ?? null);
  const [share, setShare] = useState(70);
  const [leader, setLeader] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(false);
  const client = useQueryClient();
  const selected = query.data?.members.find((member) => member.id === selectedId) ?? null;
  const hierarchy = useMemo(() => query.data?.members ?? [], [query.data]);
  async function action(member: AdminTeamMember, name: string, values: Record<string, unknown> = {}) {
    setWorking(true); setError(false);
    try { await adminFetch(`/team/${member.id}/action`, { method: "POST", body: JSON.stringify({ action: name, ...values }) }); await client.invalidateQueries({ queryKey: ["admin", "team"] }); }
    catch { setError(true); }
    finally { setWorking(false); }
  }
  return (
    <AdminFrame title={t.team} subtitle={t.teamSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} form back>
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={query.isSuccess && hierarchy.length === 0}>
        {query.data ? <>
          <AdminCard style={styles.teamSummary}><View style={[styles.teamIcon, { backgroundColor: palette.accentSoft }]}><Users color={palette.primary} size={21} /></View><View style={{ flex: 1 }}><Text style={[styles.summaryTitle, { color: palette.ink }]}>{hierarchy.length} {t.teamMembers}</Text><Text style={[styles.summaryCaption, { color: palette.muted }]}>{t.maxDepth}: {query.data.maxDepth}</Text></View><Text style={[styles.summaryBig, { color: palette.primary }]}>{query.data.members.filter((member) => member.status === "PENDING").length}</Text></AdminCard>
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.teamTree}</Text>
          {hierarchy.map((member) => <Pressable key={member.id} onPress={() => { setSelectedId(member.id); setShare(member.sharePercent); setLeader(member.leader ?? ""); }}><AdminCard style={[styles.memberCard, { borderColor: selectedId === member.id ? palette.primary : palette.line }]}>
            <View style={styles.memberHead}><View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}><Text style={[styles.avatarText, { color: palette.primary }]}>{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</Text></View><View style={{ flex: 1 }}><Text style={[styles.memberName, { color: palette.ink }]}>{member.name}</Text><Text style={[styles.memberLead, { color: palette.muted }]}>{member.leader ? `${t.leader}: ${member.leader}` : t.teamLeader}</Text></View><AdminStatus label={member.status} /></View>
            <View style={[styles.memberStats, { borderTopColor: palette.line }]}><MemberMetric label={t.share} value={`${member.sharePercent}%`} /><MemberMetric label={t.monthSales} value={formatAdminCompact(member.monthSalesPaise, lang)} /><MemberMetric label={t.businesses} value={String(member.businesses)} /></View>
          </AdminCard></Pressable>)}
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.leaderboard}</Text>
          <AdminCard style={styles.leaderboard}>{query.data.leaderboard.map((row, index) => <AdminRow key={row.id} title={`${index + 1}. ${row.name}`} subtitle={`${t.monthSales} ${formatAdminCompact(row.salesPaise, lang)} · ${t.override} ${formatAdminCompact(row.overridesPaise, lang)}`} trailing={<Text style={[styles.rank, { color: palette.primary }]}>#{index + 1}</Text>} />)}</AdminCard>
          {selected ? <>
            <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.agentDetails}</Text>
            <AdminCard style={styles.detailCard}>
              <Text style={[styles.detailName, { color: palette.ink }]}>{selected.name}</Text>
              <View style={[styles.memberStats, { borderTopColor: palette.line }]}><MemberMetric label={t.monthSales} value={formatAdminCompact(selected.monthSalesPaise, lang)} /><MemberMetric label={t.businesses} value={String(selected.businesses)} /><MemberMetric label={t.share} value={`${selected.sharePercent}%`} /></View>
              <Text style={[styles.shareLabel, { color: palette.ink }]}>{t.memberShare}: {share}%</Text>
              <Pressable accessibilityRole="adjustable" accessibilityValue={{ min: 20, max: 80, now: share }} onPress={(event) => { const width = event.nativeEvent.locationX / 260; setShare(Math.max(20, Math.min(80, Math.round(20 + width * 60)))); }} style={[styles.shareTrack, { backgroundColor: palette.line }]}><View style={[styles.shareFill, { backgroundColor: palette.primary, width: `${((share - 20) / 60) * 100}%` }]} /><View style={[styles.shareThumb, { left: `${((share - 20) / 60) * 100}%`, backgroundColor: palette.onPrimary, borderColor: palette.primary }]} /></Pressable>
              <Text style={[styles.example, { color: palette.muted }]}>{t.exampleCommission}: {formatAdminMoney(20_000, lang)} · {t.member}: {formatAdminMoney(Math.round(20_000 * share / 100), lang)} · {t.you}: {formatAdminMoney(Math.round(20_000 * (100 - share) / 100), lang)}</Text>
              <Field label={t.moveLeader} value={leader} onChangeText={setLeader} placeholder={t.leaderName} returnKeyType="done" />
              {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
              <View style={styles.actionRow}><AdminAction label={selected.status === "PAUSED" ? t.resume : t.pause} tone="outline" onPress={() => action(selected, selected.status === "PAUSED" ? "resume" : "pause").catch(() => undefined)} disabled={working} icon={selected.status === "PAUSED" ? <Play color={palette.ink} size={16} /> : <Pause color={palette.ink} size={16} />} /><AdminAction label={t.save} onPress={() => action(selected, "update", { sharePercent: share, leader: leader.trim() || null }).catch(() => undefined)} disabled={working} icon={working ? <ActivityIndicator color={palette.onPrimary} /> : <Check color={palette.onPrimary} size={16} />} /></View>
              {selected.status === "PENDING" ? <View style={styles.actionRow}><AdminAction label={t.approve} onPress={() => action(selected, "approve").catch(() => undefined)} disabled={working} /><AdminAction label={t.reject} tone="outline" onPress={() => action(selected, "reject").catch(() => undefined)} disabled={working} /></View> : null}
            </AdminCard>
          </> : null}
        </> : null}
      </AdminLoadState>
    </AdminFrame>
  );
}

function MemberMetric({ label, value }: { label: string; value: string }) {
  const { palette } = useTheme();
  return <View style={{ flex: 1, gap: 3 }}><Text style={[styles.metricLabel, { color: palette.muted }]}>{label}</Text><Text style={[styles.metricValue, { color: palette.ink }]} numberOfLines={1}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  planCard: { gap: 13 }, planTop: { flexDirection: "row", alignItems: "center", gap: 10 }, planIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" }, planName: { fontFamily: fonts.bodyStrong, fontSize: 16 }, planCaption: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, priceRow: { flexDirection: "row", alignItems: "baseline", gap: 5 }, price: { fontFamily: fonts.title, fontSize: 27 }, duration: { fontFamily: fonts.body, fontSize: 12 }, modulePills: { flexDirection: "row", gap: 6, flexWrap: "wrap" }, modulePill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 }, moduleText: { fontFamily: fonts.body, fontSize: 10 }, switchRow: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, switchLabel: { fontFamily: fonts.bodyStrong, fontSize: 11 },
  modalRoot: { flex: 1, justifyContent: "flex-end" }, sheetScroll: { flexGrow: 1, justifyContent: "flex-end" }, sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, padding: 22, paddingBottom: 28, gap: 14 }, sheetTitle: { fontFamily: fonts.title, fontSize: 21 }, sheetHint: { fontFamily: fonts.body, fontSize: 13 }, error: { fontFamily: fonts.bodyStrong, fontSize: 12 },
  teamSummary: { flexDirection: "row", alignItems: "center", gap: 12 }, teamIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" }, summaryTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 }, summaryCaption: { fontFamily: fonts.body, fontSize: 11, marginTop: 2 }, summaryBig: { fontFamily: fonts.title, fontSize: 21 }, sectionTitle: { fontFamily: fonts.bodyStrong, fontSize: 16, marginTop: 4 }, memberCard: { gap: 12, borderWidth: 1 }, memberHead: { flexDirection: "row", alignItems: "center", gap: 10 }, avatar: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, avatarText: { fontFamily: fonts.bodyStrong, fontSize: 13 }, memberName: { fontFamily: fonts.bodyStrong, fontSize: 14 }, memberLead: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, memberStats: { flexDirection: "row", gap: 9, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth }, metricLabel: { fontFamily: fonts.body, fontSize: 10 }, metricValue: { fontFamily: fonts.bodyStrong, fontSize: 12 }, leaderboard: { paddingVertical: 2 }, rank: { fontFamily: fonts.title, fontSize: 15 }, detailCard: { gap: 13 }, detailName: { fontFamily: fonts.title, fontSize: 20 }, shareLabel: { fontFamily: fonts.bodyStrong, fontSize: 13 }, shareTrack: { height: 9, borderRadius: 5, justifyContent: "center", marginVertical: 8 }, shareFill: { height: 9, borderRadius: 5 }, shareThumb: { position: "absolute", width: 22, height: 22, borderRadius: 11, borderWidth: 2, marginLeft: -11 }, example: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 }, actionRow: { flexDirection: "row", gap: 8 }
});

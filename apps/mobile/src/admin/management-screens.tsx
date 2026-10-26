import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Edit3, Pause, Play, Users } from "lucide-react-native";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { adminApi, useAdminPlans, useAdminTeam } from "./api";
import type { AdminPlan, AdminPlanDuration, AdminPlanPatch, AdminTeamActionBody, AdminTeamAgent } from "./types";
import { useAdminCopy } from "./copy";
import { AdminCard } from "./components";
import { AdminAction, AdminFrame, AdminLoadState, AdminStatus } from "./screen-kit";
import { formatAdminMoney } from "./format";
import { useAdminSecurity } from "./security";
import { Field } from "../ui/controls";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";

const durationLabel = (duration: AdminPlanDuration) => duration === "MONTH_1" ? "1 mo" : duration === "MONTH_6" ? "6 mo" : duration === "YEAR_1" ? "1 yr" : "Lifetime";

export function AdminPlansScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const query = useAdminPlans();
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [duration, setDuration] = useState<AdminPlanDuration>("MONTH_1");
  const [price, setPrice] = useState("");
  const [modules, setModules] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const client = useQueryClient();
  const { withStepUp } = useAdminSecurity();

  function pickDuration(plan: AdminPlan, next: AdminPlanDuration) {
    setDuration(next);
    const current = plan.prices.find((row) => row.duration === next);
    setPrice(current ? String(Math.round(current.pricePaise / 100)) : "");
  }
  function startEdit(plan: AdminPlan) {
    setEditing(plan);
    setModules(plan.modules.join(", "));
    setError(false);
    pickDuration(plan, (plan.prices.find((row) => row.active) ?? plan.prices[0])?.duration ?? "MONTH_1");
  }
  async function toggle(plan: AdminPlan, patch: AdminPlanPatch) {
    try { await adminApi.patchPlan(plan.id, patch); await client.invalidateQueries({ queryKey: ["admin", "plans"] }); }
    catch { setError(true); }
  }
  async function savePlan() {
    if (!editing) return;
    const rupees = Number(price);
    const nextModules = modules.split(",").map((value) => value.trim()).filter(Boolean);
    const current = editing.prices.find((row) => row.duration === duration);
    const pricePaise = price.trim() && Number.isFinite(rupees) && rupees >= 0 ? Math.round(rupees * 100) : undefined;
    const priceChanged = pricePaise !== undefined && pricePaise !== current?.pricePaise;
    const modulesChanged = nextModules.join("|") !== editing.modules.join("|");
    if (!priceChanged && !modulesChanged) { setEditing(null); return; }
    // A price is set per duration. Either change needs a change_plan_price or change_plan_modules step-up.
    const patch: AdminPlanPatch = { ...(priceChanged ? { duration, pricePaise } : {}), ...(modulesChanged ? { modules: nextModules } : {}) };
    setSaving(true); setError(false);
    try {
      const done = await withStepUp(priceChanged ? "change_plan_price" : "change_plan_modules", (stepUp) => adminApi.patchPlan(editing.id, patch, stepUp), true);
      if (done === null) return;
      await client.invalidateQueries({ queryKey: ["admin", "plans"] });
      setEditing(null);
    } catch { setError(true); }
    finally { setSaving(false); }
  }

  return (
    <AdminFrame title={t.plans} subtitle={t.plansSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} back>
      {error && !editing ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={query.isSuccess && query.data.length === 0}>
        {query.data?.map((plan) => <AdminCard key={plan.id} style={styles.planCard}>
          <View style={styles.planTop}><View style={[styles.planIcon, { backgroundColor: palette.accentSoft }]}><Users color={palette.primary} size={18} /></View><View style={{ flex: 1 }}><Text style={[styles.planName, { color: palette.ink }]}>{lang === "hi" ? plan.nameHi : plan.nameEn}</Text><Text style={[styles.planCaption, { color: palette.muted }]}>{plan.slug} · {plan.modules.length} {t.modules.toLowerCase()}</Text></View>{plan.badge ? <AdminStatus label={plan.badge} /> : null}</View>
          {plan.prices.map((row) => <View key={row.duration} style={styles.priceRow}><Text style={[styles.price, { color: row.active ? palette.ink : palette.muted }]}>{formatAdminMoney(row.pricePaise, lang)}</Text><Text style={[styles.duration, { color: palette.muted }]}>/ {durationLabel(row.duration)}{row.mrpPaise ? ` · MRP ${formatAdminMoney(row.mrpPaise, lang)}` : ""}</Text></View>)}
          <View style={styles.modulePills}>{plan.modules.map((module) => <View key={module} style={[styles.modulePill, { backgroundColor: palette.paper }]}><Text style={[styles.moduleText, { color: palette.muted }]}>{module}</Text></View>)}</View>
          <View style={[styles.switchRow, { borderTopColor: palette.line }]}><Text style={[styles.switchLabel, { color: palette.ink }]}>{t.visible}</Text><Switch value={plan.visibleOnPricingPage} onValueChange={(value) => toggle(plan, { visibleOnPricingPage: value })} trackColor={{ true: palette.primary }} thumbColor={palette.onPrimary} /><Text style={[styles.switchLabel, { color: palette.ink }]}>{t.active}</Text><Switch value={plan.active} onValueChange={(value) => toggle(plan, { active: value })} trackColor={{ true: palette.primary }} thumbColor={palette.onPrimary} /></View>
          <AdminAction label={t.editPlan} tone="outline" onPress={() => startEdit(plan)} icon={<Edit3 color={palette.ink} size={16} />} />
        </AdminCard>)}
      </AdminLoadState>
      <AdminAction label={t.editOnWeb} tone="outline" onPress={() => import("./screen-kit").then(({ openAdminWeb }) => openAdminWeb("plans"))} icon={<ChevronRight color={palette.ink} size={17} />} />
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]} onPress={() => setEditing(null)} />
          <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" bottomOffset={20} contentContainerStyle={styles.sheetScroll}>
            <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.line }]}><Text style={[styles.sheetTitle, { color: palette.ink }]}>{t.editPlan} · {editing?.nameEn}</Text><Text style={[styles.sheetHint, { color: palette.muted }]}>{t.stepUpRequired}</Text>
              <View style={styles.chips}>{(["MONTH_1", "MONTH_6", "YEAR_1", "LIFETIME"] as const).map((item) => <Pressable key={item} onPress={() => editing && pickDuration(editing, item)} style={[styles.chip, { backgroundColor: duration === item ? palette.accentSoft : palette.paper, borderColor: duration === item ? palette.primary : palette.line }]}><Text style={[styles.chipText, { color: duration === item ? palette.primary : palette.ink }]}>{durationLabel(item)}</Text></Pressable>)}</View>
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
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(false);
  const client = useQueryClient();
  const agents = useMemo(() => query.data?.agents ?? [], [query.data]);
  const settings = query.data?.settings;
  const minShare = settings?.minSharePercent ?? 50;
  const maxShare = settings?.maxSharePercent ?? 90;
  const byId = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  function select(agent: AdminTeamAgent) {
    setSelectedId(agent.id);
    setShare(Math.max(minShare, Math.min(maxShare, agent.sharePercent ?? 70)));
    setError(false);
  }
  async function action(agent: AdminTeamAgent, body: Omit<AdminTeamActionBody, "id">) {
    setWorking(true); setError(false);
    try { await adminApi.teamAction({ id: agent.id, ...body }); await client.invalidateQueries({ queryKey: ["admin", "team"] }); }
    catch { setError(true); }
    finally { setWorking(false); }
  }
  const span = Math.max(1, maxShare - minShare);
  return (
    <AdminFrame title={t.team} subtitle={t.teamSubtitle} refreshing={query.isRefetching} onRefresh={() => query.refetch()} form back>
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()} empty={query.isSuccess && agents.length === 0}>
        {query.data ? <>
          <AdminCard style={styles.teamSummary}><View style={[styles.teamIcon, { backgroundColor: palette.accentSoft }]}><Users color={palette.primary} size={21} /></View><View style={{ flex: 1 }}><Text style={[styles.summaryTitle, { color: palette.ink }]}>{agents.length} {t.teamMembers}</Text><Text style={[styles.summaryCaption, { color: palette.muted }]}>{t.maxDepth}: {query.data.settings.maxTeamDepth} · {t.share} {minShare}–{maxShare}%</Text></View><Text style={[styles.summaryBig, { color: palette.primary }]}>{agents.filter((agent) => agent.status === "PENDING").length}</Text></AdminCard>
          {query.data.leaderboard.rows.length ? <>
            <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.leaderboard}</Text>
            {query.data.leaderboard.rows.map((row, index) => <AdminCard key={row.leaderId} style={styles.memberCard}>
              <View style={styles.memberHead}><Text style={[styles.memberName, { color: palette.ink }]}>{index + 1}. {row.name}</Text></View>
              <View style={styles.memberStats}><MemberMetric label={t.monthSales} value={formatAdminMoney(row.monthSalesPaise, lang)} /><MemberMetric label={t.override} value={formatAdminMoney(row.overridePaise, lang)} /></View>
            </AdminCard>)}
          </> : null}
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.teamTree}</Text>
          {agents.map((agent) => {
            const leader = agent.leaderId ? byId.get(agent.leaderId) : undefined;
            return <Pressable key={agent.id} onPress={() => select(agent)}><AdminCard style={[styles.memberCard, { borderColor: selectedId === agent.id ? palette.primary : palette.line, marginLeft: Math.max(0, agent.depth - 1) * 14 }]}>
              <View style={styles.memberHead}><View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}><Text style={[styles.avatarText, { color: palette.primary }]}>{agent.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</Text></View><View style={{ flex: 1 }}><Text style={[styles.memberName, { color: palette.ink }]}>{agent.name}</Text><Text style={[styles.memberLead, { color: palette.muted }]}>{leader ? `${t.leader}: ${leader.name}` : t.teamLeader}</Text></View><AdminStatus label={agent.status} /></View>
              <View style={[styles.memberStats, { borderTopColor: palette.line }]}><MemberMetric label={t.share} value={agent.sharePercent == null ? "—" : `${agent.sharePercent}%`} /><MemberMetric label={t.businessesCount} value={String(agent.businessCount)} /><MemberMetric label={t.maxDepth} value={String(agent.depth)} /></View>
            </AdminCard></Pressable>;
          })}
          {selected ? <>
            <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.agentDetails}</Text>
            <AdminCard style={styles.detailCard}>
              <Text style={[styles.detailName, { color: palette.ink }]}>{selected.name}</Text>
              <Text style={[styles.example, { color: palette.muted }]}>{selected.phone} · {selected.code}</Text>
              {selected.leaderId ? <>
                <Text style={[styles.shareLabel, { color: palette.ink }]}>{t.memberShare}: {share}%</Text>
                <Pressable accessibilityRole="adjustable" accessibilityValue={{ min: minShare, max: maxShare, now: share }} onPress={(event) => { const width = event.nativeEvent.locationX / 260; setShare(Math.max(minShare, Math.min(maxShare, Math.round(minShare + width * span)))); }} style={[styles.shareTrack, { backgroundColor: palette.line }]}><View style={[styles.shareFill, { backgroundColor: palette.primary, width: `${((share - minShare) / span) * 100}%` }]} /><View style={[styles.shareThumb, { left: `${((share - minShare) / span) * 100}%`, backgroundColor: palette.onPrimary, borderColor: palette.primary }]} /></Pressable>
                <Text style={[styles.example, { color: palette.muted }]}>{t.exampleCommission}: {formatAdminMoney(20_000, "en")} · {t.member}: {formatAdminMoney(Math.round(20_000 * share / 100), "en")}</Text>
                <AdminAction label={t.save} onPress={() => action(selected, { action: "share", sharePercent: share }).catch(() => undefined)} disabled={working} icon={working ? <ActivityIndicator color={palette.onPrimary} /> : <Check color={palette.onPrimary} size={16} />} />
              </> : null}
              <Text style={[styles.shareLabel, { color: palette.ink }]}>{t.moveLeader}</Text>
              <View style={styles.chips}>{agents.filter((agent) => agent.id !== selected.id && agent.id !== selected.leaderId).map((agent) => <Pressable key={agent.id} disabled={working} onPress={() => action(selected, { action: "move", leaderUserId: agent.userId }).catch(() => undefined)} style={[styles.chip, { backgroundColor: palette.paper, borderColor: palette.line }]}><Text style={[styles.chipText, { color: palette.ink }]}>{agent.name}</Text></Pressable>)}</View>
              {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
              {selected.status === "PENDING" ? <View style={styles.actionRow}><AdminAction label={t.approve} onPress={() => action(selected, { action: "approve" }).catch(() => undefined)} disabled={working} /><AdminAction label={t.reject} tone="outline" onPress={() => action(selected, { action: "reject" }).catch(() => undefined)} disabled={working} /></View>
                : <AdminAction label={selected.status === "PAUSED" ? t.resume : t.pause} tone="outline" onPress={() => action(selected, { action: selected.status === "PAUSED" ? "resume" : "pause" }).catch(() => undefined)} disabled={working} icon={selected.status === "PAUSED" ? <Play color={palette.ink} size={16} /> : <Pause color={palette.ink} size={16} />} />}
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
  planCard: { gap: 13 }, planTop: { flexDirection: "row", alignItems: "center", gap: 10 }, planIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" }, planName: { fontFamily: fonts.bodyStrong, fontSize: 16 }, planCaption: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, priceRow: { flexDirection: "row", alignItems: "baseline", gap: 5 }, price: { fontFamily: fonts.title, fontSize: 22 }, duration: { fontFamily: fonts.body, fontSize: 12 }, modulePills: { flexDirection: "row", gap: 6, flexWrap: "wrap" }, modulePill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 }, moduleText: { fontFamily: fonts.body, fontSize: 10 }, switchRow: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, switchLabel: { fontFamily: fonts.bodyStrong, fontSize: 11 },
  modalRoot: { flex: 1, justifyContent: "flex-end" }, sheetScroll: { flexGrow: 1, justifyContent: "flex-end" }, sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, padding: 22, paddingBottom: 28, gap: 14 }, sheetTitle: { fontFamily: fonts.title, fontSize: 21 }, sheetHint: { fontFamily: fonts.body, fontSize: 13 }, error: { fontFamily: fonts.bodyStrong, fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { minHeight: 38, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, justifyContent: "center" }, chipText: { fontFamily: fonts.bodyStrong, fontSize: 12 },
  teamSummary: { flexDirection: "row", alignItems: "center", gap: 12 }, teamIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" }, summaryTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 }, summaryCaption: { fontFamily: fonts.body, fontSize: 11, marginTop: 2 }, summaryBig: { fontFamily: fonts.title, fontSize: 21 }, sectionTitle: { fontFamily: fonts.bodyStrong, fontSize: 16, marginTop: 4 }, memberCard: { gap: 12, borderWidth: 1 }, memberHead: { flexDirection: "row", alignItems: "center", gap: 10 }, avatar: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, avatarText: { fontFamily: fonts.bodyStrong, fontSize: 13 }, memberName: { fontFamily: fonts.bodyStrong, fontSize: 14 }, memberLead: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, memberStats: { flexDirection: "row", gap: 9, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth }, metricLabel: { fontFamily: fonts.body, fontSize: 10 }, metricValue: { fontFamily: fonts.bodyStrong, fontSize: 12 }, detailCard: { gap: 13 }, detailName: { fontFamily: fonts.title, fontSize: 20 }, shareLabel: { fontFamily: fonts.bodyStrong, fontSize: 13 }, shareTrack: { height: 9, borderRadius: 5, justifyContent: "center", marginVertical: 8 }, shareFill: { height: 9, borderRadius: 5 }, shareThumb: { position: "absolute", width: 22, height: 22, borderRadius: 11, borderWidth: 2, marginLeft: -11 }, example: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 }, actionRow: { flexDirection: "row", gap: 8 }
});

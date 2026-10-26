import { useState } from "react";
import { Activity, ArrowUpRight, CircleCheck, CircleAlert, ExternalLink, MessageCircle, CreditCard, Users } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AdminCard, AdminChip, AdminSection, AdminRow } from "./components";
import { useAdminDashboard } from "./api";
import { AdminKpiGrid, AdminPlanDonut, AdminRevenueChart } from "./charts";
import { useAdminCopy } from "./copy";
import { formatAdminCompact } from "./format";
import { dashboardHealth, dashboardKpis, dashboardPlanMix, dashboardRevenue } from "./view";
import type { AdminRange } from "./types";
import { Field } from "../ui/controls";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";
import { withOpacity } from "../ui/tokens";
import { AdminAction, AdminFrame, AdminLoadState, openAdminWeb } from "./screen-kit";

const ranges: AdminRange[] = ["today", "7d", "30d", "mtd", "custom"];

export function AdminHomeScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const [range, setRange] = useState<AdminRange>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  function chooseRange(next: AdminRange) {
    if (next === "custom" && (!from || !to)) {
      const today = new Date();
      setTo(today.toISOString().slice(0, 10));
      setFrom(new Date(today.getTime() - 29 * 86_400_000).toISOString().slice(0, 10));
    }
    setRange(next);
  }
  const dashboard = useAdminDashboard(range, range === "custom" ? from : undefined, range === "custom" ? to : undefined);
  const queryRange = range === "30d" ? t.thirtyDays : range === "7d" ? t.sevenDays : range === "today" ? t.today : range === "custom" ? t.custom : t.mtd;
  const trend = dashboard.data ? dashboardRevenue(dashboard.data) : [];
  return (
    <AdminFrame title={t.home} subtitle={t.dashboardSubtitle} refreshing={dashboard.isRefetching} onRefresh={() => dashboard.refetch()} form={range === "custom"} right={<Pressable accessibilityLabel={t.openWeb} onPress={() => openAdminWeb("dashboard")} style={[styles.webButton, { borderColor: palette.line, backgroundColor: palette.card }]}><ExternalLink color={palette.primary} size={18} /></Pressable>}>
      <View style={styles.rangeRow}>
        {ranges.map((item) => <AdminChip key={item} label={item === "today" ? t.today : item === "7d" ? "7d" : item === "30d" ? "30d" : item === "mtd" ? t.mtd : t.custom} selected={range === item} onPress={() => chooseRange(item)} />)}
        <View style={[styles.live, { backgroundColor: `${palette.success}18` }]}><View style={[styles.liveDot, { backgroundColor: palette.success }]} /><Text style={[styles.liveText, { color: palette.success }]}>{t.live}</Text></View>
      </View>
      {range === "custom" ? <View style={styles.dateFields}><View style={{ flex: 1 }}><Field label={t.fromDate} value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" returnKeyType="done" /></View><View style={{ flex: 1 }}><Field label={t.toDate} value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" returnKeyType="done" /></View></View> : null}
      <AdminLoadState loading={dashboard.isLoading} error={dashboard.isError} retry={() => dashboard.refetch()}>
        {dashboard.data ? <>
          <AdminCard style={[styles.hero, { backgroundColor: palette.header }]}>
            <View style={styles.heroTop}><View style={[styles.heroIcon, { backgroundColor: withOpacity(palette.headerInk, 0.1) }]}><Activity color={palette.headerInk} size={18} /></View><Text style={[styles.heroEyebrow, { color: palette.headerInk }]}>{t.revenue} · {queryRange}</Text><ArrowUpRight color={palette.success} size={20} /></View>
            <Text style={[styles.heroAmount, { color: palette.headerInk }]}>{formatAdminCompact(dashboard.data.kpis.revenuePaise, lang)}</Text>
            <Text style={[styles.heroFoot, { color: withOpacity(palette.headerInk, 0.76) }]}>{t.dashboardRevenueCaption}</Text>
          </AdminCard>
          <AdminKpiGrid items={dashboardKpis(dashboard.data)} />
          <AdminSection title={t.revenueTrend} />
          <AdminRevenueChart points={trend} />
          <AdminSection title={t.planMix} />
          <AdminPlanDonut data={dashboardPlanMix(dashboard.data)} />
          <AdminSection title={t.topAgents} action={<Text style={[styles.viewAll, { color: palette.primary }]}>{t.thisMonth}</Text>} />
          <AdminCard style={styles.listCard}>
            {dashboard.data.leaderboard.rows.map((agent, index) => <AdminRow key={agent.agentId} icon={Users} title={`${index + 1}. ${agent.name}`} subtitle={`${dashboard.data?.leaderboard.label} · ${formatAdminCompact(agent.amountPaise, lang)}`} trailing={<Text style={[styles.agentRank, { color: palette.primary }]}>#{index + 1}</Text>} />)}
          </AdminCard>
          <AdminSection title={t.systemHealth} />
          <AdminCard style={styles.healthCard}>
            {dashboardHealth(dashboard.data).map((item) => <View key={item.key} style={[styles.healthRow, { borderBottomColor: palette.line }]}>
              <View style={[styles.healthIcon, { backgroundColor: item.healthy ? `${palette.success}18` : `${palette.danger}18` }]}>{item.healthy ? <CircleCheck size={17} color={palette.success} /> : <CircleAlert size={17} color={palette.danger} />}</View>
              <View style={{ flex: 1 }}><Text style={[styles.healthTitle, { color: palette.ink }]}>{healthLabel(item.key, t)}</Text><Text style={[styles.healthValue, { color: palette.muted }]}>{item.value}</Text></View>
              <View style={[styles.healthDot, { backgroundColor: item.healthy ? palette.success : palette.danger }]} />
            </View>)}
          </AdminCard>
          <AdminSection title={t.shortcuts} />
          <View style={styles.shortcuts}>
            <AdminAction label={t.inbox} onPress={() => import("expo-router").then(({ router }) => router.push("/(admin)/(tabs)/inbox"))} icon={<MessageCircle color={palette.onPrimary} size={17} />} />
            <AdminAction label={t.money} tone="outline" onPress={() => import("expo-router").then(({ router }) => router.push("/(admin)/(tabs)/money"))} icon={<CreditCard color={palette.ink} size={17} />} />
            <AdminAction label={t.openWeb} tone="outline" onPress={() => openAdminWeb("dashboard")} icon={<ExternalLink color={palette.ink} size={17} />} />
          </View>
        </> : null}</AdminLoadState>
    </AdminFrame>
  );
}

function healthLabel(key: string, t: ReturnType<typeof useAdminCopy>) {
  if (key === "whatsapp") return t.healthWhatsapp;
  if (key === "payments") return t.healthPayments;
  if (key === "cron") return t.healthCron;
  return t.healthErrors;
}

const styles = StyleSheet.create({
  webButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1 },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }, dateFields: { flexDirection: "row", gap: 9 },
  live: { marginLeft: "auto", paddingHorizontal: 9, minHeight: 28, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 6 }, liveDot: { width: 6, height: 6, borderRadius: 3 }, liveText: { fontFamily: fonts.bodyStrong, fontSize: 11 },
  hero: { minHeight: 154, borderWidth: 0, padding: 20, justifyContent: "center", gap: 8 }, heroTop: { flexDirection: "row", alignItems: "center", gap: 8 }, heroIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" }, heroEyebrow: { flex: 1, fontFamily: fonts.bodyStrong, fontSize: 13 }, heroAmount: { fontFamily: fonts.title, fontSize: 34 }, heroFoot: { fontFamily: fonts.body, fontSize: 12 },
  viewAll: { fontFamily: fonts.bodyStrong, fontSize: 12 }, listCard: { paddingVertical: 2 }, agentRank: { fontFamily: fonts.title, fontSize: 13 }, healthCard: { paddingVertical: 2 }, healthRow: { minHeight: 61, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", gap: 11 }, healthIcon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" }, healthTitle: { fontFamily: fonts.bodyStrong, fontSize: 13 }, healthValue: { fontFamily: fonts.body, fontSize: 11, marginTop: 2 }, healthDot: { width: 7, height: 7, borderRadius: 4 }, shortcuts: { flexDirection: "row", gap: 8, flexWrap: "wrap" }
});

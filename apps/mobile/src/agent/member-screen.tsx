import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { UsersRound } from "lucide-react-native";
import { agentRequests, useAgentMember, useAgentTeam } from "./api";
import { AgentAmount, AgentCommissionRow, AgentPage, AgentStatusChip } from "./components";
import { formatRupees } from "./format";
import { commissionSplit } from "./share";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Card, EmptyState, LoadErrorCard, Skeleton } from "../ui/bits";
import { PillButton } from "../ui/controls";
import { Screen } from "../ui/screen";
import { useTheme } from "../ui/theme";
import { accountKey } from "../query/keys";
import { useSession } from "../state/session";

function MemberSlider({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (next: number) => void }) {
  const { t } = useI18n();
  const { palette } = useTheme();
  const width = Math.max(1, max - min);
  const pct = Math.max(0, Math.min(1, (value - min) / width));
  const step = (direction: -1 | 1) => onChange(Math.max(min, Math.min(max, value + direction * 5)));
  const updateFromX = (x: number, trackWidth: number) => {
    const ratio = Math.max(0, Math.min(1, x / Math.max(trackWidth, 1)));
    onChange(Math.max(min, Math.min(max, Math.round((min + ratio * width) / 5) * 5)));
  };
  const [trackWidth, setTrackWidth] = useState(1);
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderLabels}><Text style={[styles.sliderBound, { color: palette.muted }]}>{min}%</Text><Text style={[styles.sliderValue, { color: palette.deep }]}>{value}%</Text><Text style={[styles.sliderBound, { color: palette.muted }]}>{max}%</Text></View>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={t.agentMemberShare}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => step(event.nativeEvent.actionName === "increment" ? 1 : -1)}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => updateFromX(event.nativeEvent.locationX, trackWidth)}
        onResponderMove={(event) => updateFromX(event.nativeEvent.locationX, trackWidth)}
        style={[styles.sliderTrack, { backgroundColor: palette.line }]}
      >
        <View style={[styles.sliderFill, { backgroundColor: palette.primary, width: `${pct * 100}%` }]} />
        <View style={[styles.sliderThumb, { backgroundColor: palette.paper, borderColor: palette.primary, left: `${pct * 100}%` }]} />
      </View>
      <View style={styles.sliderButtons}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.agentShareDecrease} onPress={() => step(-1)} style={[styles.stepButton, { borderColor: palette.line }]}><Text style={{ color: palette.ink }}>−</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t.agentShareIncrease} onPress={() => step(1)} style={[styles.stepButton, { borderColor: palette.line }]}><Text style={{ color: palette.ink }}>+</Text></Pressable>
      </View>
    </View>
  );
}

function MemberScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const member = useAgentMember(id);
  const team = useAgentTeam();
  const client = useQueryClient();
  const [shareDraft, setShareDraft] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);
  const value = shareDraft ?? member.data?.member.sharePercent ?? 70;
  const min = team.data?.minSharePercent ?? 50;
  const max = team.data?.maxSharePercent ?? 90;
  const split = commissionSplit(20000, value);
  const example = t.agentExampleMember
    .replace("{member}", formatRupees(split.memberPaise, lang).replace("₹", ""))
    .replace("{leader}", formatRupees(split.leaderPaise, lang).replace("₹", ""));

  async function saveShare() {
    if (!id) return;
    setSaveError(false);
    try {
      await agentRequests.updateMember(id, { sharePercent: value });
      await Promise.all([
        client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "agent", "member", id) }),
        client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "agent", "team") })
      ]);
    } catch {
      setSaveError(true);
    }
  }

  async function changeMemberStatus() {
    if (!id || !member.data) return;
    const action = member.data.member.status === "PAUSED" ? "resume" : "pause";
    try {
      await agentRequests.updateMember(id, { action });
      await Promise.all([
        member.refetch(),
        client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "agent", "team") })
      ]);
    } catch {
      setSaveError(true);
    }
  }

  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
        <AgentPage title={member.data?.member.name ?? t.agentTeamTab} subtitle={member.data?.member.phoneMasked}>
          {member.isLoading ? <><Skeleton height={140} /><Skeleton height={200} /></> : null}
          {member.isError ? <LoadErrorCard onRetry={() => member.refetch().catch(() => undefined)} /> : null}
          {member.data ? (
            <>
              <Card style={styles.memberSummary}>
                <View style={styles.summaryTop}>
                  <View style={[styles.summaryIcon, { backgroundColor: palette.accentSoft }]}><UsersRound color={palette.deep} size={23} /></View>
                  <AgentStatusChip status={member.data.member.status} />
                </View>
                <View style={styles.statsRow}>
                  <Metric label={t.agentToday} paise={member.data.stats.todaySalesPaise} />
                  <Metric label={t.agentMonthSales} paise={member.data.stats.monthSalesPaise} />
                  <Metric label={t.agentMyOverride} paise={member.data.stats.monthOverridePaise} />
                </View>
              </Card>
              <Card style={styles.shareCard}>
                <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{t.agentMemberShare}</Text>
                <MemberSlider value={value} min={min} max={max} onChange={setShareDraft} />
                <View style={[styles.exampleBox, { backgroundColor: palette.accentSoft }]}>
                  <Text style={[styles.example, { color: palette.ink }, lang === "hi" && styles.hindi]}>{example}</Text>
                </View>
                {saveError ? <LoadErrorCard onRetry={() => saveShare().catch(() => undefined)} /> : null}
                <PillButton label={t.agentSaveShare} tone="dark" onPress={saveShare} disabled={value < min || value > max} />
              </Card>
              <PillButton
                label={member.data.member.status === "PAUSED" ? t.agentResume : t.agentPause}
                tone="outline"
                onPress={changeMemberStatus}
              />
              <View style={styles.salesSection}>
                <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{t.agentLastSales}</Text>
                {member.data.sales.length ? member.data.sales.map((row) => <AgentCommissionRow key={row.id} row={row} />) : <EmptyState icon={UsersRound} title={t.agentLastSales} body={t.agentNoMemberSales} />}
              </View>
            </>
          ) : null}
        </AgentPage>
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, paise }: { label: string; paise: number }) {
  const { palette } = useTheme();
  const { lang } = useI18n();
  return <View style={{ flex: 1, gap: 4 }}><Text style={[styles.metricLabel, { color: palette.muted }, lang === "hi" && styles.hindi]}>{label}</Text><AgentAmount paise={paise} style={[styles.metricValue, { color: palette.ink }]} /></View>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 100 },
  memberSummary: { gap: 14 },
  summaryTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 14 },
  shareCard: { gap: 14 },
  sectionTitle: { fontFamily: fonts.bodyStrong, fontSize: 18 },
  sliderBlock: { gap: 10 },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sliderBound: { fontFamily: fonts.body, fontSize: 13 },
  sliderValue: { fontFamily: fonts.display, fontSize: 23 },
  sliderTrack: { height: 10, borderRadius: 999, justifyContent: "center", marginHorizontal: 10 },
  sliderFill: { height: 10, borderRadius: 999, position: "absolute", left: 0 },
  sliderThumb: { width: 26, height: 26, borderRadius: 13, borderWidth: 3, position: "absolute", marginLeft: -13, elevation: 2 },
  sliderButtons: { flexDirection: "row", justifyContent: "space-between" },
  stepButton: { width: 46, height: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  exampleBox: { padding: 12, borderRadius: 14 },
  example: { fontFamily: fonts.bodyStrong, fontSize: 14, lineHeight: 21 },
  metricLabel: { fontFamily: fonts.body, fontSize: 12 },
  metricValue: { fontFamily: fonts.bodyStrong, fontSize: 17 },
  salesSection: { gap: 10 },
  hindi: { fontFamily: fonts.hindi },
  hindiStrong: { fontFamily: fonts.hindiStrong }
});

export function AgentMemberScreen() {
  return <MemberScreenContent />;
}

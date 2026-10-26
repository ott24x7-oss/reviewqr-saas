import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { BriefcaseBusiness, Link2, UsersRound, WalletCards } from "lucide-react-native";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useAgentCommissions, useAgentHome, useAgentTeam } from "./api";
import { AgentAmount, AgentCommissionRow, AgentPage, AgentSection } from "./components";
import { formatRupees } from "./format";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Card, EmptyState, LoadErrorCard, Skeleton } from "../ui/bits";
import { Screen } from "../ui/screen";
import { accountKey } from "../query/keys";
import { useSession } from "../state/session";
import { useTheme } from "../ui/theme";

function AgentHomeContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const client = useQueryClient();
  const home = useAgentHome();
  const team = useAgentTeam(home.data?.status === "ACTIVE");
  const commissions = useAgentCommissions();
  const rows = useMemo(() => commissions.data?.pages.flatMap((page) => page.items).slice(0, 3) ?? [], [commissions.data]);

  async function shareLink() {
    if (!team.data?.inviteLink) return;
    await Share.share({ message: team.data.inviteLink });
  }

  async function retryHome() {
    await Promise.all([
      home.refetch(),
      team.refetch(),
      commissions.refetch()
    ]);
    await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "agent") });
  }

  const recent = (
    <>
      {commissions.isLoading ? <><Skeleton height={78} /><Skeleton height={78} /></> : null}
      {commissions.isError ? <LoadErrorCard onRetry={() => commissions.refetch().catch(() => undefined)} /> : null}
      {!commissions.isLoading && !commissions.isError && rows.length === 0 ? (
        <EmptyState icon={WalletCards} title={t.commissions} body={t.agentNoCommissions} action={t.agentBusinessesTab} onAction={() => router.push("/(app)/agent-businesses")} />
      ) : null}
      {rows.map((row) => <AgentCommissionRow key={row.id} row={row} compact />)}
    </>
  );

  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
        <AgentPage title={t.agentHomeTitle}>
          {home.isLoading ? <><Skeleton height={178} /><Skeleton height={110} /><Skeleton height={110} /></> : null}
          {home.isError ? <LoadErrorCard onRetry={() => retryHome().catch(() => undefined)} /> : null}
          {home.data ? (
            <>
              <LinearGradient colors={[palette.buttonGradient[0], palette.buttonGradient[1]]} style={styles.hero}>
                <View style={styles.heroTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.heroEyebrow, { color: palette.onPrimary }, lang === "hi" && styles.hindi]}>{t.agentThisMonth}</Text>
                    <AgentAmount paise={home.data.earnings.monthPaise} animate style={[styles.heroAmount, { color: palette.onPrimary }]} />
                  </View>
                  <WalletCards color={palette.onPrimary} size={27} />
                </View>
                <View style={[styles.heroDivider, { backgroundColor: palette.onPrimary }]} />
                <View style={styles.heroStats}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.heroStatLabel, { color: palette.onPrimary }, lang === "hi" && styles.hindi]}>{t.agentPending}</Text>
                    <AgentAmount paise={home.data.earnings.pendingPaise} animate style={[styles.heroStatValue, { color: palette.onPrimary }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.heroStatLabel, { color: palette.onPrimary }, lang === "hi" && styles.hindi]}>{t.agentPaid}</Text>
                    <AgentAmount paise={home.data.earnings.paidPaise} animate style={[styles.heroStatValue, { color: palette.onPrimary }]} />
                  </View>
                </View>
              </LinearGradient>

              <AgentSection title={t.agentQuickActions} />
              <View style={styles.actions}>
                <Action icon={BriefcaseBusiness} title={t.onboardBusiness} onPress={() => router.push("/(app)/agent-onboard")} palette={palette} />
                {team.data?.canRecruit !== false ? <Action icon={UsersRound} title={t.agentInviteTeam} onPress={() => router.push("/(app)/agent-team")} palette={palette} /> : null}
                <Action icon={Link2} title={t.agentShareCode} onPress={() => shareLink().catch(() => undefined)} disabled={!team.data?.inviteLink} palette={palette} />
              </View>

              {team.data?.canRecruit !== false ? (
                <>
                  <AgentSection title={t.agentTeamMembers} action={t.agentTeamTab} onAction={() => router.push("/(app)/agent-team")} />
                  <Card style={styles.summaryCard}>
                    <View style={[styles.summaryIcon, { backgroundColor: palette.accentSoft }]}><UsersRound color={palette.deep} size={22} /></View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[styles.summaryTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>
                        {home.data.team.members} {t.agentTeamMembers.toLowerCase()}
                      </Text>
                      <Text style={[styles.summaryHint, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.agentTeamSales}</Text>
                    </View>
                    <Text style={[styles.summaryAmount, { color: palette.ink }]}>{formatRupees(home.data.team.monthSalesPaise, lang)}</Text>
                  </Card>
                </>
              ) : null}

              <AgentSection title={t.agentRecentCommissions} action={t.agentEarningsTab} onAction={() => router.push("/(app)/agent-earnings")} />
              {recent}
            </>
          ) : null}
        </AgentPage>
      </ScrollView>
    </Screen>
  );
}

function Action({ icon: Icon, title, onPress, disabled, palette }: { icon: typeof BriefcaseBusiness; title: string; onPress: () => void; disabled?: boolean; palette: ReturnType<typeof useTheme>["palette"] }) {
  const { lang } = useI18n();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, { backgroundColor: palette.card, borderColor: palette.line, opacity: disabled ? 0.5 : 1 }]}>
      <View style={[styles.actionIcon, { backgroundColor: palette.accentSoft }]}><Icon color={palette.deep} size={22} /></View>
      <Text style={[styles.actionTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 110 },
  hero: { borderRadius: 24, padding: 20, gap: 14 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroEyebrow: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  heroAmount: { fontFamily: fonts.display, fontSize: 36, marginTop: 6 },
  heroDivider: { height: 1, opacity: 0.3 },
  heroStats: { flexDirection: "row", gap: 20 },
  heroStatLabel: { fontFamily: fonts.body, fontSize: 13, opacity: 0.82 },
  heroStatValue: { fontFamily: fonts.bodyStrong, fontSize: 18, marginTop: 3 },
  actions: { flexDirection: "row", gap: 8 },
  action: { minHeight: 112, flex: 1, borderRadius: 18, borderWidth: 1, padding: 11, justifyContent: "space-between" },
  actionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionTitle: { fontFamily: fonts.bodyStrong, fontSize: 13, lineHeight: 18 },
  summaryCard: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  summaryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  summaryTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  summaryHint: { fontFamily: fonts.body, fontSize: 13 },
  summaryAmount: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  hindi: { fontFamily: fonts.hindi },
  hindiStrong: { fontFamily: fonts.hindiStrong }
});

export function AgentHomeScreen() {
  return <AgentHomeContent />;
}

import { router } from "expo-router";
import { Banknote, WalletCards } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAgentPayouts } from "./api";
import { AgentPage } from "./components";
import { formatAgentDate, formatRupees } from "./format";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Card, EmptyState, LoadErrorCard, Skeleton } from "../ui/bits";
import { PillButton } from "../ui/controls";
import { Screen } from "../ui/screen";
import { useTheme } from "../ui/theme";

function AgentPayoutsContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const query = useAgentPayouts();
  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
        <AgentPage title={t.agentPayouts} subtitle={t.agentPayoutStatement}>
          <PillButton label={t.agentProfile} tone="outline" onPress={() => router.push("/(app)/agent-profile")} />
          {query.isLoading ? <><Skeleton height={152} /><Skeleton height={110} /></> : null}
          {query.isError ? <LoadErrorCard onRetry={() => query.refetch().catch(() => undefined)} /> : null}
          {!query.isLoading && !query.isError && query.data?.length === 0 ? <EmptyState icon={WalletCards} title={t.agentPayouts} body={t.agentNoPayouts} action={t.agentProfile} onAction={() => router.push("/(app)/agent-profile")} /> : null}
          {!query.isLoading && !query.isError ? query.data?.map((payout) => (
            <Card key={payout.id} style={styles.payoutCard}>
              <View style={styles.payoutHeading}>
                <View style={[styles.payoutIcon, { backgroundColor: palette.accentSoft }]}><Banknote color={palette.deep} size={21} /></View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.payoutDate, { color: palette.ink }]}>{formatAgentDate(payout.paidAt, lang)}</Text>
                  <Text style={[styles.utr, { color: palette.muted }]}>{payout.utr}</Text>
                </View>
              </View>
              <View style={[styles.statement, { borderTopColor: palette.line }]}>
                <Amount label={t.agentGross} paise={payout.grossPaise} />
                <Amount label={t.agentTds} paise={payout.tdsPaise} />
                <Amount label={t.agentNet} paise={payout.netPaise} emphasis />
              </View>
            </Card>
          )) : null}
        </AgentPage>
      </ScrollView>
    </Screen>
  );
}

function Amount({ label, paise, emphasis }: { label: string; paise: number; emphasis?: boolean }) {
  const { lang } = useI18n();
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={[styles.amountLabel, { color: palette.muted }, lang === "hi" && styles.hindi]}>{label}</Text>
      <Text style={[emphasis ? styles.amountStrong : styles.amount, { color: emphasis ? palette.success : palette.ink }]}>{formatRupees(paise, lang)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 110 },
  payoutCard: { gap: 14 },
  payoutHeading: { flexDirection: "row", alignItems: "center", gap: 11 },
  payoutIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  payoutDate: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  utr: { fontFamily: fonts.body, fontSize: 13 },
  statement: { flexDirection: "row", gap: 10, borderTopWidth: 1, paddingTop: 12 },
  amountLabel: { fontFamily: fonts.body, fontSize: 12 },
  amount: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  amountStrong: { fontFamily: fonts.title, fontSize: 17 },
  hindi: { fontFamily: fonts.hindi }
});

export function AgentPayoutsScreen() {
  return <AgentPayoutsContent />;
}

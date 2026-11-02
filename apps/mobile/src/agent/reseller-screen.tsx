import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ArrowRight, BadgeIndianRupee, CheckCircle2, Store, UsersRound } from "lucide-react-native";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { agentRequests } from "./api";
import { accountKey } from "../query/keys";
import { useI18n } from "../i18n";
import { useSession } from "../state/session";
import { fonts } from "../theme";
import { Card } from "../ui/bits";
import { PillButton } from "../ui/controls";
import { Screen } from "../ui/screen";
import { useTheme } from "../ui/theme";

function rupees(paise: number, lang: "en" | "hi") {
  return new Intl.NumberFormat(lang === "hi" ? "hi-IN" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

function ResellerContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const status = useQuery({
    queryKey: accountKey(user?.id ?? "", "agent-application"),
    enabled: !!user,
    queryFn: () => agentRequests.applicationStatus()
  });
  const pitch = useQuery({
    queryKey: accountKey(user?.id ?? "", "agent-pitch"),
    enabled: !!user,
    queryFn: () => agentRequests.pitch()
  });
  const hasAgentAccess = user?.role === "AGENT" || status.data?.status === "approved";

  function startApplication() {
    router.push("/(app)/agent-application");
  }
  async function openAgent() {
    router.push("/(app)/agent-home");
  }
  const formattedExample = pitch.data ? rupees(pitch.data.growthExampleMonthlyPaise, lang) : "…";
  const plan = pitch.data ? (lang === "hi" ? pitch.data.growthPlanNameHi : pitch.data.growthPlanName) : t.resellerGrowthPlan;
  const planRate = pitch.data
    ? pitch.data.planCommission.basis === "PERCENT" ? `${pitch.data.planCommission.percent}%` : rupees(pitch.data.planCommission.flatPaise, lang)
    : "…";
  const shopRate = pitch.data
    ? pitch.data.shopCommission.basis === "PERCENT" ? `${pitch.data.shopCommission.percent}%` : rupees(pitch.data.shopCommission.flatPaise, lang)
    : "…";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.resellerTitle}</Text>
      <Text style={[styles.intro, { color: palette.muted }, lang === "hi" && styles.hindiBody]}>{t.resellerPitch}</Text>
      <Card style={styles.earnCard}>
        <View style={styles.row}><BadgeIndianRupee color={palette.deep} size={21} /><Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.sectionEarn}</Text></View>
        <Text style={[styles.body, { color: palette.ink }, lang === "hi" && styles.hindiBody]}>{t.resellerPlanRate.replace("{rate}", planRate)}</Text>
        <Text style={[styles.body, { color: palette.ink }, lang === "hi" && styles.hindiBody]}>{t.resellerShopRate.replace("{rate}", shopRate)}</Text>
        <View style={[styles.example, { backgroundColor: palette.accentSoft }]}>
          <Text style={[styles.exampleText, { color: palette.deep }, lang === "hi" && styles.hindiStrong]}>{t.resellerExample.replace("{plan}", plan).replace("{amount}", formattedExample)}</Text>
        </View>
        <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindiBody]}>{t.resellerPayout}</Text>
        {pitch.isError ? <Text style={[styles.note, { color: palette.danger }]}>{t.resellerErrorGeneric}</Text> : null}
      </Card>
      <Card style={styles.stepsCard}>
        <Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.resellerHowTitle}</Text>
        {[t.resellerStepOne, t.resellerStepTwo, t.resellerStepThree].map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <View style={[styles.stepNumber, { backgroundColor: palette.accentSoft }]}><Text style={[styles.stepNumberText, { color: palette.deep }]}>{index + 1}</Text></View>
            <Text style={[styles.body, { color: palette.ink, flex: 1 }, lang === "hi" && styles.hindiBody]}>{step}</Text>
          </View>
        ))}
      </Card>
      {hasAgentAccess ? <PillButton label={t.resellerOpenAgent} tone="dark" onPress={() => openAgent().catch(() => undefined)} /> : status.data?.status === "pending" || (status.data?.status === "rejected" && !status.data.canReapply)
        ? <PillButton label={t.resellerApplicationTitle} tone="dark" onPress={() => router.push("/(app)/agent-application")} />
        : <PillButton label={t.resellerApply} tone="dark" onPress={startApplication} />}
      <View style={styles.codeRow}>
        <UsersRound color={palette.muted} size={18} />
        <Text style={[styles.codeText, { color: palette.muted }, lang === "hi" && styles.hindiBody]}>{t.resellerHaveTeamCode}</Text>
        <PillButton label={t.agentJoinTeam} tone="ghost" onPress={() => router.push("/(app)/agent-join")} />
        <ArrowRight color={palette.deep} size={16} />
      </View>
      <PillButton label={t.resellerTermsLink} tone="ghost" onPress={() => Linking.openURL("https://qr24x7.in/reseller-terms").catch(() => undefined)} />
      <View accessible accessibilityLabel={t.resellerPayout} style={[styles.footer, { borderTopColor: palette.line }]}>
        <Store color={palette.muted} size={16} />
        <Text style={[styles.note, { color: palette.muted }]}>{t.resellerPayout}</Text>
        <CheckCircle2 color={palette.success} size={16} />
      </View>
    </ScrollView>
  );
}

export function ResellerScreen() {
  return <Screen><ResellerContent /></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingBottom: 120, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  intro: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  earnCard: { gap: 12, padding: 18 },
  stepsCard: { gap: 14, padding: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  section: { fontFamily: fonts.bodyStrong, fontSize: 19 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  example: { borderRadius: 14, padding: 14, minHeight: 48, justifyContent: "center" },
  exampleText: { fontFamily: fonts.bodyStrong, fontSize: 16, lineHeight: 22 },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  stepNumber: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  stepNumberText: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  codeRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8 },
  codeText: { flex: 1, fontFamily: fonts.body, fontSize: 14 },
  footer: { minHeight: 48, borderTopWidth: 1, paddingTop: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  hindi: { fontFamily: fonts.hindiStrong },
  hindiStrong: { fontFamily: fonts.hindiStrong },
  hindiBody: { fontFamily: fonts.hindi }
});

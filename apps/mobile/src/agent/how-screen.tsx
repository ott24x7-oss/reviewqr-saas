import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BadgeCheck, CircleDollarSign, RotateCcw, UserRoundX } from "lucide-react-native";
import { AgentPage } from "./components";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Card } from "../ui/bits";
import { Screen } from "../ui/screen";
import { useTheme } from "../ui/theme";

function AgentHowContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const rules = [
    { icon: CircleDollarSign, text: t.agentNoJoiningFee },
    { icon: BadgeCheck, text: t.agentRealSalesOnly },
    { icon: UserRoundX, text: t.agentNoRecruitingPay },
    { icon: RotateCcw, text: t.agentReversals }
  ];
  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
        <AgentPage title={t.agentHowTitle} subtitle={t.agentFutureShares}>
          {rules.map(({ icon: Icon, text }) => (
            <Card key={text} style={styles.rule}>
              <View style={[styles.icon, { backgroundColor: palette.accentSoft }]}><Icon color={palette.deep} size={22} /></View>
              <Text style={[styles.ruleText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{text}</Text>
            </Card>
          ))}
        </AgentPage>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 110 },
  rule: { flexDirection: "row", alignItems: "center", gap: 13, padding: 15 },
  icon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  ruleText: { flex: 1, fontFamily: fonts.bodyStrong, fontSize: 16, lineHeight: 22 },
  hindi: { fontFamily: fonts.hindiStrong }
});

export function AgentHowScreen() {
  return <AgentHowContent />;
}

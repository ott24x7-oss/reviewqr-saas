import { Linking, StyleSheet, Text, View } from "react-native";
import { Clock3, Mail } from "lucide-react-native";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Card } from "../ui/bits";
import { PillButton } from "../ui/controls";
import { Screen } from "../ui/screen";
import { useTheme } from "../ui/theme";

export function PendingAgentScreen() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  return (
    <Screen>
      <View style={styles.root}>
        <Card style={styles.card}>
          <View style={[styles.icon, { backgroundColor: palette.accentSoft }]}>
            <Clock3 color={palette.deep} size={30} />
          </View>
          <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.agentWaitingTitle}</Text>
          <Text style={[styles.body, { color: palette.muted }, lang === "hi" && styles.hindiBody]}>{t.agentWaitingBody}</Text>
          <PillButton
            label={t.agentSupport}
            tone="dark"
            onPress={() => Linking.openURL(`mailto:${t.agentSupportEmail}`).catch(() => undefined)}
          />
          <View style={styles.emailRow}>
            <Mail color={palette.muted} size={16} />
            <Text style={[styles.email, { color: palette.muted }]}>{t.agentSupportEmail}</Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", padding: 20 },
  card: { alignItems: "center", gap: 14, paddingVertical: 28 },
  icon: { width: 68, height: 68, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.title, fontSize: 24, textAlign: "center" },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, textAlign: "center" },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  email: { fontFamily: fonts.body, fontSize: 14 },
  hindi: { fontFamily: fonts.hindiStrong },
  hindiBody: { fontFamily: fonts.hindi }
});

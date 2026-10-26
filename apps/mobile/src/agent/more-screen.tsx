import { router } from "expo-router";
import { BookOpenText, CircleHelp, LogOut, Share2, UserRound, WalletCards } from "lucide-react-native";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useAgentTeam } from "./api";
import { AgentTapRow } from "./components";
import { useAgentMode } from "./mode-context";
import { useBusiness } from "../state/business";
import { useSession } from "../state/session";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Screen } from "../ui/screen";
import { useTheme } from "../ui/theme";

function AgentMoreContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user, logout } = useSession();
  const { businesses } = useBusiness();
  const { mode, canSwitch, setMode } = useAgentMode();
  const team = useAgentTeam();

  async function shareCode() {
    if (team.data?.inviteLink) await Share.share({ message: team.data.inviteLink });
  }

  function switchMode() {
    if (!canSwitch || !user) return;
    const next = mode === "agent" ? "owner" : "agent";
    setMode(next);
    router.replace(next === "owner" ? "/(app)/index" : "/(app)/agent-home");
  }

  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{t.agentMoreTab}</Text>
        <Text style={[styles.subtitle, { color: palette.muted }]}>{user?.name || t.agentProfile}</Text>
        <View style={styles.rows}>
          <AgentTapRow icon={UserRound} title={t.agentProfile} hint={t.agentUpi} onPress={() => router.push("/(app)/agent-profile")} />
          <AgentTapRow icon={WalletCards} title={t.agentPayouts} hint={t.agentPayoutStatement} onPress={() => router.push("/(app)/agent-payouts")} />
          <AgentTapRow icon={BookOpenText} title={t.agentHowTitle} hint={t.agentNoJoiningFee} onPress={() => router.push("/(app)/agent-how")} />
          {team.data?.canRecruit ? <AgentTapRow icon={Share2} title={t.agentShareCode} hint={t.agentInviteLink} onPress={() => shareCode().catch(() => undefined)} /> : null}
          <AgentTapRow icon={CircleHelp} title={t.help} hint={t.agentSupportEmail} onPress={() => router.push("/(app)/help")} />
          {canSwitch && businesses.length > 0 ? (
            <AgentTapRow icon={UserRound} title={t.agentSwitchMode} hint={mode === "agent" ? t.agentSwitchOwner : t.agentSwitchAgent} onPress={switchMode} />
          ) : null}
          <AgentTapRow icon={LogOut} title={t.signOut} onPress={() => logout().catch(() => undefined)} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 110, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  subtitle: { fontFamily: fonts.body, fontSize: 15, marginTop: -8 },
  rows: { gap: 9 },
  hindiStrong: { fontFamily: fonts.hindiStrong }
});

export function AgentMoreScreen() {
  return <AgentMoreContent />;
}

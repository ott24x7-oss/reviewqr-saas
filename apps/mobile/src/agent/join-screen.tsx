import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { UserRoundPlus } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { StyleSheet, Text } from "react-native";
import { agentRequests } from "./api";
import { AgentPage } from "./components";
import { PENDING_AGENT_JOIN_KEY } from "./join-code";
import { PendingAgentScreen } from "./pending-screen";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Card, LoadErrorCard } from "../ui/bits";
import { Field, PillButton } from "../ui/controls";
import { Screen } from "../ui/screen";
import { accountKey } from "../query/keys";
import { useSession } from "../state/session";
import { useTheme } from "../ui/theme";

function AgentJoinContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const { ready, user, refreshUser } = useSession();
  const client = useQueryClient();
  const [codeDraft, setCodeDraft] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState(false);
  const code = codeDraft ?? params.code ?? "";

  async function signIn() {
    if (code.trim()) await AsyncStorage.setItem(PENDING_AGENT_JOIN_KEY, code.trim().toUpperCase()).catch(() => undefined);
    router.replace("/(auth)/login");
  }

  async function join() {
    if (!code.trim()) return;
    setJoining(true);
    setError(false);
    try {
      await agentRequests.join(code.trim().toUpperCase());
      setJoined(true);
      if (user) await client.invalidateQueries({ queryKey: accountKey(user.id, "agent") });
      await refreshUser().catch(() => undefined);
      await AsyncStorage.removeItem(PENDING_AGENT_JOIN_KEY).catch(() => undefined);
      router.replace("/(app)/agent-pending");
    } catch {
      setError(true);
    } finally {
      setJoining(false);
    }
  }

  if (joined) return <PendingAgentScreen />;
  if (ready && !user) {
    return (
      <Screen>
        <AgentPage title={t.agentJoin} subtitle={t.agentJoinSignInBody}>
          <PillButton label={t.signIn} tone="dark" onPress={() => signIn().catch(() => undefined)} />
        </AgentPage>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={12}>
        <AgentPage title={t.agentJoin} subtitle={t.agentJoinBody}>
          <Card style={styles.iconCard}><UserRoundPlus color={palette.deep} size={28} /></Card>
          <Field label={t.agentTeamCode} value={code} onChangeText={setCodeDraft} autoCapitalize="characters" returnKeyType="done" />
          {error ? <LoadErrorCard onRetry={() => join().catch(() => undefined)} /> : null}
          <PillButton label={t.agentJoinTeam} tone="dark" disabled={!code.trim() || joining} onPress={join} />
          <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.agentJoinPending}</Text>
        </AgentPage>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 110 },
  iconCard: { alignItems: "center", justifyContent: "center", minHeight: 76 },
  note: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: "center" },
  hindi: { fontFamily: fonts.hindi }
});

export function AgentJoinScreen() {
  return <AgentJoinContent />;
}

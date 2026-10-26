import { router } from "expo-router";
import { BriefcaseBusiness } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { agentRequests } from "./api";
import { AgentPage } from "./components";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Card, LoadErrorCard } from "../ui/bits";
import { Field, PillButton } from "../ui/controls";
import { Screen } from "../ui/screen";
import { useSession } from "../state/session";
import { accountKey } from "../query/keys";
import { useTheme } from "../ui/theme";

function AgentOnboardContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const client = useQueryClient();
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit() {
    if (businessName.trim().length < 2 || phone.replace(/\D/g, "").length < 10) return;
    setBusy(true);
    setError(false);
    try {
      await agentRequests.onboardBusiness(phone.trim(), businessName.trim());
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "agent", "businesses") });
      router.back();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={12}>
        <AgentPage title={t.onboardBusiness} subtitle={t.agentOnboardBody}>
          <Card style={styles.intro}>
            <View style={[styles.icon, { backgroundColor: palette.accentSoft }]}><BriefcaseBusiness color={palette.deep} size={24} /></View>
            <Text style={[styles.introTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{t.agentOnboardTitle}</Text>
            <Text style={[styles.introBody, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.agentOnboardBody}</Text>
          </Card>
          <Field label={t.businessName} value={businessName} onChangeText={setBusinessName} returnKeyType="next" />
          <Field label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" returnKeyType="done" />
          {error ? <LoadErrorCard onRetry={() => submit().catch(() => undefined)} /> : null}
          <PillButton label={t.onboardBusiness} tone="dark" disabled={busy || businessName.trim().length < 2 || phone.replace(/\D/g, "").length < 10} onPress={submit} />
        </AgentPage>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 110 },
  intro: { gap: 10 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  introTitle: { fontFamily: fonts.bodyStrong, fontSize: 17 },
  introBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  hindi: { fontFamily: fonts.hindi },
  hindiStrong: { fontFamily: fonts.hindiStrong }
});

export function AgentOnboardScreen() {
  return <AgentOnboardContent />;
}

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { StyleSheet, Text, View } from "react-native";
import { agentRequests, useAgentProfile } from "./api";
import { AgentPage } from "./components";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Card, LoadErrorCard, Skeleton } from "../ui/bits";
import { Field, PillButton, StickyAction } from "../ui/controls";
import { Screen } from "../ui/screen";
import { accountKey } from "../query/keys";
import { useSession } from "../state/session";
import { useTheme } from "../ui/theme";

function AgentProfileContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const client = useQueryClient();
  const profile = useAgentProfile();
  const [name, setName] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [upiId, setUpiId] = useState<string | null>(null);
  const [pan, setPan] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const resolvedName = name ?? profile.data?.name ?? "";
  const resolvedCity = city ?? profile.data?.city ?? "";
  const resolvedUpi = upiId ?? profile.data?.upiId ?? "";

  async function save() {
    setSaved(false);
    setSaveError(false);
    try {
      await agentRequests.updateProfile({
        name: resolvedName.trim(),
        city: resolvedCity.trim(),
        upiId: resolvedUpi.trim(),
        ...(pan.trim().length === 10 ? { pan: pan.trim().toUpperCase() } : {}),
        ...(bankAccount.trim() && bankIfsc.trim() ? { bankAccount: bankAccount.trim(), bankIfsc: bankIfsc.trim().toUpperCase() } : {})
      });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "agent", "profile") });
      setSaved(true);
      setPan("");
      setBankAccount("");
      setBankIfsc("");
    } catch {
      setSaveError(true);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, backgroundColor: palette.paper }}>
        <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={88}>
          <AgentPage title={t.agentProfile} subtitle={t.agentPayoutStatement}>
            {profile.isLoading ? <Skeleton height={190} /> : null}
            {profile.isError ? <LoadErrorCard onRetry={() => profile.refetch().catch(() => undefined)} /> : null}
            {profile.data ? (
              <>
                <Card style={styles.formCard}>
                  <Field label={t.name} value={resolvedName} onChangeText={setName} returnKeyType="next" />
                  <Field label={t.city} value={resolvedCity} onChangeText={setCity} returnKeyType="next" />
                  <Field label={t.agentUpi} value={resolvedUpi} onChangeText={setUpiId} autoCapitalize="none" returnKeyType="next" />
                  <View style={styles.panBlock}>
                    <Field label={t.agentPan} value={pan} onChangeText={setPan} autoCapitalize="characters" maxLength={10} returnKeyType="next" />
                    {profile.data.pan ? <Text style={[styles.helper, { color: palette.muted }, lang === "hi" && styles.hindi]}>{`${t.agentPan}: ${profile.data.pan}`}</Text> : null}
                  </View>
                  <Field label={t.agentBankAccount} value={bankAccount} onChangeText={setBankAccount} keyboardType="number-pad" returnKeyType="next" />
                  <Field label={t.agentBankIfsc} value={bankIfsc} onChangeText={setBankIfsc} autoCapitalize="characters" returnKeyType="done" />
                  {profile.data.bankLast4 ? <Text style={[styles.helper, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.agentBankLast4.replace("{last4}", profile.data.bankLast4)}</Text> : null}
                </Card>
                {saved ? <Text accessibilityRole="text" style={[styles.saved, { color: palette.success }]}>{t.agentProfileSaved}</Text> : null}
                {saveError ? <LoadErrorCard onRetry={() => save().catch(() => undefined)} /> : null}
              </>
            ) : null}
          </AgentPage>
        </KeyboardAwareScrollView>
        <StickyAction>
          <PillButton label={t.save} tone="dark" onPress={save} disabled={profile.isLoading || !resolvedName.trim() || !resolvedCity.trim() || !resolvedUpi.trim()} />
        </StickyAction>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  formCard: { gap: 14 },
  panBlock: { gap: 7 },
  helper: { fontFamily: fonts.body, fontSize: 13 },
  saved: { fontFamily: fonts.bodyStrong, fontSize: 14 },
  hindi: { fontFamily: fonts.hindi }
});

export function AgentProfileScreen() {
  return <AgentProfileContent />;
}

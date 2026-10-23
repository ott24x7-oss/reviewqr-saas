import { router } from "expo-router";
import { useState , useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { fonts } from "../../src/theme";
import { usePalette } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";
import { Field, Muted, PillButton } from "../../src/ui/controls";

export default function ReferralScreen() {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { t, lang } = useI18n();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(referralCode: string) {
    setBusy(true);
    setError(null);
    try {
      await apiData("/api/v1/onboarding", {
        method: "PUT",
        body: JSON.stringify({ referralAsked: true, referralCode })
      });
      router.replace("/(onboard)/wizard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save that code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} testID="referral-screen">
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.referralTitle}</Text>
      <Muted>{t.referralHint}</Muted>
      <Field label={t.referralTitle} tone="paper" value={code} onChangeText={setCode} autoCapitalize="characters" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PillButton label={t.referralContinue} onPress={() => send(code.trim())} disabled={busy || code.trim().length < 4} />
      <PillButton label={t.referralSkip} tone="outline" onPress={() => send("")} disabled={busy} />
    </SafeAreaView>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 20, gap: 16 },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.ink },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});
}

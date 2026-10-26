import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import type { TokenPair } from "@reviewqr/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useRef, useState , useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trackAppEvent } from "../../src/analytics/events";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { clearPendingOtp, getPendingOtp } from "../../src/auth/pending";
import { useI18n } from "../../src/i18n";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { usePalette } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";
import { FilledField, PillButton, StickyAction } from "../../src/ui/controls";
import { SectionHeader } from "../../src/ui/rows";

export default function BusinessNameScreen() {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const pending = getPendingOtp();
  const { t, lang } = useI18n();
  const { saveSession } = useSession();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const challenge = pending?.signupToken ? pending : null;
  const leaving = useRef(false);
  useEffect(() => {
    if (leaving.current) return;
    if (!challenge?.signupToken) router.replace("/(auth)/signup");
  }, [challenge?.signupToken]);
  if (!challenge?.signupToken) return null;
  const phone = challenge.phone;
  const signupToken = challenge.signupToken;

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const pair = await apiData<TokenPair>("/api/v1/auth/otp/signup", {
        method: "POST",
        body: JSON.stringify({
          action: "finish",
          phone,
          signupToken,
          name,
          deviceName: "Android"
        })
      });
      if (businessName.trim()) await AsyncStorage.setItem("reviewqr.prefillBusiness", businessName.trim());
      leaving.current = true;
      clearPendingOtp();
      await saveSession(pair);
      void trackAppEvent("signup_complete");
      router.replace("/(onboard)/referral");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={12}>
          <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.signupTitle}</Text>
          <SectionHeader label={t.name} />
          <View style={styles.card}>
            <FilledField label={t.name} value={name} onChangeText={setName} />
            <FilledField label={t.businessName} value={businessName} onChangeText={setBusinessName} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </KeyboardAwareScrollView>
        <StickyAction>
          <PillButton label={t.finish} onPress={finish} disabled={busy || name.trim().length < 2} hint={name.trim().length < 2 ? t.hintName : t.hintWait} />
        </StickyAction>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  card: { gap: 10, padding: 12, borderRadius: 20, backgroundColor: colors.card },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28 },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});
}

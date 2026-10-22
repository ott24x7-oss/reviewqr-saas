import type { TokenPair } from "@reviewqr/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { clearPendingOtp, getPendingOtp } from "../../src/auth/pending";
import { useI18n } from "../../src/i18n";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";
import { Field, PillButton } from "../../src/ui/controls";

export default function BusinessNameScreen() {
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
      router.replace("/(onboard)/referral");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.businessName}</Text>
        <Field label={t.name} value={name} onChangeText={setName} />
        <Field label={t.businessName} value={businessName} onChangeText={setBusinessName} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PillButton label={t.finish} onPress={finish} disabled={busy || name.trim().length < 2} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, padding: 16, justifyContent: "center" },
  card: { gap: 16, padding: 22, borderRadius: 24, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.line },
  title: { color: colors.cyanSoft, fontFamily: fonts.display, fontSize: 28 },
  error: { color: "#FFB4B4" },
  hindi: { fontFamily: fonts.hindi }
});

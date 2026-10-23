import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { devCodeFrom } from "../../src/auth/otp";
import { setPendingOtp } from "../../src/auth/pending";
import { useI18n } from "../../src/i18n";
import { fonts } from "../../src/theme";
import { PrimaryButton, TextButton } from "../../src/ui/buttons";
import { Field, Muted } from "../../src/ui/controls";
import { usePalette } from "../../src/ui/theme";

type Sent = { sent: true; channel?: string; resendAfterSec?: number; devCode?: string };

export default function SignupScreen() {
  const palette = usePalette();
  const { t, lang } = useI18n();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const sent = await apiData<Sent>("/api/v1/auth/otp/signup", {
        method: "POST",
        body: JSON.stringify({ action: "request", phone })
      });
      setPendingOtp({
        phone,
        mode: "signup",
        channel: sent.channel,
        resendAfterSec: sent.resendAfterSec || 30,
        devCode: devCodeFrom(sent),
        sentAt: Date.now()
      });
      router.push("/(auth)/code");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]}>
      <View style={styles.body}>
        <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.signupTitle}</Text>
        <Muted>{t.signupSub}</Muted>
        <Field label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
        {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
        <PrimaryButton label={t.sendCode} onPress={send} disabled={busy || phone.trim().length < 10} />
        <TextButton label={t.haveLogin} onPress={() => router.replace("/(auth)/login")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 22, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 32 },
  error: { fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

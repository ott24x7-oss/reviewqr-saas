import { router } from "expo-router";
import { useState , useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { devCodeFrom } from "../../src/auth/otp";
import { setPendingOtp } from "../../src/auth/pending";
import { useI18n } from "../../src/i18n";
import { fonts } from "../../src/theme";
import { usePalette } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";
import { Field, Muted, PillButton } from "../../src/ui/controls";

type Sent = { sent: true; channel?: string; resendAfterSec?: number; devCode?: string };

export default function SignupScreen() {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
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
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.signupTitle}</Text>
        <Muted>{t.signupSub}</Muted>
        <Field label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PillButton label={t.sendCode} onPress={send} disabled={busy || phone.trim().length < 10} />
        <Pressable onPress={() => router.replace("/(auth)/login")}>
          <Text style={[styles.link, lang === "hi" && styles.hindi]}>{t.haveLogin}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, padding: 16, justifyContent: "center" },
  card: { gap: 16, padding: 22, borderRadius: 24, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.line },
  title: { color: colors.cyanSoft, fontFamily: fonts.display, fontSize: 32 },
  link: { color: colors.cyanSoft, fontFamily: fonts.bodyStrong, minHeight: 48 },
  error: { color: "#FFB4B4" },
  hindi: { fontFamily: fonts.hindi }
});
}

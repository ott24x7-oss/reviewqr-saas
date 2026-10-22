import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { devCodeFrom } from "../../src/auth/otp";
import { setPendingOtp } from "../../src/auth/pending";
import { useI18n } from "../../src/i18n";
import { colors, fonts } from "../../src/theme";
import { Field, Muted, PillButton } from "../../src/ui/controls";

type Sent = { sent: true; channel?: "whatsapp" | "email" | "dev"; resendAfterSec?: number; devCode?: string };

export default function LoginScreen() {
  const { t, lang, toggle } = useI18n();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setError(null);
    if (!apiBaseUrl()) {
      setError(t.missingApi);
      return;
    }
    setBusy(true);
    try {
      const sent = await apiData<Sent>("/api/v1/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ phone })
      });
      setPendingOtp({
        phone,
        mode: "login",
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
      <View style={styles.glow} />
      <View style={styles.card}>
        <Pressable onPress={toggle} style={styles.lang}>
          <Text style={styles.langText}>{t.language}</Text>
        </Pressable>
        <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.welcome}</Text>
        <Muted>{t.welcomeSub}</Muted>
        <Field label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PillButton label={t.sendCode} onPress={send} disabled={busy || phone.trim().length < 10} />
        <Pressable onPress={() => router.push("/(auth)/signup")}>
          <Text style={[styles.link, lang === "hi" && styles.hindi]}>{t.haveAccount}</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/(auth)/email")}>
          <Text style={[styles.link, lang === "hi" && styles.hindi]}>{t.emailInstead}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, padding: 16, justifyContent: "center" },
  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(53,200,240,0.16)",
    top: 80,
    alignSelf: "center"
  },
  card: {
    gap: 16,
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.line
  },
  title: { color: colors.cyanSoft, fontFamily: fonts.display, fontSize: 36 },
  link: { color: colors.cyanSoft, fontFamily: fonts.bodyStrong, minHeight: 44 },
  error: { color: "#FFB4B4", fontFamily: fonts.body },
  lang: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center" },
  langText: { color: colors.cyan, fontFamily: fonts.bodyStrong },
  hindi: { fontFamily: fonts.hindi }
});

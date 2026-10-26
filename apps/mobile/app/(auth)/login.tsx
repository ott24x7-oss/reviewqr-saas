import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { devCodeFrom } from "../../src/auth/otp";
import { setPendingOtp } from "../../src/auth/pending";
import { useI18n } from "../../src/i18n";
import { fonts } from "../../src/theme";
import { PrimaryButton, TextButton } from "../../src/ui/buttons";
import { StickyAction } from "../../src/ui/controls";
import { BLURHASH } from "../../src/ui/tokens";
import { useTheme } from "../../src/ui/theme";

type Sent = { sent: true; channel?: "whatsapp" | "email" | "dev"; resendAfterSec?: number; devCode?: string };

export default function LoginScreen() {
  const { t, lang, toggle } = useI18n();
  const { palette } = useTheme();
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
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]} edges={["top"]}>
      <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bottomOffset={12}>
        <Image source={require("../../assets/onboarding/photo-cafe.webp")} style={styles.strip} contentFit="cover" placeholder={{ blurhash: BLURHASH }} />
        <View style={styles.body}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.language} accessibilityState={{ selected: lang === "hi" }} onPress={toggle} style={styles.lang}>
          <Text style={[styles.langText, { color: palette.deep }]}>{t.language}</Text>
        </Pressable>
        <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.welcome}</Text>
        <Text style={[styles.sub, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.welcomeSub}</Text>
        <Text style={[styles.label, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.phone}</Text>
        <View style={[styles.phoneRow, { backgroundColor: palette.card, borderColor: palette.line }]}>
          <View style={[styles.prefix, { backgroundColor: palette.paper }]}>
            <Text style={[styles.prefixText, { color: palette.ink }]}>+91</Text>
          </View>
          <TextInput
            accessibilityLabel={t.phone}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="98765 43210"
            placeholderTextColor={palette.muted}
            style={[styles.input, { color: palette.ink }]}
          />
        </View>
        {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
        <TextButton label={t.haveAccount} onPress={() => router.push("/(auth)/signup")} />
        <TextButton label={t.emailInstead} onPress={() => router.push("/(auth)/email")} />
        </View>
      </KeyboardAwareScrollView>
      <StickyAction>
        <PrimaryButton
          label={t.sendCode}
          onPress={send}
          disabled={busy || phone.trim().length < 10}
          hint={phone.trim().length < 10 ? t.hintPhone : t.hintWait}
        />
      </StickyAction>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  strip: { height: 180, width: "100%" },
  body: { padding: 22, gap: 12 },
  lang: { alignSelf: "flex-end", minHeight: 48, justifyContent: "center", paddingHorizontal: 8 },
  langText: { fontFamily: fonts.bodyStrong },
  title: { fontFamily: fonts.display, fontSize: 32 },
  sub: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.bodyStrong, fontSize: 14 },
  phoneRow: { minHeight: 56, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", padding: 6, gap: 8 },
  prefix: { minHeight: 48, borderRadius: 12, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  prefixText: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  input: { flex: 1, minHeight: 48, fontFamily: fonts.body, fontSize: 18 },
  error: { fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { setPendingOtp } from "../../src/auth/pending";
import { useI18n } from "../../src/i18n";
import { fonts } from "../../src/theme";
import { PrimaryButton, TextButton } from "../../src/ui/buttons";
import { Muted, StickyAction } from "../../src/ui/controls";
import { usePalette } from "../../src/ui/theme";

type MagicConfig = { enabled: boolean; signupWaUrl: string };

export default function SignupScreen() {
  const params = useLocalSearchParams<{ ref?: string | string[]; signup?: string | string[] }>();
  const palette = usePalette();
  const { t, lang } = useI18n();
  const [magic, setMagic] = useState<MagicConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const claimStarted = useRef(false);
  const signupToken = Array.isArray(params.signup) ? params.signup[0] : params.signup;
  const referralCode = (Array.isArray(params.ref) ? params.ref[0] : params.ref)?.trim().slice(0, 40);

  useEffect(() => {
    let live = true;
    const baseUrl = apiBaseUrl() || "https://qr24x7.in";
    fetch(`${baseUrl}/api/v1/auth/magic/config`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (live && config && typeof config.enabled === "boolean" && typeof config.signupWaUrl === "string") setMagic(config);
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!signupToken || claimStarted.current) return;
    claimStarted.current = true;
    setBusy(true);
    setError(null);
    apiData<{ phone: string; signupToken: string }>("/api/v1/auth/signup/verify", {
      method: "POST",
      body: JSON.stringify({ signupToken })
    })
      .then((claimed) => {
        setPendingOtp({
          phone: claimed.phone,
          mode: "signup",
          resendAfterSec: 0,
          devCode: null,
          sentAt: Date.now(),
          signupToken: claimed.signupToken,
          referralCode
        });
        router.replace("/(auth)/business");
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t.signupLinkInvalid))
      .finally(() => setBusy(false));
  }, [signupToken, referralCode, t.signupLinkInvalid]);

  async function continueWithWhatsApp() {
    if (!magic?.enabled || !magic.signupWaUrl) return;
    setBusy(true);
    setError(null);
    try {
      await Linking.openURL(magic.signupWaUrl);
    } catch {
      setError(t.openWhatsappFailed);
    } finally {
      setBusy(false);
    }
  }

  async function continueWithEmail() {
    setBusy(true);
    setError(null);
    try {
      const baseUrl = apiBaseUrl() || "https://qr24x7.in";
      await WebBrowser.openBrowserAsync(`${baseUrl}/register?method=email`);
    } catch {
      setError(t.emailSignupFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]} edges={["top"]}>
      <View style={styles.screen}>
        <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" bottomOffset={12}>
          <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.signupTitle}</Text>
          <Muted>{t.signupSub}</Muted>
          {busy && signupToken ? <ActivityIndicator color={palette.primary} /> : null}
          {error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
          <TextButton label={t.haveLogin} onPress={() => router.replace("/(auth)/login")} />
        </KeyboardAwareScrollView>
        <StickyAction>
          {magic?.enabled && magic.signupWaUrl ? (
            <PrimaryButton label={t.signupWithWhatsApp} onPress={continueWithWhatsApp} disabled={busy} hint={t.hintWait} />
          ) : null}
          <TextButton label={t.continueWithEmail} onPress={continueWithEmail} disabled={busy} />
        </StickyAction>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 22, gap: 14, paddingBottom: 24 },
  title: { fontFamily: fonts.display, fontSize: 32 },
  error: { fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

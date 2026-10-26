import { router } from "expo-router";
import { useEffect, useState } from "react";
import type { PendingOtp } from "../../src/auth/pending";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { devCodeFrom } from "../../src/auth/otp";
import { getPendingOtp, patchPendingOtp, setPendingOtp } from "../../src/auth/pending";
import { useI18n } from "../../src/i18n";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { PrimaryButton } from "../../src/ui/buttons";
import { StickyAction } from "../../src/ui/controls";
import { OtpCodeForm } from "../../src/ui/otp-form";
import { usePalette } from "../../src/ui/theme";
import type { TokenPair } from "@reviewqr/shared";

type Sent = { sent: true; channel?: string; resendAfterSec?: number; devCode?: string };

export default function CodeScreen() {
  const { t, lang } = useI18n();
  const palette = usePalette();
  const { saveSession } = useSession();
  const [pending, setPending] = useState<PendingOtp | null>(getPendingOtp());
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(pending?.resendAfterSec ?? 30);

  useEffect(() => {
    if (!pending) router.replace("/(auth)/login");
  }, [pending]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [pending?.sentAt]);

  if (!pending) return null;
  const challenge = pending;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (challenge.mode === "signup") {
        const confirmed = await apiData<{ signupToken: string }>("/api/v1/auth/otp/signup", {
          method: "POST",
          body: JSON.stringify({ action: "confirm", phone: challenge.phone, code })
        });
        patchPendingOtp({ signupToken: confirmed.signupToken });
        router.replace("/(auth)/business");
        return;
      }
      const pair = await apiData<TokenPair>("/api/v1/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone: challenge.phone, code, deviceName: "Android" })
      });
      await saveSession(pair);
      router.replace("/(app)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      const path = challenge.mode === "signup" ? "/api/v1/auth/otp/signup" : "/api/v1/auth/otp/request";
      const body =
        challenge.mode === "signup"
          ? { action: "request", phone: challenge.phone }
          : { phone: challenge.phone };
      const sent = await apiData<Sent>(path, { method: "POST", body: JSON.stringify(body) });
      const next: PendingOtp = {
        ...challenge,
        channel: sent.channel,
        resendAfterSec: sent.resendAfterSec || challenge.resendAfterSec,
        devCode: devCodeFrom(sent),
        sentAt: Date.now()
      };
      setPendingOtp(next);
      setPending(next);
      setSecondsLeft(next.resendAfterSec);
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend");
    }
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]} edges={["top"]}>
      <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bottomOffset={12}>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line }]}>
        <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.codeOnWhatsapp}</Text>
        <Text style={[styles.sent, { color: palette.muted }, lang === "hi" && styles.hindi]}>
          {challenge.mode === "login" ? t.codeMaybe : t.sentTo}
        </Text>
        <OtpCodeForm
          channel={challenge.channel}
          devCode={challenge.devCode}
          phone={challenge.phone}
          code={code}
          onCode={setCode}
          secondsLeft={secondsLeft}
          resendAfterSec={challenge.resendAfterSec}
          onResend={resend}
          onChangeNumber={() => router.back()}
          onSubmit={submit}
          submitting={busy}
          error={error}
          showSubmit={false}
        />
        {challenge.mode === "login" ? (
          <PrimaryButton
            testID="create-account"
            label={t.createAccountPrompt}
            onPress={() => router.replace("/(auth)/signup")}
          />
        ) : null}
        </View>
      </KeyboardAwareScrollView>
      <StickyAction>
        <PrimaryButton label={t.verify} onPress={submit} disabled={busy || code.length !== 6} hint={code.length !== 6 ? t.hintCode : t.hintWait} />
      </StickyAction>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 16, justifyContent: "center" },
  card: { gap: 16, padding: 22, borderRadius: 24, borderWidth: 1 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  sent: { fontFamily: fonts.body, fontSize: 15 },
  hindi: { fontFamily: fonts.hindi }
});

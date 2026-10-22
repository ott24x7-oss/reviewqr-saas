import { router } from "expo-router";
import { useEffect, useState } from "react";
import type { PendingOtp } from "../../src/auth/pending";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { devCodeFrom } from "../../src/auth/otp";
import { getPendingOtp, patchPendingOtp, setPendingOtp } from "../../src/auth/pending";
import { useI18n } from "../../src/i18n";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";
import { OtpCodeForm } from "../../src/ui/otp-form";
import type { TokenPair } from "@reviewqr/shared";

type Sent = { sent: true; channel?: string; resendAfterSec?: number; devCode?: string };

export default function CodeScreen() {
  const { t, lang } = useI18n();
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
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.codeTitle}</Text>
        <OtpCodeForm
          channel={challenge.channel}
          devCode={challenge.devCode}
          code={code}
          onCode={setCode}
          secondsLeft={secondsLeft}
          onResend={resend}
          onChangeNumber={() => router.back()}
          onSubmit={submit}
          submitting={busy}
          error={error}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, padding: 16, justifyContent: "center" },
  card: { gap: 16, padding: 22, borderRadius: 24, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.line },
  title: { color: colors.cyanSoft, fontFamily: fonts.display, fontSize: 32 },
  hindi: { fontFamily: fonts.hindi }
});

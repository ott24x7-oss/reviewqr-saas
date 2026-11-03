import type { TokenPair } from "@reviewqr/shared";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { PrimaryButton, TextButton } from "../../src/ui/buttons";
import { Field, StickyAction } from "../../src/ui/controls";
import { OtpCodeForm } from "../../src/ui/otp-form";
import { usePalette } from "../../src/ui/theme";

type EmailOtpRequest = { sent: true; channel: "email"; resendAfterSec: number; message: string };

export default function EmailScreen() {
  const palette = usePalette();
  const { t, lang } = useI18n();
  const { saveSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "email-code">("password");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<string | undefined>(undefined);
  const [resendAfterSec, setResendAfterSec] = useState(30);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verifyLock = useRef(false);

  useEffect(() => {
    if (sentAt === null) {
      setSecondsLeft(0);
      return;
    }
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((sentAt + resendAfterSec * 1000 - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [sentAt, resendAfterSec]);

  async function submitPassword() {
    setBusy(true);
    setError(null);
    try {
      const pair = await apiData<TokenPair>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, deviceName: "Android" })
      });
      await saveSession(pair);
      router.replace("/(app)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Email or password is wrong");
    } finally {
      setBusy(false);
    }
  }

  async function sendEmailCode() {
    setBusy(true);
    setError(null);
    try {
      const sent = await apiData<EmailOtpRequest>("/api/v1/auth/email-otp/request", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      setCodeSent(true);
      setCode("");
      setChannel(sent.channel || "email");
      setResendAfterSec(sent.resendAfterSec || 30);
      setSentAt(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send a code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmailCode() {
    if (verifyLock.current || code.length !== 6) return;
    verifyLock.current = true;
    setBusy(true);
    setError(null);
    try {
      const pair = await apiData<TokenPair>("/api/v1/auth/email-otp/verify", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), code, mode: "mobile", deviceName: "Android" })
      });
      await saveSession(pair);
      router.replace("/(app)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code");
    } finally {
      verifyLock.current = false;
      setBusy(false);
    }
  }

  const emailLooksValid = email.includes("@") && email.trim().includes(".");
  const canSubmit = mode === "password"
    ? emailLooksValid && password.length > 0
    : emailLooksValid && (!codeSent || code.length === 6);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]} edges={["top"]}>
      <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bottomOffset={12}>
        <View style={styles.body}>
          <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>
            {mode === "password" ? t.emailInstead : t.loginWithEmailCode}
          </Text>
          <Field
            label={t.email}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setCode("");
              setCodeSent(false);
              setSentAt(null);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          {mode === "password" ? (
            <Field label={t.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
          ) : codeSent ? (
            <View style={[styles.codeCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
              <Text style={[styles.codeTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.codeOnEmail}</Text>
              <Text style={[styles.notice, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.emailOtpNotice}</Text>
              <OtpCodeForm
                channel={channel}
                recipient={email.trim().toLowerCase()}
                changeLabel={t.changeEmail}
                showCallOption={false}
                code={code}
                onCode={setCode}
                secondsLeft={secondsLeft}
                resendAfterSec={resendAfterSec}
                onResend={sendEmailCode}
                onChangeNumber={() => {
                  setCodeSent(false);
                  setCode("");
                  setSentAt(null);
                }}
                onSubmit={verifyEmailCode}
                submitting={busy}
                error={error}
                showSubmit={false}
              />
            </View>
          ) : null}
          {error && !codeSent ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
          <TextButton
            label={mode === "password" ? t.loginWithEmailCode : t.emailInstead}
            onPress={() => {
              setMode(mode === "password" ? "email-code" : "password");
              setError(null);
            }}
          />
          <TextButton label={t.phoneInstead} onPress={() => router.back()} />
        </View>
      </KeyboardAwareScrollView>
      <StickyAction>
        <PrimaryButton
          label={mode === "password" ? t.signIn : codeSent ? t.verify : t.sendEmailCode}
          onPress={mode === "password" ? submitPassword : codeSent ? verifyEmailCode : sendEmailCode}
          disabled={busy || !canSubmit}
          hint={!emailLooksValid ? t.hintEmailCode : codeSent && code.length !== 6 ? t.hintCode : busy ? t.hintWait : undefined}
        />
      </StickyAction>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  body: { padding: 22, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  codeCard: { gap: 14, padding: 18, borderRadius: 20, borderWidth: 1 },
  codeTitle: { fontFamily: fonts.display, fontSize: 22 },
  notice: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  error: { fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

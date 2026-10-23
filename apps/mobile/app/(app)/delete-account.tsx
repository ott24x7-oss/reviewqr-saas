import { useEffect, useState , useMemo } from "react";
import { ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { devSurfaceAllowed } from "../../src/auth/dev-surface";
import { devCodeFrom, digitsFrom } from "../../src/auth/otp";
import { channelCopy } from "../../src/i18n/copy";
import { useI18n } from "../../src/i18n";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { usePalette } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";
import { PillButton } from "../../src/ui/controls";

type Sent = { channel?: string; resendAfterSec?: number; devCode?: string; message?: string };

export default function DeleteAccountScreen() {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { t, lang } = useI18n();
  const { logout } = useSession();
  const [sent, setSent] = useState<Sent | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sentAt, setSentAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const origin = apiBaseUrl();
  const web = origin ? `${origin}/account/delete` : "/account/delete";
  const privacy = origin ? `${origin}/privacy` : "/privacy";
  const shownCode = devCodeFrom(sent);

  useEffect(() => {
    if (!sentAt) return;
    const timer = setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [sentAt]);

  async function requestCode() {
    setBusy(true);
    setError(null);
    try {
      const data = await apiData<Sent>("/api/v1/me/deletion", {
        method: "POST",
        body: JSON.stringify({ action: "request" })
      });
      setSent(data);
      setSecondsLeft(data.resendAfterSec ?? 30);
      setSentAt(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send a code");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await apiData("/api/v1/me/deletion", {
        method: "POST",
        body: JSON.stringify({ action: "confirm", code })
      });
      setDone(true);
      await logout();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.deleteAccount}</Text>
      <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.deleteHint}</Text>
      <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.privacyWeb}</Text>
      <Text style={styles.url}>{privacy}</Text>
      <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.deleteWeb}</Text>
      <Text style={styles.url}>{web}</Text>
      {done ? <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.deleteDone}</Text> : null}
      {sent && !done ? (
        <>
          <Text style={[styles.note, lang === "hi" && styles.hindi]}>{channelCopy(sent.channel, lang)}</Text>
          <TextInput
            accessibilityLabel={t.codeTitle}
            value={code}
            onChangeText={(value) => setCode(digitsFrom(value))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={6}
            style={styles.code}
          />
          {devSurfaceAllowed() && shownCode ? (
            <Text style={styles.dev}>
              {t.devHint}: {shownCode}
            </Text>
          ) : null}
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!done && !sent ? <PillButton label={t.deleteSend} onPress={() => { void requestCode(); }} disabled={busy} hint={t.hintWait} tone="dark" /> : null}
      {!done && sent ? (
        <>
          <PillButton
            label={t.deleteAccount}
            onPress={() => { void confirm(); }}
            disabled={busy || code.length !== 6}
            hint={code.length !== 6 ? t.hintCode : t.hintWait}
            tone="dark"
          />
          <PillButton label={secondsLeft > 0 ? `${t.resendIn} ${secondsLeft}s` : t.resend} onPress={() => { void requestCode(); }} disabled={busy || secondsLeft > 0} tone="outline" />
        </>
      ) : null}
    </ScrollView>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 16 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  note: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16 },
  url: { color: colors.ink, fontFamily: fonts.bodyStrong, fontSize: 14 },
  code: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: colors.card,
    color: colors.ink,
    fontSize: 28,
    letterSpacing: 8,
    textAlign: "center",
    fontFamily: fonts.title
  },
  dev: { color: colors.success, fontFamily: fonts.bodyStrong },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});
}

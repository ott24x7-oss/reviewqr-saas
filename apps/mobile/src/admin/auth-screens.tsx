import { useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ShieldCheck, Fingerprint, Smartphone, LockKeyhole, Mail } from "lucide-react-native";
import { useAdminSession } from "./session";
import { adminMockEnabled } from "./env";
import { devCodeFrom } from "../auth/otp";
import { devSurfaceAllowed } from "../auth/dev-surface";
import { useAdminCopy } from "./copy";
import { AdminCard } from "./components";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Field, PillButton } from "../ui/controls";
import { Screen } from "../ui/screen";
import { useTheme } from "../ui/theme";

export function AdminLoginScreen() {
  const t = useAdminCopy();
  const { lang, t: appT } = useI18n();
  const { palette } = useTheme();
  const { sendOtp, verifyOtp } = useAdminSession();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function requestCode() {
    if (phone.replace(/\D/g, "").length < 10) return;
    setBusy(true);
    setError(false);
    try { const result = await sendOtp(phone); setSent(result.sent); setDevCode(devCodeFrom(result)); } catch { setError(true); } finally { setBusy(false); }
  }

  async function confirmCode() {
    if (!sent || !/^\d{6}$/.test(code.trim())) return;
    setBusy(true);
    setError(false);
    try { await verifyOtp(phone, code); } catch { setError(true); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled" bottomOffset={16}>
        <View style={styles.authPage}>
          <View style={[styles.brandMark, { backgroundColor: palette.accentSoft }]}><ShieldCheck color={palette.primary} size={31} /></View>
          <Text style={[styles.brand, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{t.appName}</Text>
          <Text style={[styles.authTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{t.signIn}</Text>
          <Text style={[styles.authBody, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.signInBody}</Text>
          <AdminCard style={styles.authCard}>
            <Field label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" returnKeyType="done" editable={!sent} />
            {sent ? <Text style={[styles.info, { color: palette.success }, lang === "hi" && styles.hindi]}>{t.otpSent}</Text> : null}
            {sent ? <Field label={t.otp} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} returnKeyType="done" /> : null}
            {adminMockEnabled() ? <Text style={[styles.mockHint, { color: palette.muted }]}>{lang === "hi" ? "स्थानीय मॉक · 123456" : "Local mock · 123456"}</Text> : null}
            {devCode && devSurfaceAllowed() ? <Text style={[styles.mockHint, { color: palette.muted }]}>{appT.devHint} · {devCode}</Text> : null}
            {error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
            {busy ? <ActivityIndicator color={palette.primary} /> : null}
            {!sent ? <PillButton label={t.requestOtp} tone="dark" onPress={() => requestCode().catch(() => undefined)} disabled={phone.replace(/\D/g, "").length < 10 || busy} /> : <PillButton label={t.verifyOtp} tone="dark" onPress={() => confirmCode().catch(() => undefined)} disabled={!/^\d{6}$/.test(code.trim()) || busy} />}
          </AdminCard>
          <View style={styles.securityNote}><LockKeyhole color={palette.muted} size={17} /><Text style={[styles.noteText, { color: palette.muted }]}>{t.adminOnly}</Text></View>
        </View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

export function AdminWaitingScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const { admin, device, refreshStatus, signOut } = useAdminSession();
  const [checking, setChecking] = useState(false);
  async function check() { setChecking(true); try { await refreshStatus(); } finally { setChecking(false); } }
  return (
    <Screen>
      <View style={styles.centerPage}>
        <AdminCard style={styles.centerCard}>
          <View style={[styles.largeIcon, { backgroundColor: palette.accentSoft }]}><Smartphone color={palette.primary} size={30} /></View>
          <Text style={[styles.authTitle, { color: palette.ink, textAlign: "center" }, lang === "hi" && styles.hindiStrong]}>{t.devicePending}</Text>
          <Text style={[styles.authBody, { color: palette.muted, textAlign: "center" }, lang === "hi" && styles.hindi]}>{t.devicePendingBody}</Text>
          {admin || device ? <Text style={[styles.noteText, { color: palette.muted }]}>{[device?.name, admin?.phoneMasked].filter(Boolean).join(" · ")}</Text> : null}
          <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`mailto:${t.supportEmail}`).catch(() => undefined)} style={styles.supportRow}><Mail color={palette.primary} size={17} /><Text style={[styles.supportText, { color: palette.primary }, lang === "hi" && styles.hindi]}>{t.supportContact} · {t.supportEmail}</Text></Pressable>
          {checking ? <ActivityIndicator color={palette.primary} /> : null}
          <PillButton label={t.refreshStatus} tone="dark" onPress={() => check().catch(() => undefined)} disabled={checking} />
          <PillButton label={t.signOut} tone="outline" onPress={() => signOut().catch(() => undefined)} />
        </AdminCard>
      </View>
    </Screen>
  );
}

export function AdminLockScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const { admin, device, unlock, signOut } = useAdminSession();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function open() { setBusy(true); setFailed(false); const ok = await unlock(); setFailed(!ok); setBusy(false); }
  return (
    <Screen>
      <View style={styles.centerPage}>
        <AdminCard style={styles.centerCard}>
          <View style={[styles.largeIcon, { backgroundColor: palette.accentSoft }]}><Fingerprint color={palette.primary} size={34} /></View>
          <Text style={[styles.authTitle, { color: palette.ink, textAlign: "center" }, lang === "hi" && styles.hindiStrong]}>{t.unlock}</Text>
          <Text style={[styles.authBody, { color: palette.muted, textAlign: "center" }, lang === "hi" && styles.hindi]}>{admin ? [device?.name, admin.phoneMasked].filter(Boolean).join(" · ") : t.unlockBody}</Text>
          {failed ? <Text style={[styles.error, { color: palette.danger }]}>{t.unlockFailed}</Text> : null}
          {busy ? <ActivityIndicator color={palette.primary} /> : null}
          <PillButton label={t.unlockButton} tone="dark" onPress={() => open().catch(() => undefined)} disabled={busy} />
          <PillButton label={t.signOut} tone="outline" onPress={() => signOut().catch(() => undefined)} />
        </AdminCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  authScroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  authPage: { width: "100%", maxWidth: 430, alignSelf: "center", gap: 13 },
  brandMark: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  brand: { fontFamily: fonts.bodyStrong, fontSize: 15, letterSpacing: 0.3 },
  authTitle: { fontFamily: fonts.title, fontSize: 25 },
  authBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  authCard: { gap: 13, padding: 17, marginTop: 8 },
  info: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  mockHint: { fontFamily: fonts.body, fontSize: 12, textAlign: "center" },
  error: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  securityNote: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  noteText: { fontFamily: fonts.body, fontSize: 13, textAlign: "center" },
  centerPage: { flex: 1, justifyContent: "center", padding: 20 },
  centerCard: { alignItems: "center", gap: 16, padding: 23 },
  largeIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  supportRow: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  supportText: { fontFamily: fonts.bodyStrong, fontSize: 12, textAlign: "center" },
  hindi: { fontFamily: fonts.hindi },
  hindiStrong: { fontFamily: fonts.hindiStrong }
});

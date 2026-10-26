import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Screen } from "../../src/ui/screen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { Field, PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";

function AccountScreenContent() {
  const { t, lang, choose } = useI18n();
  const { palette } = useTheme();
  const { user, logout, refreshUser } = useSession();
  const client = useQueryClient();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefs = useQuery({
    queryKey: accountKey(user?.id ?? "", "report-prefs"),
    enabled: !!user,
    queryFn: () => apiData<{ whatsappOptIn: boolean; emailOptIn: boolean }>("/api/v1/reports/preferences")
  });

  async function saveName() {
    setError(null);
    try {
      await apiData("/api/v1/me", { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  async function sendCode() {
    setError(null);
    try {
      await apiData("/api/v1/me/phone", { method: "POST", body: JSON.stringify({ phone }) });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the code");
    }
  }

  async function confirm() {
    setError(null);
    try {
      await apiData("/api/v1/me/phone", { method: "PUT", body: JSON.stringify({ phone, code }) });
      setSent(false);
      setCode("");
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not confirm");
    }
  }

  async function weekly(on: boolean) {
    setError(null);
    try {
      await apiData("/api/v1/reports/preferences", { method: "PUT", body: JSON.stringify({ whatsappOptIn: on }) });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "report-prefs") });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  return (
    <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.account}</Text>
      <Text style={[styles.note, { color: palette.muted }]}>{user?.phone}</Text>
      <Field label={t.profileName} tone="paper" value={name} onChangeText={setName} />
      <PillButton label={t.save} tone="dark" onPress={saveName} />
      <Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.changeNumber}</Text>
      <Field label={t.newNumber} tone="paper" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <PillButton label={t.sendCode} tone="outline" onPress={sendCode} />
      {sent ? (
        <>
          <Field label={t.confirmCode} tone="paper" value={code} onChangeText={setCode} keyboardType="number-pad" />
          <PillButton label={t.confirmCode} tone="dark" onPress={confirm} />
        </>
      ) : null}
      <PillButton label={lang === "en" ? t.hindi : t.english} tone="outline" onPress={() => choose(lang === "en" ? "hi" : "en")} />
      {prefs.isLoading ? <Skeleton height={54} /> : null}
      {prefs.isError ? <LoadErrorCard onRetry={() => prefs.refetch().catch(() => undefined)} /> : null}
      <PillButton label={prefs.data?.whatsappOptIn ? t.weeklyReport : t.weeklyReport} tone={prefs.data?.whatsappOptIn ? "dark" : "outline"} onPress={() => weekly(!prefs.data?.whatsappOptIn)} />
      <PillButton label={t.logoutEverywhere} tone="outline" onPress={async () => { await apiData("/api/v1/me/sessions", { method: "DELETE" }).catch(() => undefined); await logout(); }} />
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  section: { fontFamily: fonts.bodyStrong, fontSize: 18, marginTop: 8 },
  note: { fontFamily: fonts.body, fontSize: 14 },
  hindi: { fontFamily: fonts.hindi }
});

export default function AccountScreen() {
  return (
    <Screen topInset={true}><AccountScreenContent /></Screen>
  );
}

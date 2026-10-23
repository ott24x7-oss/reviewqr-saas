import type { TokenPair } from "@reviewqr/shared";
import { router } from "expo-router";
import { useState , useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { usePalette } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";
import { Field, PillButton } from "../../src/ui/controls";

export default function EmailScreen() {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { t, lang } = useI18n();
  const { saveSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const pair = await apiData<TokenPair>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, deviceName: "Android" })
      });
      await saveSession(pair);
      router.replace("/(app)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Email or password is wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.emailInstead}</Text>
        <Field label={t.email} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label={t.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PillButton label={t.signIn} onPress={submit} disabled={busy || !email.includes("@") || password.length < 1} />
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.link, lang === "hi" && styles.hindi]}>{t.phoneInstead}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, padding: 16, justifyContent: "center" },
  card: { gap: 16, padding: 22, borderRadius: 24, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.line },
  title: { color: colors.cyanSoft, fontFamily: fonts.display, fontSize: 28 },
  link: { color: colors.cyanSoft, fontFamily: fonts.bodyStrong, minHeight: 48 },
  error: { color: "#FFB4B4" },
  hindi: { fontFamily: fonts.hindi }
});
}

import type { TokenPair } from "@reviewqr/shared";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { PrimaryButton, TextButton } from "../../src/ui/buttons";
import { Field } from "../../src/ui/controls";
import { usePalette } from "../../src/ui/theme";

export default function EmailScreen() {
  const palette = usePalette();
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
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]}>
      <View style={styles.body}>
        <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.emailInstead}</Text>
        <Field label={t.email} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label={t.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
        <PrimaryButton label={t.signIn} onPress={submit} disabled={busy || !email.includes("@") || password.length < 1} />
        <TextButton label={t.phoneInstead} onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: 22, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  error: { fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

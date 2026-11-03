import { Image } from "expo-image";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { apiBaseUrl } from "../../src/api/instance";
import { useI18n } from "../../src/i18n";
import { fonts } from "../../src/theme";
import { PrimaryButton, TextButton } from "../../src/ui/buttons";
import { StickyAction } from "../../src/ui/controls";
import { BLURHASH } from "../../src/ui/tokens";
import { useTheme } from "../../src/ui/theme";

type MagicConfig = { enabled: boolean; waUrl: string };

export default function LoginScreen() {
  const { t, lang, toggle } = useI18n();
  const { palette } = useTheme();
  const [magic, setMagic] = useState<MagicConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const baseUrl = apiBaseUrl();
    if (!baseUrl) return;
    let live = true;
    fetch(`${baseUrl}/api/v1/auth/magic/config`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (live && config && typeof config.enabled === "boolean" && typeof config.waUrl === "string") {
          setMagic(config);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  async function continueWithWhatsApp() {
    if (!magic?.enabled || !magic.waUrl) return;
    setBusy(true);
    setError(null);
    try {
      await Linking.openURL(magic.waUrl);
    } catch {
      setError("Could not open WhatsApp. Please use email and password instead.");
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
          {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
          <TextButton label={t.haveAccount} onPress={() => router.push("/(auth)/signup")} />
          <TextButton label={t.emailInstead} onPress={() => router.push("/(auth)/email")} />
        </View>
      </KeyboardAwareScrollView>
      {magic?.enabled && magic.waUrl ? (
        <StickyAction>
          <PrimaryButton
            label={t.continueWhatsApp}
            onPress={continueWithWhatsApp}
            disabled={busy}
            hint={t.hintWait}
          />
        </StickyAction>
      ) : null}
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
  error: { fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

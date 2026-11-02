import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../src/i18n";
import { readIntroSeen } from "../src/onboarding/seen";
import { useSession } from "../src/state/session";
import { fonts } from "../src/theme";
import { usePalette } from "../src/ui/theme";

export default function Gate() {
  const palette = usePalette();
  const { t } = useI18n();
  const { ready, user } = useSession();
  const [introReady, setIntroReady] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);
  useEffect(() => {
    readIntroSeen()
      .then(setIntroSeen)
      .catch(() => setIntroSeen(false))
      .finally(() => setIntroReady(true));
  }, []);
  if (!ready || !introReady) {
    return (
      <View style={[styles.launch, { backgroundColor: palette.primary }]}>
        <Image source={require("../assets/splash-mark.png")} resizeMode="contain" tintColor={palette.onPrimary} style={styles.mark} />
        <Text style={[styles.brand, { color: palette.onPrimary }]}>{t.brand}</Text>
        <Text style={[styles.tag, { color: palette.onPrimary }]}>Scan. Tap. Grow.</Text>
      </View>
    );
  }
  if (!introSeen) return <Redirect href="/(intro)" />;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(app)" />;
}

const styles = StyleSheet.create({
  launch: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  mark: { width: 120, height: 120 },
  brand: { fontFamily: fonts.display, fontSize: 28 },
  tag: { fontFamily: fonts.body, fontSize: 15, opacity: 0.85 }
});

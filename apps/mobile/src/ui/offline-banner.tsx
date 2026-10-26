import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { useOnline } from "../net/online";
import { fonts } from "../theme";
import { useTheme } from "./theme";

export function ConnectivityBanner() {
  const online = useOnline();
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  if (online) return null;
  return (
    <View accessibilityRole="alert" style={[styles.bar, { backgroundColor: palette.surface2 }]} pointerEvents="none">
      <Text style={[styles.text, { color: palette.text }, lang === "hi" && styles.hindi]}>{t.offlineBanner}</Text>
    </View>
  );
}

export function QueryRetryBar() {
  const client = useQueryClient();
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const cache = client.getQueryCache();
  const [, setTick] = useState(0);
  useEffect(() => cache.subscribe(() => setTick((value) => value + 1)), [cache]);
  const failed = cache.getAll().filter((query) => query.state.status === "error").length;
  if (failed === 0) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.retryLoad}
      onPress={() => {
        void client.refetchQueries({ predicate: (query) => query.state.status === "error" });
      }}
      style={[styles.bar, { top: 44, backgroundColor: palette.primary }]}
    >
      <Text style={[styles.text, { color: palette.onPrimary }, lang === "hi" && styles.hindi]}>{t.retryLoad}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: "#1C1813",
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  text: { fontFamily: fonts.body, fontSize: 14, textAlign: "center" },
  hindi: { fontFamily: fonts.hindi }
});

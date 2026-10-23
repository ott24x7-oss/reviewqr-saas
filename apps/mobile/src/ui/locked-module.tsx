import { useMemo } from "react";
import { lockedModuleText, type LockedModule } from "@reviewqr/shared";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { usePalette } from "./theme";
import type { Palette } from "./tokens";

export function LockedModuleCard({ moduleId }: { moduleId: LockedModule }) {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { lang } = useI18n();
  const copy = lockedModuleText(moduleId, lang === "hi" ? "hi" : "en");
  return (
    <View style={styles.card} testID="locked-module">
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{copy.title}</Text>
      <Text style={[styles.body, lang === "hi" && styles.hindi]}>{copy.body}</Text>
    </View>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 18, gap: 8 },
  title: { fontFamily: fonts.title, fontSize: 18, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.inkSoft, lineHeight: 22 },
  hindi: { fontFamily: fonts.hindi }
});
}

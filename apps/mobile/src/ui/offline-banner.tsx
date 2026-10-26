import { StyleSheet, Text, View } from "react-native";
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

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  text: { fontFamily: fonts.body, fontSize: 14, textAlign: "center" },
  hindi: { fontFamily: fonts.hindi }
});

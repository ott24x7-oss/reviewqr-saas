import { Screen } from "../../src/ui/screen";
import { LinearGradient } from "expo-linear-gradient";
import { Check } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../src/i18n";
import { fonts } from "../../src/theme";
import { useTheme } from "../../src/ui/theme";
import {
  APP_THEMES,
  APP_THEME_NAMES,
  CINEMATIC_ACCENTS,
  getThemePalette,
  type AppThemeName,
  type CinematicAccent
} from "../../src/ui/tokens";
import { tapLight } from "../../src/ui/haptics";

const accentLabels: Record<CinematicAccent, "accentGold" | "accentNeonTeal" | "accentMagenta" | "accentElectricBlue"> = {
  gold: "accentGold",
  "neon-teal": "accentNeonTeal",
  magenta: "accentMagenta",
  "electric-blue": "accentElectricBlue"
};

function ThemeScreenContent() {
  const { t, lang } = useI18n();
  const { palette, scheme, appTheme, cinematicAccent, setAppTheme, setCinematicAccent } = useTheme();

  function chooseTheme(theme: AppThemeName) {
    tapLight();
    setAppTheme(theme);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.theme}</Text>
      <Text style={[styles.intro, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.appThemeIntro}</Text>

      <View style={styles.grid}>
        {APP_THEMES.map((theme) => {
          const previewScheme = theme === "cinematic" ? "dark" : scheme;
          const preview = getThemePalette(theme, previewScheme, cinematicAccent);
          const selected = appTheme === theme;
          return (
            <View key={theme} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={APP_THEME_NAMES[theme]}
                accessibilityState={{ selected }}
                onPress={() => chooseTheme(theme)}
                style={[styles.themeCard, {
                  backgroundColor: preview.bg,
                  borderColor: selected ? preview.primary : palette.line,
                  borderWidth: selected ? 2 : 1
                }]}
              >
                <View style={[styles.miniHeader, { backgroundColor: preview.header }]}>
                  <Text style={[styles.miniBusiness, { color: preview.headerInk }]}>QR24x7</Text>
                  <Text style={[styles.miniCaption, { color: preview.headerInk, opacity: 0.7 }]}>Good morning</Text>
                </View>
                <View style={[styles.miniCard, { backgroundColor: preview.surface, borderColor: preview.line }]}>
                  <Text style={[styles.miniCaption, { color: preview.muted }]}>Today</Text>
                  <Text style={[styles.miniValue, { color: theme === "cinematic" ? preview.primary : preview.text }]}>42</Text>
                  <LinearGradient colors={[...preview.buttonGradient]} style={styles.miniButton}>
                    <Text style={[styles.miniButtonText, { color: preview.onPrimary }]}>View activity</Text>
                  </LinearGradient>
                </View>
                <View style={[styles.miniTabs, { backgroundColor: preview.surface, borderTopColor: preview.line }]}>
                  {[0, 1, 2, 3].map((tab) => (
                    <View key={tab} style={[styles.miniTab, { backgroundColor: tab === 0 ? preview.primary : preview.muted, opacity: tab === 0 ? 1 : 0.4 }]} />
                  ))}
                </View>
                <Text style={[styles.themeName, { color: preview.text }]}>{APP_THEME_NAMES[theme]}</Text>
                {selected ? (
                  <View style={[styles.selectedMark, { backgroundColor: preview.primary }]}>
                    <Check color={preview.onPrimary} size={14} strokeWidth={2.6} />
                  </View>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      {appTheme === "cinematic" ? (
        <View style={[styles.accentPanel, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          <Text style={[styles.accentTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.cinematicAccent}</Text>
          <Text style={[styles.alwaysDark, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.cinematicAlwaysDark}</Text>
          <View style={styles.accentGrid}>
            {CINEMATIC_ACCENTS.map((accent) => {
              const colors = getThemePalette("cinematic", "dark", accent);
              const selected = cinematicAccent === accent;
              return (
                <Pressable
                  key={accent}
                  accessibilityRole="button"
                  accessibilityLabel={t[accentLabels[accent]]}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    tapLight();
                    setCinematicAccent(accent);
                  }}
                  style={[styles.accentOption, { borderColor: selected ? colors.primary : palette.line, backgroundColor: palette.surface2 }]}
                >
                  <View style={[styles.swatch, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.accentLabel, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t[accentLabels[accent]]}</Text>
                  {selected ? <Check color={colors.primary} size={16} strokeWidth={2.5} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  intro: { fontFamily: fonts.body, fontSize: 14, marginBottom: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  cell: { width: "50%", padding: 6 },
  themeCard: { minHeight: 188, borderRadius: 18, overflow: "hidden", paddingBottom: 10, position: "relative" },
  miniHeader: { height: 47, paddingHorizontal: 10, paddingTop: 7, gap: 2 },
  miniBusiness: { fontFamily: fonts.bodyStrong, fontSize: 10 },
  miniCaption: { fontFamily: fonts.body, fontSize: 8 },
  miniCard: { marginHorizontal: 8, marginTop: -5, borderWidth: 1, borderRadius: 12, padding: 8, gap: 2 },
  miniValue: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23 },
  miniButton: { minHeight: 22, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 2 },
  miniButtonText: { fontFamily: fonts.bodyStrong, fontSize: 8 },
  miniTabs: { height: 26, marginTop: 8, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  miniTab: { width: 13, height: 3, borderRadius: 3 },
  themeName: { fontFamily: fonts.bodyStrong, fontSize: 13, marginTop: 7, marginHorizontal: 10 },
  selectedMark: { position: "absolute", right: 8, bottom: 8, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  accentPanel: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 6, marginTop: 4 },
  accentTitle: { fontFamily: fonts.bodyStrong, fontSize: 17 },
  alwaysDark: { fontFamily: fonts.body, fontSize: 13 },
  accentGrid: { gap: 8, marginTop: 4 },
  accentOption: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  swatch: { width: 20, height: 20, borderRadius: 10 },
  accentLabel: { flex: 1, fontFamily: fonts.bodyStrong, fontSize: 14 },
  hindi: { fontFamily: fonts.hindi }
});

export default function ThemeScreen() {
  return (
    <Screen topInset={true}><ThemeScreenContent /></Screen>
  );
}

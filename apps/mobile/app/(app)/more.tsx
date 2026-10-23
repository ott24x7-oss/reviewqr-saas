import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { canWriteNfc } from "../../src/nfc/access";
import { useBusiness } from "../../src/state/business";
import { useEntitlement } from "../../src/state/entitlement";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card } from "../../src/ui/bits";
import { useTheme, type SchemeChoice } from "../../src/ui/theme";

const LINKS = [
  ["pageQr", "/(app)/tap"],
  ["theme", "/(app)/business-edit"],
  ["storeSettings", "/(app)/store"],
  ["staff", "/(app)/staff"],
  ["devices", "/(app)/nfc"],
  ["shop", "/(app)/shop"],
  ["analytics", "/(app)/analytics"],
  ["plans", "/(app)/plan"],
  ["help", "/(app)/help"]
] as const;

export default function MoreScreen() {
  const { t, lang, choose } = useI18n();
  const { palette, choice, setChoice } = useTheme();
  const { user, logout, refreshUser } = useSession();
  const { businesses } = useBusiness();
  const plan = useEntitlement();
  const owns = businesses.some((item) => item.ownerId === user?.id);
  const [error, setError] = useState<string | null>(null);
  const name = lang === "hi" ? plan.data?.plan?.nameHi || plan.data?.plan?.nameEn : plan.data?.plan?.nameEn;

  async function togglePush() {
    if (!user) return;
    setError(null);
    try {
      await apiData("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ pushEnabled: !user.pushEnabled })
      });
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update notifications");
    }
  }

  const themes: SchemeChoice[] = ["system", "light", "dark"];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.more}</Text>
      <Card>
        <Text style={[styles.cardTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{name || plan.data?.tier || t.plans}</Text>
        <Text style={[styles.note, { color: palette.muted }]}>{plan.data?.status}</Text>
        <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.plansWeb}</Text>
      </Card>
      <Card>
        {LINKS.map(([key, href]) => (
          <Pressable key={key} accessibilityRole="button" accessibilityLabel={t[key]} onPress={() => router.push(href)} style={styles.row}>
            <Text style={[styles.rowText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t[key]}</Text>
          </Pressable>
        ))}
        {canWriteNfc(user?.role, owns) ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t.nfc} onPress={() => router.push("/(app)/nfc")} style={styles.row}>
            <Text style={[styles.rowText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.nfc}</Text>
          </Pressable>
        ) : null}
      </Card>
      <Card>
        <Text style={[styles.cardTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.themeMode}</Text>
        <View style={styles.themes}>
          {themes.map((item) => (
            <Pressable key={item} accessibilityRole="button" accessibilityLabel={item === "system" ? t.themeSystem : item === "light" ? t.themeLight : t.themeDark} accessibilityState={{ selected: choice === item }} onPress={() => setChoice(item)} style={[styles.theme, { borderColor: palette.line, backgroundColor: choice === item ? palette.deep : palette.card }]}>
              <Text style={{ color: choice === item ? "#FFFFFF" : palette.ink, fontFamily: fonts.bodyStrong }}>{item === "system" ? t.themeSystem : item === "light" ? t.themeLight : t.themeDark}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t.language} onPress={() => choose(lang === "en" ? "hi" : "en")} style={styles.row}>
          <Text style={[styles.rowText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{lang === "en" ? t.hindi : t.english}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={user?.pushEnabled ? t.pushOn : t.pushOff} onPress={togglePush} style={styles.row}>
          <Text style={[styles.rowText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{user?.pushEnabled ? t.pushOn : t.pushOff}</Text>
        </Pressable>
      </Card>
      <Card>
        <Pressable accessibilityRole="button" accessibilityLabel={t.account} onPress={() => router.push("/(app)/delete-account")} style={styles.row}>
          <Text style={[styles.rowText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.account}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t.deleteAccount} onPress={() => router.push("/(app)/delete-account")} style={styles.row}>
          <Text style={[styles.rowText, { color: palette.danger }, lang === "hi" && styles.hindi]}>{t.deleteAccount}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t.signOut} onPress={() => logout()} style={styles.row}>
          <Text style={[styles.rowText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.signOut}</Text>
        </Pressable>
      </Card>
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  cardTitle: { fontFamily: fonts.title, fontSize: 18 },
  note: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  row: { minHeight: 48, justifyContent: "center" },
  rowText: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  themes: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  theme: { minHeight: 48, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  hindi: { fontFamily: fonts.hindi }
});

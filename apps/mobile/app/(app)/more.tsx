import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { canWriteNfc } from "../../src/nfc/access";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";
import { PillButton } from "../../src/ui/controls";

export default function MoreScreen() {
  const { t, lang } = useI18n();
  const { user, logout, refreshUser } = useSession();
  const { businesses } = useBusiness();
  const owns = businesses.some((item) => item.ownerId === user?.id);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.more}</Text>
      <PillButton label={t.pageQr} onPress={() => router.push("/(app)/tap")} tone="dark" />
      <PillButton label={t.theme} onPress={() => router.push("/(app)/business-edit")} tone="outline" />
      <PillButton label={t.storeSettings} onPress={() => router.push("/(app)/store")} tone="outline" />
      <PillButton label={t.staff} onPress={() => router.push("/(app)/staff")} tone="outline" />
      <PillButton label={t.devices} onPress={() => router.push("/(app)/nfc")} tone="outline" />
      <PillButton label={t.shop} onPress={() => router.push("/(app)/shop")} tone="outline" />
      <PillButton label={t.plans} onPress={() => router.push("/(app)/plan")} tone="outline" />
      <PillButton label={user?.pushEnabled ? t.pushOn : t.pushOff} onPress={togglePush} tone="dark" />
      {canWriteNfc(user?.role, owns) ? (
        <PillButton label={t.nfc} onPress={() => router.push("/(app)/nfc")} tone="outline" />
      ) : null}
      <PillButton label={t.account} onPress={() => router.push("/(app)/delete-account")} tone="outline" />
      <PillButton label={t.deleteAccount} onPress={() => router.push("/(app)/delete-account")} tone="outline" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PillButton label={t.signOut} onPress={() => logout()} tone="outline" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 16 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../src/i18n";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";
import { PillButton } from "../../src/ui/controls";

export default function HomeScreen() {
  const { user, logout } = useSession();
  const { t, lang } = useI18n();
  return (
    <View style={styles.screen}>
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.signedIn}</Text>
      <Text style={styles.name}>{user?.name || user?.phone || user?.email}</Text>
      <PillButton label={t.signOut} onPress={() => logout()} tone="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 20, gap: 16 },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.ink },
  name: { fontFamily: fonts.body, fontSize: 16, color: colors.inkSoft },
  hindi: { fontFamily: fonts.hindi }
});

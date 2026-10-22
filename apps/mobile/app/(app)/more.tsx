import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../src/i18n";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";
import { PillButton } from "../../src/ui/controls";

export default function MoreScreen() {
  const { t, lang } = useI18n();
  const { logout } = useSession();
  return (
    <View style={styles.screen}>
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.more}</Text>
      <PillButton label={t.signOut} onPress={() => logout()} tone="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 20, gap: 16 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  hindi: { fontFamily: fonts.hindi }
});

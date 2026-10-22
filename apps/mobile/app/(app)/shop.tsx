import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../../src/theme";

export default function ShopPlaceholder() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Shop</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 20 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink }
});

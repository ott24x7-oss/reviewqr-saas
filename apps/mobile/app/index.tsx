import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../src/state/session";
import { colors } from "../src/theme";

export default function Gate() {
  const { ready, user } = useSession();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.cyan} />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(app)" />;
}

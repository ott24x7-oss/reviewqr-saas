import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { readIntroSeen } from "../src/onboarding/seen";
import { useSession } from "../src/state/session";
import { colors } from "../src/theme";

export default function Gate() {
  const { ready, user } = useSession();
  const [introReady, setIntroReady] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);
  useEffect(() => {
    readIntroSeen()
      .then(setIntroSeen)
      .catch(() => setIntroSeen(false))
      .finally(() => setIntroReady(true));
  }, []);
  if (!ready || !introReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.cyan} />
      </View>
    );
  }
  if (!introSeen) return <Redirect href="/(intro)" />;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(app)" />;
}

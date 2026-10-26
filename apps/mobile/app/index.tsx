import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { readIntroSeen } from "../src/onboarding/seen";
import { useSession } from "../src/state/session";
import { usePalette } from "../src/ui/theme";

export default function Gate() {
  const palette = usePalette();
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
      <View style={{ flex: 1, backgroundColor: palette.paper, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }
  if (!introSeen) return <Redirect href="/(intro)" />;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(app)" />;
}

import { Redirect, Stack } from "expo-router";
import { useSession } from "../../src/state/session";
import { colors } from "../../src/theme";

export default function OnboardLayout() {
  const { ready, user } = useSession();
  if (ready && !user) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />;
}

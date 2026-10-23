import { Redirect, Stack } from "expo-router";
import { useSession } from "../../src/state/session";
import { usePalette } from "../../src/ui/theme";

export default function OnboardLayout() {
  const palette = usePalette();
  const { ready, user } = useSession();
  if (ready && !user) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }} />;
}

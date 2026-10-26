import { Stack } from "expo-router";
import { usePalette } from "../../src/ui/theme";

export default function AuthLayout() {
  const palette = usePalette();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }} />;
}

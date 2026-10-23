import { Stack } from "expo-router";
import { usePalette } from "../../src/ui/theme";

export default function IntroLayout() {
  const palette = usePalette();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }} />;
}

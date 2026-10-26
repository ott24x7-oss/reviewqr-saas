import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack, useSegments } from "expo-router";
import { AdminLockScreen, AdminWaitingScreen } from "../../src/admin/auth-screens";
import { useAdminSession } from "../../src/admin/session";
import { useTheme } from "../../src/ui/theme";

export default function AdminLayout() {
  const { ready, status, unlocked } = useAdminSession();
  const { palette } = useTheme();
  const segments = useSegments();
  const child = segments.length > 1 ? (segments as readonly string[])[1] : undefined;
  if (!ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper }}><ActivityIndicator color={palette.primary} /></View>;
  if (status === "SIGNED_OUT" || status === "REVOKED") return child === "login" ? <Stack screenOptions={{ headerShown: false }} /> : <Redirect href="/(admin)/login" />;
  if (status === "PENDING") return <AdminWaitingScreen />;
  if (status === "ACTIVE" && !unlocked) return <AdminLockScreen />;
  if (child === "login" || child === "pending" || child === undefined) return <Redirect href="/(admin)/(tabs)/home" />;
  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}

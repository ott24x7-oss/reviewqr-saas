import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from "@expo-google-fonts/manrope";
import { Mukta_500Medium } from "@expo-google-fonts/mukta";
import { NotoSansDevanagari_400Regular, NotoSansDevanagari_700Bold } from "@expo-google-fonts/noto-sans-devanagari";
import { Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { useEffect } from "react";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { Redirect, router, Stack, usePathname, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AppOpenEvent } from "../src/analytics/open";
import { I18nProvider } from "../src/i18n";
import { OrderStatusSync } from "../src/orders/sync";
import { queryClient, queryPersistOptions } from "../src/query/persist";
import { initSentry, wrapRoot } from "../src/sentry/init";
import { SessionProvider, useSession } from "../src/state/session";
import { AppUpdateCheck } from "../src/updates/check";
import { LaunchFrame } from "../src/ui/launch";
import { ConnectivityBanner } from "../src/ui/offline-banner";
import { ThemeProvider, useTheme } from "../src/ui/theme";
import { resolveAppVariant, redirectForVariant, type AppVariant } from "../src/admin/variant";
import { AdminSessionProvider, useAdminSession } from "../src/admin/session";
import { AdminSecurityProvider } from "../src/admin/security";
import { adminNotificationRoute } from "../src/admin/notifications";

initSentry();

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const APP_VARIANT: AppVariant = resolveAppVariant(process.env.EXPO_PUBLIC_APP_VARIANT ?? Constants.expoConfig?.extra?.appVariant ?? (Constants.expoConfig?.name === "QR24x7 Admin" ? "admin" : undefined));

function VariantRouteStack({ variant }: { variant: AppVariant }) {
  const segments = useSegments();
  const redirect = redirectForVariant(variant, segments);
  if (redirect) return <Redirect href={redirect} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}

function Boot({ fontsReady, variant }: { fontsReady: boolean; variant: AppVariant }) {
  const { ready } = useSession();
  const { ready: themeReady, scheme } = useTheme();
  const path = usePathname();
  const motionLab = path.includes("motion-lab");
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <LaunchFrame fontsReady={fontsReady} sessionReady={ready && themeReady} skip={motionLab}>
        <ConnectivityBanner />
        {fontsReady && themeReady ? <VariantRouteStack variant={variant} /> : null}
      </LaunchFrame>
    </>
  );
}

function AdminNotificationBridge() {
  const { status } = useAdminSession();
  useEffect(() => {
    if (status !== "ACTIVE") return;
    const openNotification = (response: Notifications.NotificationResponse) => {
      const route = adminNotificationRoute(response.notification.request.content.data as Record<string, unknown>);
      if (route) router.push(route as never);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
    Notifications.getLastNotificationResponseAsync().then((response) => { if (response) openNotification(response); }).catch(() => undefined);
    return () => subscription.remove();
  }, [status]);
  return null;
}

function AdminBoot({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useAdminSession();
  const { ready: themeReady, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <LaunchFrame fontsReady={fontsReady} sessionReady={ready && themeReady}>
        <AdminNotificationBridge />
        {fontsReady && themeReady ? <VariantRouteStack variant="admin" /> : null}
      </LaunchFrame>
    </>
  );
}

function OwnerProviders({ loaded }: { loaded: boolean }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={queryPersistOptions}>
      <SessionProvider>
        <ThemeProvider>
          <AppOpenEvent />
          <OrderStatusSync />
          <AppUpdateCheck />
          <Boot fontsReady={loaded} variant={APP_VARIANT} />
        </ThemeProvider>
      </SessionProvider>
    </PersistQueryClientProvider>
  );
}

function AdminProviders({ loaded }: { loaded: boolean }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={queryPersistOptions}>
      <SessionProvider disabled>
        <ThemeProvider>
          <AdminSessionProvider>
            <AdminSecurityProvider>
              <AdminBoot fontsReady={loaded} />
            </AdminSecurityProvider>
          </AdminSessionProvider>
        </ThemeProvider>
      </SessionProvider>
    </PersistQueryClientProvider>
  );
}

function RootLayout() {
  const [loaded] = useFonts({
    Sora_700Bold,
    Sora_800ExtraBold,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_700Bold,
    Mukta_500Medium
  });

  const providers = APP_VARIANT === "admin" ? <AdminProviders loaded={Boolean(loaded)} /> : <OwnerProviders loaded={Boolean(loaded)} />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <I18nProvider>
          {providers}
        </I18nProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default wrapRoot(RootLayout);

import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from "@expo-google-fonts/manrope";
import { Mukta_500Medium } from "@expo-google-fonts/mukta";
import { NotoSansDevanagari_400Regular, NotoSansDevanagari_700Bold } from "@expo-google-fonts/noto-sans-devanagari";
import { Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
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

initSentry();

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Boot({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useSession();
  const { ready: themeReady, scheme } = useTheme();
  const path = usePathname();
  const motionLab = path.includes("motion-lab");
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <LaunchFrame fontsReady={fontsReady} sessionReady={ready && themeReady} skip={motionLab}>
        <ConnectivityBanner />
        {fontsReady && themeReady ? <Stack screenOptions={{ headerShown: false }} /> : null}
      </LaunchFrame>
    </>
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <I18nProvider>
          <PersistQueryClientProvider client={queryClient} persistOptions={queryPersistOptions}>
            <SessionProvider>
              <ThemeProvider>
                <AppOpenEvent />
                <OrderStatusSync />
                <AppUpdateCheck />
                <Boot fontsReady={Boolean(loaded)} />
              </ThemeProvider>
            </SessionProvider>
          </PersistQueryClientProvider>
        </I18nProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default wrapRoot(RootLayout);

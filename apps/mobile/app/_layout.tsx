import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from "@expo-google-fonts/manrope";
import { Mukta_500Medium } from "@expo-google-fonts/mukta";
import { NotoSansDevanagari_400Regular, NotoSansDevanagari_700Bold } from "@expo-google-fonts/noto-sans-devanagari";
import { Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { I18nProvider } from "../src/i18n";
import { SessionProvider, useSession } from "../src/state/session";
import { LaunchOverlay } from "../src/ui/launch";
import { ThemeProvider } from "../src/ui/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function Boot({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useSession();
  return (
    <>
      {fontsReady ? <Stack screenOptions={{ headerShown: false }} /> : null}
      <LaunchOverlay fontsReady={fontsReady} sessionReady={ready} />
    </>
  );
}

const queryClient = new QueryClient();

export default function RootLayout() {
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
      <ThemeProvider>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <Boot fontsReady={Boolean(loaded)} />
            </SessionProvider>
          </QueryClientProvider>
        </I18nProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

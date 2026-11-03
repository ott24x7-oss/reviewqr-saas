import type { TokenPair } from "@reviewqr/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { PrimaryButton } from "../../src/ui/buttons";
import { usePalette } from "../../src/ui/theme";

export default function MagicLoginScreen() {
  const { token: rawToken } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const { saveSession } = useSession();
  const palette = usePalette();
  const started = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!token || started.current === token) return;
    started.current = token;
    let live = true;
    async function verify() {
      setBusy(true);
      setError(null);
      try {
        if (!apiBaseUrl()) throw new Error("The app cannot reach QR24x7 right now.");
        const pair = await apiData<TokenPair>("/api/v1/auth/magic/verify", {
          method: "POST",
          body: JSON.stringify({ token, mode: "mobile", deviceName: "Android" })
        });
        if (!live) return;
        await saveSession(pair);
        if (live) router.replace("/(app)");
      } catch (cause) {
        if (live) {
          setError(
            cause instanceof ApiError
              ? "This login link has expired or was already used. Request a new one from WhatsApp."
              : cause instanceof Error
                ? cause.message
                : "Could not sign in. Request a new link from WhatsApp."
          );
        }
      } finally {
        if (live) setBusy(false);
      }
    }
    void verify();
    return () => {
      live = false;
    };
  }, [token, saveSession]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.paper }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: palette.ink }]}>Log in to QR24x7</Text>
        <Text style={[styles.message, { color: palette.muted }]}>
          {busy ? "Signing you in securely…" : error || "Your login link could not be used."}
        </Text>
        {!busy ? (
          <PrimaryButton label="Back to login" onPress={() => router.replace("/(auth)/login")} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center" },
  content: { padding: 24, gap: 16 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  message: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 }
});

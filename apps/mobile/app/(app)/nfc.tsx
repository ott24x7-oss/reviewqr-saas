import { Screen } from "../../src/ui/screen";
import type { TapPage } from "@reviewqr/shared";
import { useQuery } from "@tanstack/react-query";
import LottieView from "lottie-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Smartphone } from "lucide-react-native";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { readUriPayload, tagIdMatches } from "../../src/nfc/read";
import { nfcPayloadMatches, nfcUrlIsPublicHttps } from "../../src/nfc/url";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { BottomSheet } from "../../src/ui/bits";
import { PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";

async function loadNfc() {
  try {
    return await import("react-native-nfc-manager");
  } catch {
    return null;
  }
}

function NfcScreenContent() {
  const { t, lang } = useI18n();
  const { palette, reduceMotion, lowRam } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { user } = useSession();
  const { business } = useBusiness();
  const tap = useQuery({
    queryKey: accountKey(user?.id ?? "", "tap", business?.id),
    enabled: !!user && !!business,
    queryFn: () => apiData<TapPage>(`/api/v1/businesses/${business!.id}/tap`)
  });
  const [status, setStatus] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const verifiedTagId = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      void import("react-native-nfc-manager")
        .then((nfc) => nfc.default.cancelTechnologyRequest())
        .catch(() => undefined);
    };
  }, []);
  const base = apiBaseUrl();
  const path = tap.data?.publicPath ?? "";
  const url = tap.data?.tapUrl ?? "";
  const safe = nfcUrlIsPublicHttps(url);

  async function session<T>(run: (nfc: NonNullable<Awaited<ReturnType<typeof loadNfc>>>) => Promise<T>) {
    const nfc = await loadNfc();
    if (!nfc) {
      setStatus(t.noNfc);
      return;
    }
    const supported = await nfc.default.isSupported().catch(() => false);
    if (!supported) {
      setStatus(t.noNfc);
      return;
    }
    try {
      await nfc.default.start();
      await nfc.default.requestTechnology(nfc.NfcTech.Ndef, { alertMessage: t.nfcHold });
      await run(nfc);
    } catch {
      setStatus(t.nfcRetry);
    } finally {
      await nfc.default.cancelTechnologyRequest().catch(() => undefined);
    }
  }

  async function write() {
    if (!safe || !path) return;
    setBusy(true);
    verifiedTagId.current = null;
    setVerified(false);
    setStatus(t.nfcHold);
    try {
      await session(async (nfc) => {
        const bytes = nfc.Ndef.encodeMessage([nfc.Ndef.uriRecord(url)]);
        await nfc.default.ndefHandler.writeNdefMessage(bytes);
        const fresh = await nfc.default.ndefHandler.getNdefMessage();
        const read = readUriPayload(
          (payload) => nfc.Ndef.uri.decodePayload(payload),
          fresh?.ndefMessage?.[0]?.payload
        );
        if (fresh?.id && nfcPayloadMatches(read, path)) {
          verifiedTagId.current = fresh.id;
          setVerified(true);
          setStatus(t.nfcVerified);
        } else {
          verifiedTagId.current = null;
          setVerified(false);
          setStatus(t.nfcMismatch);
        }
      });
    } finally {
      setBusy(false);
    }
  }

  function askLock() {
    Alert.alert(t.lockTag, t.lockConfirm, [
      { text: t.cancel, style: "cancel" },
      { text: t.lockTag, style: "destructive", onPress: () => { void lock(); } }
    ]);
  }

  async function lock() {
    if (!safe) return;
    setBusy(true);
    setStatus(t.nfcHold);
    try {
      await session(async (nfc) => {
        const fresh = await nfc.default.ndefHandler.getNdefMessage();
        if (!tagIdMatches(verifiedTagId.current, fresh?.id)) {
          setStatus(t.nfcMismatch);
          return;
        }
        await nfc.default.ndefHandler.makeReadOnly();
        verifiedTagId.current = null;
        setVerified(false);
        setStatus(t.nfcLocked);
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.nfc}</Text>
      <View style={styles.hold}>
        {!reduceMotion && !lowRam ? (
          <LottieView source={require("../../assets/lottie/nfc.json")} autoPlay loop style={styles.lottie} />
        ) : (
          <HoldMark still={reduceMotion || lowRam} color={palette.deep} background={palette.accentSoft} />
        )}
        <Text style={[styles.holdTitle, lang === "hi" && styles.hindi]}>{t.holdTag}</Text>
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>{safe ? url : path ? t.nfcUnsafeUrl : t.noQr}</Text>
      </View>
      {!base ? <Text style={styles.note}>{t.missingApi}</Text> : null}
      {business && !tap.isLoading && !path ? <Text style={styles.note}>{t.noQr}</Text> : null}
      {path && !safe ? <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.nfcUnsafeUrl}</Text> : null}
      {safe ? <Text style={styles.url}>{url}</Text> : null}
      {status ? <Text style={[styles.note, lang === "hi" && styles.hindi]}>{status}</Text> : null}
      {verified ? <Text style={styles.title}>{t.nfcSuccess}</Text> : null}
      {!busy && !verified && (status === t.nfcMismatch || status === t.nfcRetry) ? <Text style={styles.note}>{t.nfcFail}</Text> : null}
      <PillButton
        label={t.nfc}
        onPress={() => { void write(); }}
        disabled={busy || !safe}
        hint={!safe ? (path ? t.nfcUnsafeUrl : t.noQr) : t.hintWait}
        tone="dark"
      />
      {verified ? <PillButton label={t.lockTag} onPress={askLock} disabled={busy} tone="outline" /> : null}
      <BottomSheet visible={busy} title={t.holdTag} onClose={() => { void import("react-native-nfc-manager").then((nfc) => nfc.default.cancelTechnologyRequest()).catch(() => undefined); }}>
        <View style={styles.lottie}>
          {!reduceMotion && !lowRam ? (
            <LottieView source={require("../../assets/lottie/nfc.json")} autoPlay loop style={styles.lottie} />
          ) : (
            <Text style={styles.note}>{t.holdTag}</Text>
          )}
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

function HoldMark({ still, color, background }: { still: boolean; color: string; background: string }) {
  const scale = useSharedValue(still ? 1 : 0.92);
  useEffect(() => {
    if (still) return;
    scale.value = withRepeat(withSequence(withTiming(1.06, { duration: 900 }), withTiming(0.92, { duration: 900 })), -1, false);
  }, [scale, still]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[stylesHold.ring, { backgroundColor: background }, anim]}>
      <Smartphone color={color} size={36} strokeWidth={1.75} />
    </Animated.View>
  );
}

const stylesHold = StyleSheet.create({
  ring: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center"
  }
});

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 16 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  note: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16 },
  url: { color: colors.ink, fontFamily: fonts.bodyStrong, fontSize: 14 },
  hindi: { fontFamily: fonts.hindi },
  lottie: { width: 180, height: 180, alignSelf: "center" },
  hold: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 8
  },
  holdTitle: { fontFamily: fonts.title, fontSize: 18, color: colors.ink, textAlign: "center" }
});
}

export default function NfcScreen() {
  return (
    <Screen topInset={true}><NfcScreenContent /></Screen>
  );
}

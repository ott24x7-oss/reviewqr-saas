import type { TapPage } from "@reviewqr/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { readUriPayload, tagIdMatches } from "../../src/nfc/read";
import { nfcPayloadMatches, nfcUrlIsPublicHttps } from "../../src/nfc/url";
import { useBusiness } from "../../src/state/business";
import { colors, fonts } from "../../src/theme";
import { PillButton } from "../../src/ui/controls";

async function loadNfc() {
  try {
    return await import("react-native-nfc-manager");
  } catch {
    return null;
  }
}

export default function NfcScreen() {
  const { t, lang } = useI18n();
  const { business } = useBusiness();
  const tap = useQuery({
    queryKey: ["tap", business?.id],
    enabled: !!business,
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
      {!base ? <Text style={styles.note}>{t.missingApi}</Text> : null}
      {business && !tap.isLoading && !path ? <Text style={styles.note}>{t.noQr}</Text> : null}
      {path && !safe ? <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.nfcUnsafeUrl}</Text> : null}
      {safe ? <Text style={styles.url}>{url}</Text> : null}
      {status ? <Text style={[styles.note, lang === "hi" && styles.hindi]}>{status}</Text> : null}
      <PillButton label={t.nfc} onPress={() => { void write(); }} disabled={busy || !safe} tone="dark" />
      {verified ? <PillButton label={t.lockTag} onPress={askLock} disabled={busy} tone="outline" /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 16 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  note: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16 },
  url: { color: colors.ink, fontFamily: fonts.bodyStrong, fontSize: 14 },
  hindi: { fontFamily: fonts.hindi }
});

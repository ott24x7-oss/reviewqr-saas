import type { TapPage } from "@reviewqr/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { readUriPayload } from "../../src/nfc/read";
import { nfcPayloadMatches, nfcTapUrl } from "../../src/nfc/url";
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
  const base = apiBaseUrl();
  const path = tap.data?.publicPath ?? "";
  const url = path && base ? nfcTapUrl(base, path) : "";

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
    await nfc.default.start();
    try {
      await nfc.default.requestTechnology(nfc.NfcTech.Ndef, { alertMessage: t.nfcHold });
      await run(nfc);
    } catch {
      setStatus(t.nfcRetry);
    } finally {
      await nfc.default.cancelTechnologyRequest().catch(() => undefined);
    }
  }

  async function write() {
    if (!url || !path) return;
    setBusy(true);
    setVerified(false);
    setStatus(t.nfcHold);
    try {
      await session(async (nfc) => {
        const bytes = nfc.Ndef.encodeMessage([nfc.Ndef.uriRecord(url)]);
        await nfc.default.ndefHandler.writeNdefMessage(bytes);
        const tag = await nfc.default.getTag();
        const read = readUriPayload((bytes) => nfc.Ndef.uri.decodePayload(bytes), tag?.ndefMessage?.[0]?.payload);
        if (nfcPayloadMatches(read, path)) {
          setVerified(true);
          setStatus(t.nfcVerified);
        } else {
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
    setBusy(true);
    setStatus(t.nfcHold);
    try {
      await session(async (nfc) => {
        await nfc.default.ndefHandler.makeReadOnly();
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
      {url ? <Text style={styles.url}>{url}</Text> : null}
      {status ? <Text style={[styles.note, lang === "hi" && styles.hindi]}>{status}</Text> : null}
      <PillButton label={t.nfc} onPress={() => { void write(); }} disabled={busy || !url} tone="dark" />
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

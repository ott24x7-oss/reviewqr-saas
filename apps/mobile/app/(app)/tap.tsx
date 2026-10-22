import type { TapLink, TapPage } from "@reviewqr/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";
import { Field, PillButton } from "../../src/ui/controls";

const ADDABLE = ["menu", "whatsapp_chat", "call", "google", "website", "feedback"] as const;

export default function TapScreen() {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const tap = useQuery({
    queryKey: accountKey(user?.id ?? "", "tap", business?.id),
    enabled: !!user && !!business,
    queryFn: () => apiData<TapPage>(`/api/v1/businesses/${business!.id}/tap`)
  });
  const [links, setLinks] = useState<TapLink[] | null>(null);
  const [themeId, setThemeId] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [directOn, setDirectOn] = useState<boolean | null>(null);
  const [directKey, setDirectKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const data = tap.data;
  const shown = links ?? data?.links ?? [];
  const directMode = (directOn ?? data?.directMode === "DIRECT") ? "DIRECT" : "TAP_PAGE";
  const directTarget = directKey ?? data?.directTarget ?? "";
  const directOptions = shown.filter((link) => link.enabled && (link.type === "menu" || link.type === "whatsapp_order" || link.type === "vcard" || link.url.startsWith("https://")));
  const chosen = directOptions.find((link) => link.key === directTarget) || null;
  const theme = themeId ?? data?.themeId ?? "";
  const bioText = bio ?? data?.bio ?? "";
  const base = apiBaseUrl();
  const preview = data?.publicPath && base ? `${base}${data.publicPath}` : "";

  function edit(index: number, patch: Partial<TapLink>) {
    setLinks(shown.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  async function publish() {
    if (!business) return;
    setBusy(true);
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${business.id}/tap`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "publish",
          bio: bioText,
          themeId: theme || undefined,
          links: shown,
          directMode,
          directTarget: directMode === "DIRECT" ? directTarget : ""
        })
      });
      setLinks(null);
      setThemeId(null);
      setBio(null);
      setDirectOn(null);
      setDirectKey(null);
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "tap", business.id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!data?.code || !base) return;
    setError(null);
    try {
      const FileSystem = await import("expo-file-system/legacy");
      const Sharing = await import("expo-sharing");
      const dest = `${FileSystem.cacheDirectory}qr-${data.code}.png`;
      const file = await FileSystem.downloadAsync(`${base}/api/qr/${data.code}/image?format=png`, dest);
      await Sharing.shareAsync(file.uri, { mimeType: "image/png", UTI: "public.png" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share the QR");
    }
  }

  if (!business) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.section, lang === "hi" && styles.hindi]}>{t.directTitle}</Text>
      <PillButton
        label={t.directToggle}
        tone={directMode === "DIRECT" ? "dark" : "outline"}
        onPress={() => {
          const next = directMode !== "DIRECT";
          setDirectOn(next);
          if (next && !directOptions.some((link) => link.key === directTarget) && directOptions[0]) {
            setDirectKey(directOptions[0].key);
          }
        }}
      />
      {directOptions.map((link) => (
        <Pressable key={link.key} onPress={() => { setDirectOn(true); setDirectKey(link.key); }} style={[styles.chip, link.key === directTarget && directMode === "DIRECT" && styles.chipOn]}>
          <Text style={[styles.chipText, link.key === directTarget && directMode === "DIRECT" && styles.chipTextOn, lang === "hi" && styles.hindi]}>
            {lang === "hi" && link.labelHi ? link.labelHi : link.labelEn}
          </Text>
        </Pressable>
      ))}
      {directMode === "DIRECT" && chosen ? (
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.directOpens} {lang === "hi" && chosen.labelHi ? chosen.labelHi : chosen.labelEn}</Text>
      ) : null}
      {directMode === "TAP_PAGE" && shown.filter((link) => link.enabled).length === 1 && directOptions.length === 1 ? (
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.directHint}</Text>
      ) : null}
      <Field label={t.about} tone="paper" value={bioText} onChangeText={setBio} />
      <Text style={[styles.section, lang === "hi" && styles.hindi]}>{t.theme}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {(data?.themes ?? []).map((item) => (
          <Pressable key={item.id} onPress={() => setThemeId(item.id)} style={[styles.chip, item.id === theme && styles.chipOn]}>
            <Text style={[styles.chipText, item.id === theme && styles.chipTextOn]}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {shown.map((link, index) => (
        <View key={`${link.key}-${index}`} style={styles.card}>
          <Field label={link.type} tone="paper" value={link.labelEn} onChangeText={(labelEn) => edit(index, { labelEn })} />
          <Field label="URL" tone="paper" value={link.url} onChangeText={(url) => edit(index, { url })} autoCapitalize="none" />
          <PillButton
            label={link.enabled ? t.available : t.inStock}
            tone={link.enabled ? "dark" : "outline"}
            onPress={() => edit(index, { enabled: !link.enabled })}
          />
        </View>
      ))}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {ADDABLE.map((type) => (
          <Pressable
            key={type}
            style={styles.chip}
            onPress={() => setLinks([...shown, { key: type, type, labelEn: type, labelHi: "", enabled: true, url: "" }])}
          >
            <Text style={styles.chipText}>{type}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PillButton label={t.publish} onPress={publish} disabled={busy} tone="dark" />
      {data?.code ? (
        <>
          <PillButton label={t.shareQr} onPress={share} tone="outline" />
          <PillButton label={t.openBrowser} onPress={() => WebBrowser.openBrowserAsync(preview)} disabled={!preview} tone="outline" />
          {preview ? <WebView source={{ uri: preview }} style={styles.preview} /> : null}
        </>
      ) : (
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.noQr}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12 },
  section: { fontFamily: fonts.bodyStrong, color: colors.ink, fontSize: 16 },
  row: { gap: 8 },
  chip: { minHeight: 44, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.bodyStrong, color: colors.ink },
  chipTextOn: { color: colors.white },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 12, gap: 8 },
  preview: { height: 480, borderRadius: 20, backgroundColor: colors.card },
  note: { fontFamily: fonts.body, color: colors.inkSoft },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

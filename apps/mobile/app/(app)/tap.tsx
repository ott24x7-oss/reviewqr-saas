import type { TapLink, TapPage } from "@reviewqr/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { CoachTour } from "../../src/guide/coach";
import { HelpButton } from "../../src/guide/help-sheet";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { useTheme } from "../../src/ui/theme";
import { BLURHASH } from "../../src/ui/tokens";
import type { Palette } from "../../src/ui/tokens";
import { Field, PillButton } from "../../src/ui/controls";

const ADDABLE = ["menu", "whatsapp_chat", "call", "google", "website", "feedback"] as const;

export default function TapScreen() {
  const { palette, reduceMotion, lowRam } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const glow = useSharedValue(0.35);
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  const brightLevel = useRef<number | null>(null);
  const [bright, setBright] = useState(false);
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

  const qrUri = data?.code && base ? `${base}/api/qr/${data.code}/image?format=png` : "";

  useEffect(() => {
    if (reduceMotion || lowRam || !data?.code) {
      glow.value = 0.45;
      return;
    }
    glow.value = withRepeat(
      withSequence(withTiming(0.9, { duration: 1200 }), withTiming(0.35, { duration: 1200 })),
      3,
      false
    );
  }, [data?.code, glow, lowRam, reduceMotion]);
  useEffect(() => {
    if (!qrUri) return;
    reveal.value = reduceMotion ? 1 : 0;
    if (!reduceMotion) reveal.value = withTiming(1, { duration: 280 });
  }, [qrUri, reduceMotion, reveal]);
  useEffect(() => {
    return () => {
      const level = brightLevel.current;
      if (level == null || Platform.OS === "web") return;
      import("expo-brightness")
        .then((Brightness) => Brightness.setBrightnessAsync(level))
        .catch(() => undefined);
    };
  }, []);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const qrStyle = useAnimatedStyle(() => ({ opacity: 0.15 + reveal.value * 0.85, transform: [{ scale: 0.92 + reveal.value * 0.08 }] }));

  async function showToCustomer() {
    if (Platform.OS === "web") {
      setBright((value) => !value);
      return;
    }
    const Brightness = await import("expo-brightness").catch(() => null);
    if (!Brightness) {
      setBright((value) => !value);
      return;
    }
    if (bright) {
      if (brightLevel.current != null) await Brightness.setBrightnessAsync(brightLevel.current).catch(() => undefined);
      setBright(false);
      return;
    }
    brightLevel.current = await Brightness.getBrightnessAsync().catch(() => null);
    await Brightness.setBrightnessAsync(1).catch(() => undefined);
    setBright(true);
  }

  if (!business) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={[styles.section, lang === "hi" && styles.hindi]}>{t.shareQr}</Text>
        <HelpButton title={t.coachQrShow} body={t.coachQrShowBody} />
      </View>
      {qrUri ? (
        <View style={[styles.frame, bright && { borderColor: palette.primary, borderWidth: 2 }]}>
          {!lowRam ? <Animated.View style={[styles.glow, { backgroundColor: palette.primary }, glowStyle]} /> : null}
          <Animated.View style={qrStyle}>
            <Image source={{ uri: qrUri }} placeholder={{ blurhash: BLURHASH }} style={styles.qr} contentFit="contain" accessibilityLabel={t.shareQr} />
            <QrModules reduceMotion={reduceMotion || lowRam} color={palette.card} />
          </Animated.View>
        </View>
      ) : (
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.noQr}</Text>
      )}
      {qrUri ? (
        <PillButton label={bright ? t.showToCustomerOn : t.showToCustomer} onPress={() => { showToCustomer().catch(() => undefined); }} tone="dark" />
      ) : null}
      <View style={styles.row}>
        <PillButton label={t.shareQr} onPress={share} tone="outline" />
        <PillButton label={t.downloadQr} onPress={share} tone="outline" />
        <PillButton label={t.printStand} onPress={() => qrUri && WebBrowser.openBrowserAsync(qrUri)} disabled={!qrUri} tone="outline" />
      </View>
      <PillButton label={t.nfc} onPress={() => router.push("/(app)/nfc")} tone="dark" />
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
        <Pressable key={link.key} accessibilityRole="button" accessibilityState={{ selected: link.key === directTarget && directMode === "DIRECT" }} accessibilityLabel={lang === "hi" && link.labelHi ? link.labelHi : link.labelEn} onPress={() => { setDirectOn(true); setDirectKey(link.key); }} style={[styles.chip, link.key === directTarget && directMode === "DIRECT" && styles.chipOn]}>
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
          <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{ selected: item.id === theme }} onPress={() => setThemeId(item.id)} style={[styles.chip, item.id === theme && styles.chipOn]}>
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
            accessibilityRole="button"
            accessibilityLabel={type}
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
      <CoachTour
        screen="qr"
        steps={[
          { title: t.coachQrShow, body: t.coachQrShowBody, top: 140 },
          { title: t.coachQrNfc, body: t.coachQrNfcBody, top: 360 }
        ]}
      />
    </ScrollView>
  );
}

function QrModules({ reduceMotion, color }: { reduceMotion: boolean; color: string }) {
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: 36 }, (_, index) => (
        <QrModule key={index} index={index} color={color} />
      ))}
    </View>
  );
}

function QrModule({ index, color }: { index: number; color: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withDelay(index * 16, withTiming(0, { duration: 80 }));
  }, [index, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const col = index % 6;
  const row = Math.floor(index / 6);
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: "16.7%",
          height: "16.7%",
          left: `${col * 16.7}%`,
          top: `${row * 16.7}%`,
          backgroundColor: color
        },
        fade
      ]}
    />
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12 },
  section: { fontFamily: fonts.bodyStrong, color: colors.ink, fontSize: 16 },
  row: { gap: 8 },
  chip: { minHeight: 48, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.deep },
  chipText: { fontFamily: fonts.bodyStrong, color: colors.ink },
  chipTextOn: { color: colors.onPrimary },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 12, gap: 8 },
  preview: { height: 480, borderRadius: 20, backgroundColor: colors.card },
  note: { fontFamily: fonts.body, color: colors.inkSoft },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  frame: { alignItems: "center", justifyContent: "center", minHeight: 240 },
  glow: { position: "absolute", width: 220, height: 220, borderRadius: 28 },
  qr: { width: 200, height: 200, borderRadius: 16, backgroundColor: "#FFFFFF" }
});
}

import { Screen } from "../../src/ui/screen";
import type { TapLink, TapPage } from "@reviewqr/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Link2, Plus } from "lucide-react-native";
import { useEffect, useRef, useState, useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { apiBaseUrl } from "../../src/api/instance";
import { trackOnce } from "../../src/analytics/events";
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
import { Group, GroupRow, SectionHeader } from "../../src/ui/rows";

const ADDABLE = ["menu", "whatsapp_chat", "call", "google", "website", "feedback", "custom"] as const;

function TapScreenContent() {
  const { palette, reduceMotion, lowRam } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const glow = useSharedValue(0.35);
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  const brightLevel = useRef<number | null>(null);
  const [bright, setBright] = useState(false);
  const params = useLocalSearchParams<{ section?: string }>();
  const section = typeof params.section === "string" ? params.section : "";
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
  const [bg, setBg] = useState("#1C1813");
  const [ink, setInk] = useState("#F4EFE6");
  const [busy, setBusy] = useState(false);
  const data = tap.data;
  const shown = links ?? data?.links ?? [];
  const directMode = (directOn ?? data?.directMode === "DIRECT") ? "DIRECT" : "TAP_PAGE";
  const directTarget = directKey ?? data?.directTarget ?? "";
  const directOptions = shown.filter((link) => link.enabled && (link.type === "menu" || link.type === "whatsapp_order" || link.type === "vcard" || link.url.startsWith("https://")));
  const chosen = directOptions.find((link) => link.key === directTarget) || null;
  const theme = themeId ?? data?.themeId ?? "";
  const chosenTheme = (data?.themes ?? []).find((item) => item.id === theme);
  const previewBg = chosenTheme?.bg || "#F4EFE6";
  const previewInk = chosenTheme?.ink || "#1C1813";
  const previewButton = chosenTheme?.buttonBg || "#1C1813";
  const previewButtonInk = chosenTheme?.buttonInk || "#F4EFE6";
  const bioText = bio ?? data?.bio ?? "";
  const base = apiBaseUrl();
  const preview = data?.publicPath && base ? `${base}${data.publicPath}` : "";

  function move(index: number, step: number) {
    const nextIndex = index + step;
    if (nextIndex < 0 || nextIndex >= shown.length) return;
    const next = [...shown];
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row);
    setLinks(next);
  }

  async function saveColour() {
    if (!business) return;
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${business.id}/theme`, {
        method: "POST",
        body: JSON.stringify({ action: "save", themeId: theme || "minimal", bg, ink, buttonBg: bg, buttonInk: ink, backgroundType: "solid" })
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the colour");
    }
  }

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
    if (qrUri) void trackOnce("first_qr_shown");
  }, [qrUri]);

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

  const themeBlock = (
      <View style={styles.stack}>
        <SectionHeader label={t.pageTheme} />
        <View style={[styles.phone, { backgroundColor: previewBg }]}>
          <Text style={[styles.phoneKicker, { color: previewInk }, lang === "hi" && styles.hindi]}>{t.livePreview}</Text>
          <Text style={[styles.phoneName, { color: previewInk }, lang === "hi" && styles.hindi]} numberOfLines={1}>
            {business.name}
          </Text>
          <View style={[styles.phoneButton, { backgroundColor: previewButton }]}>
            <Text style={[{ color: previewButtonInk, fontFamily: fonts.bodyStrong }, lang === "hi" && styles.hindi]}>{t.preview}</Text>
          </View>
        </View>
        <View style={styles.gallery}>
          {(data?.themes ?? []).map((item) => {
            const selected = item.id === theme;
            return (
              <View key={item.id} style={styles.swatchCell}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected }}
                  onPress={() => setThemeId(item.id)}
                  style={[styles.swatch, { backgroundColor: item.bg, borderColor: selected ? palette.deep : "transparent" }]}
                >
                  <Text style={{ color: item.ink, fontFamily: fonts.bodyStrong }} numberOfLines={2}>{item.name}</Text>
                  <View style={[styles.swatchButton, { backgroundColor: item.buttonBg }]} />
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
  );
  const buttonBlock = (
      <View style={styles.stack}>
      <SectionHeader label={t.pageButtons} />
      {shown.map((link, index) => (
        <View key={`${link.key}-${index}`} style={styles.card}>
          <GroupRow
            icon={Link2}
            tint={link.enabled ? "green" : "ink"}
            title={link.labelEn || link.type}
            hint={link.enabled ? t.available : t.inStock}
            onPress={() => edit(index, { enabled: !link.enabled })}
          />
          <Field label={link.type} tone="paper" value={link.labelEn} onChangeText={(labelEn) => edit(index, { labelEn })} />
          <Field label="URL" tone="paper" value={link.url} onChangeText={(url) => edit(index, { url })} autoCapitalize="none" />
          <View style={styles.row}>
            <PillButton label={t.moveUp} tone="outline" onPress={() => move(index, -1)} />
            <PillButton label={t.moveDown} tone="outline" onPress={() => move(index, 1)} />
          </View>
        </View>
      ))}
      <SectionHeader label={t.sectionAddButton} />
      <Group>
        {ADDABLE.map((type) => (
          <GroupRow
            key={type}
            icon={Plus}
            tint="amber"
            title={type}
            hint={t.sectionAddButton}
            onPress={() => setLinks([...shown, { key: type, type, labelEn: type, labelHi: "", enabled: true, url: "" }])}
          />
        ))}
      </Group>
      </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {section === "theme" ? themeBlock : null}
      {section === "buttons" ? buttonBlock : null}
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
      <SectionHeader label={t.directTitle} />
      <Group>
        <GroupRow
          icon={Link2}
          tint={directMode === "DIRECT" ? "green" : "ink"}
          title={t.directToggle}
          hint={
            directMode === "DIRECT" && chosen
              ? `${t.directOpens} ${lang === "hi" && chosen.labelHi ? chosen.labelHi : chosen.labelEn}`
              : t.directHint
          }
          selected={directMode === "DIRECT"}
          onPress={() => {
            const next = directMode !== "DIRECT";
            setDirectOn(next);
            if (next && !directOptions.some((link) => link.key === directTarget) && directOptions[0]) {
              setDirectKey(directOptions[0].key);
            }
          }}
        />
        {directOptions.map((link) => (
          <GroupRow
            key={link.key}
            icon={Link2}
            tint="blue"
            title={lang === "hi" && link.labelHi ? link.labelHi : link.labelEn}
            hint={link.type}
            selected={link.key === directTarget && directMode === "DIRECT"}
            onPress={() => { setDirectOn(true); setDirectKey(link.key); }}
          />
        ))}
      </Group>
      {directMode === "DIRECT" && chosen ? (
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.directOpens} {lang === "hi" && chosen.labelHi ? chosen.labelHi : chosen.labelEn}</Text>
      ) : null}
      {directMode === "TAP_PAGE" && shown.filter((link) => link.enabled).length === 1 && directOptions.length === 1 ? (
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.directHint}</Text>
      ) : null}
      <Field label={t.about} tone="paper" value={bioText} onChangeText={setBio} />
      {section === "theme" ? null : themeBlock}
      {section === "buttons" ? null : buttonBlock}
      <SectionHeader label={t.customColour} />
      <Field label={t.customColour} tone="paper" value={bg} onChangeText={setBg} autoCapitalize="none" />
      <Field label={t.customLink} tone="paper" value={ink} onChangeText={setInk} autoCapitalize="none" />
      <PillButton label={t.save} tone="outline" onPress={saveColour} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PillButton label={t.publish} onPress={publish} disabled={busy} hint={t.hintWait} tone="dark" />
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
  stack: { gap: 12 },
  section: { fontFamily: fonts.bodyStrong, color: colors.ink, fontSize: 16 },
  row: { gap: 8 },
  chip: { minHeight: 48, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.deep },
  chipText: { fontFamily: fonts.bodyStrong, color: colors.ink },
  chipTextOn: { color: colors.onPrimary },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 12, gap: 8 },
  preview: { height: 480, borderRadius: 20, backgroundColor: colors.card },
  phone: { borderRadius: 28, padding: 18, gap: 12, minHeight: 168 },
  phoneKicker: { fontFamily: fonts.bodyStrong, fontSize: 12, opacity: 0.8 },
  phoneName: { fontFamily: fonts.display, fontSize: 22 },
  phoneButton: { minHeight: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  gallery: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  swatchCell: { width: "50%", padding: 4 },
  swatch: { borderRadius: 18, borderWidth: 2, padding: 12, gap: 10, minHeight: 92 },
  swatchButton: { height: 28, borderRadius: 999 },
  note: { fontFamily: fonts.body, color: colors.inkSoft },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  frame: { alignItems: "center", justifyContent: "center", minHeight: 240 },
  glow: { position: "absolute", width: 220, height: 220, borderRadius: 28 },
  qr: { width: 200, height: 200, borderRadius: 16, backgroundColor: "#FFFFFF" }
});
}

export default function TapScreen() {
  return (
    <Screen topInset={true}><TapScreenContent /></Screen>
  );
}

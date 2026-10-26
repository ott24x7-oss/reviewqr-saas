import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Screen } from "../../src/ui/screen";
import type { TapLink, TapPage } from "@reviewqr/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Globe2, GripVertical, Link2, MessageCircle, Pencil, Phone, Plus, Star, UtensilsCrossed } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useEffect, useRef, useState, useMemo } from "react";
import { PanResponder, Platform, Pressable, Share, StyleSheet, Switch, Text, View } from "react-native";
import type { ElementRef, RefObject } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { apiBaseUrl } from "../../src/api/instance";
import { trackOnce } from "../../src/analytics/events";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { CoachTour } from "../../src/guide/coach";
import { shouldShowQrPageTour } from "../../src/guide/store";
import { SetupWalkthrough } from "../../src/guide/setup-tour";
import { HelpButton } from "../../src/guide/help-sheet";
import { useI18n } from "../../src/i18n";
import { copy } from "../../src/i18n/copy";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { openPlanLock, useFeatures } from "../../src/state/plan-lock";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { useTheme } from "../../src/ui/theme";
import { BLURHASH } from "../../src/ui/tokens";
import type { Palette } from "../../src/ui/tokens";
import { BottomSheet, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { Field, PillButton } from "../../src/ui/controls";
import { Group, GroupRow, SectionHeader } from "../../src/ui/rows";

const ADDABLE = ["menu", "whatsapp_chat", "call", "google", "website", "feedback", "custom"] as const;
const SETUP_TAP_STEPS = ["link", "buttons", "print"] as const;

function buttonLabel(type: string, lang: "en" | "hi") {
  const text = copy[lang];
  const labels: Record<string, string> = {
    menu: text.buttonMenu,
    whatsapp_chat: text.buttonWhatsAppChat,
    whatsapp_order: text.buttonWhatsAppOrder,
    call: text.buttonCall,
    google: text.buttonGoogleReview,
    website: text.buttonWebsite,
    feedback: text.buttonFeedback,
    custom: text.buttonCustomLink,
    vcard: text.buttonContact
  };
  return labels[type] ?? text.buttonCustomLink;
}

function buttonIcon(type: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    menu: UtensilsCrossed,
    whatsapp_chat: MessageCircle,
    whatsapp_order: MessageCircle,
    call: Phone,
    google: Star,
    website: Globe2,
    feedback: Star,
    custom: Link2,
    vcard: Phone
  };
  return icons[type] ?? Link2;
}

function TapScreenContent() {
  const { palette, reduceMotion, lowRam } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const glow = useSharedValue(0.35);
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  const brightLevel = useRef<number | null>(null);
  const [bright, setBright] = useState(false);
  const params = useLocalSearchParams<{ section?: string; setupGuide?: string }>();
  const section = typeof params.section === "string" ? params.section : "";
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { business } = useBusiness();
  const { locked } = useFeatures();
  const pageThemesLocked = locked("page-themes");
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
  const [bg, setBg] = useState(palette.primaryDeep);
  const [ink, setInk] = useState(palette.headerInk);
  const [busy, setBusy] = useState(false);
  const [editingLink, setEditingLink] = useState<number | null>(null);
  const linkTarget = useRef<ElementRef<typeof View>>(null);
  const linkShareTarget = useRef<ElementRef<typeof View>>(null);
  const buttonRowTarget = useRef<ElementRef<typeof View>>(null);
  const qrTarget = useRef<ElementRef<typeof View>>(null);
  const qrShareTarget = useRef<ElementRef<typeof View>>(null);
  const data = tap.data;
  const shown = links ?? data?.links ?? [];
  const directMode = (directOn ?? data?.directMode === "DIRECT") ? "DIRECT" : "TAP_PAGE";
  const directTarget = directKey ?? data?.directTarget ?? "";
  const directOptions = shown.filter((link) => link.enabled && (link.type === "menu" || link.type === "whatsapp_order" || link.type === "vcard" || link.url.startsWith("https://")));
  const chosen = directOptions.find((link) => link.key === directTarget) || null;
  const theme = themeId ?? data?.themeId ?? "";
  const chosenTheme = (data?.themes ?? []).find((item) => item.id === theme);
  const previewBg = chosenTheme?.bg || palette.paper;
  const previewInk = chosenTheme?.ink || palette.ink;
  const previewButton = chosenTheme?.buttonBg || palette.primaryDeep;
  const previewButtonInk = chosenTheme?.buttonInk || palette.headerInk;
  const bioText = bio ?? data?.bio ?? "";
  const base = apiBaseUrl();
  const preview = data?.publicPath && base ? `${base}${data.publicPath}` : "";
  const showSetupTour = SETUP_TAP_STEPS.some((key) => params.setupGuide === key);
  const showQrPageTour = shouldShowQrPageTour(section, showSetupTour);

  async function saveColour() {
    if (!business) return;
    if (locked("page-themes")) {
      openPlanLock("page-themes");
      return;
    }
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
          ...(themeId ? { themeId } : {}),
          links: shown,
          ...(directOn !== null
            ? { directMode, directTarget: directMode === "DIRECT" ? directTarget : "" }
            : {})
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

  async function sharePageLink() {
    if (!preview) return;
    try {
      await Share.share({ message: preview });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not share the page link");
    }
  }

  function reorderButton(from: number, to: number) {
    if (to === from || to < 0 || to >= shown.length) return;
    const next = [...shown];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    setLinks(next);
  }

  const qrUri = data?.code && base ? `${base}/api/qr/${data.code}/image?format=png` : "";
  useEffect(() => {
    if (qrUri) void trackOnce("first_qr_shown");
  }, [qrUri]);

  useEffect(() => {
    if (section === "theme" && pageThemesLocked) openPlanLock("page-themes");
  }, [section, pageThemesLocked]);

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
                  onPress={() => {
                    if (locked("page-themes")) {
                      openPlanLock("page-themes");
                      return;
                    }
                    setThemeId(item.id);
                  }}
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
  const visibleButtonLabel = (link: TapLink) => {
    if (lang === "hi" && link.labelHi) return link.labelHi;
    if (link.labelEn && link.labelEn !== link.type) return link.labelEn;
    return buttonLabel(link.type, lang);
  };
  const buttonBlock = (
      <View style={styles.stack}>
      <SectionHeader label={t.pageButtons} />
      <View style={[styles.phone, { backgroundColor: previewBg }]}>
        <Text style={[styles.phoneKicker, { color: previewInk }, lang === "hi" && styles.hindi]}>{t.livePreview}</Text>
        <Text style={[styles.phoneName, { color: previewInk }, lang === "hi" && styles.hindi]} numberOfLines={1}>{business.name}</Text>
        {shown.filter((link) => link.enabled).map((link, index) => (
          <View key={`${link.key}-preview-${index}`} style={[styles.previewButton, { backgroundColor: previewButton }]}>
            <Text style={[styles.previewButtonText, { color: previewButtonInk }, lang === "hi" && styles.hindi]}>{visibleButtonLabel(link)}</Text>
          </View>
        ))}
      </View>
      {shown.map((link, index) => (
        <PageButtonRow
          key={`${link.key}-${index}`}
          icon={buttonIcon(link.type)}
          label={visibleButtonLabel(link)}
          enabled={link.enabled}
          index={index}
          count={shown.length}
          palette={palette}
          dragLabel={t.dragButton}
          editLabel={t.editButton}
          onToggle={(enabled) => edit(index, { enabled })}
          onEdit={() => setEditingLink(index)}
          onReorder={reorderButton}
          targetRef={index === 0 ? buttonRowTarget : undefined}
        />
      ))}
      <SectionHeader label={t.sectionAddButton} />
      <Group>
        {ADDABLE.map((type) => (
          <GroupRow
            key={type}
            icon={Plus}
            tint="amber"
            title={buttonLabel(type, lang)}
            hint={t.sectionAddButton}
            onPress={() => setLinks([...shown, { key: type, type, labelEn: buttonLabel(type, "en"), labelHi: buttonLabel(type, "hi"), enabled: true, url: "" }])}
          />
        ))}
      </Group>
      </View>
  );
  const linkBlock = (
    <View style={styles.stack}>
      <SectionHeader label={t.pageLink} />
      <View ref={linkTarget} collapsable={false} style={[styles.linkCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
        <Link2 color={palette.deep} size={22} />
        <Text style={[styles.linkText, { color: palette.ink }]} selectable>{preview || data?.publicPath || t.noQr}</Text>
        <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.pageLinkHint}</Text>
      </View>
      <View ref={linkShareTarget} collapsable={false}>
        <PillButton label={t.sharePage} onPress={sharePageLink} tone="dark" />
      </View>
    </View>
  );

  return (
    <KeyboardAwareScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {tap.isLoading ? <Skeleton height={88} /> : null}
      {tap.isError ? <LoadErrorCard onRetry={() => tap.refetch().catch(() => undefined)} /> : null}
      {section === "link" ? linkBlock : section === "buttons" ? buttonBlock : section === "theme" ? themeBlock : (
        <View style={styles.stack}>
          <View style={styles.titleRow}>
            <Text style={[styles.section, lang === "hi" && styles.hindi]}>{t.shareQr}</Text>
            <HelpButton title={t.coachQrShow} body={t.coachQrShowBody} />
          </View>
          <View ref={qrTarget} collapsable={false} style={[styles.frame, bright && { borderColor: palette.primary, borderWidth: 2 }]}>
            {qrUri ? (
              <>
                {!lowRam ? <Animated.View style={[styles.glow, { backgroundColor: palette.primary }, glowStyle]} /> : null}
                <Animated.View style={qrStyle}>
                  <Image source={{ uri: qrUri }} placeholder={{ blurhash: BLURHASH }} style={[styles.qr, { backgroundColor: palette.card }]} contentFit="contain" accessibilityLabel={t.shareQr} />
                  <QrModules reduceMotion={reduceMotion || lowRam} color={palette.card} />
                </Animated.View>
              </>
            ) : <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.noQr}</Text>}
          </View>
          {qrUri ? <PillButton label={bright ? t.showToCustomerOn : t.showToCustomer} onPress={() => { showToCustomer().catch(() => undefined); }} tone="dark" /> : null}
          <View ref={qrShareTarget} collapsable={false} style={styles.row}>
            <PillButton label={t.shareQr} onPress={share} tone="outline" />
            <PillButton label={t.downloadQr} onPress={share} tone="outline" />
            <PillButton label={t.printStand} onPress={() => qrUri && WebBrowser.openBrowserAsync(qrUri)} disabled={!qrUri} tone="outline" />
          </View>
          {section !== "qr" ? <>
            <PillButton label={t.nfc} onPress={() => {
              if (locked("nfc")) {
                openPlanLock("nfc");
                return;
              }
              router.push("/(app)/nfc");
            }} tone="dark" />
            <SectionHeader label={t.directTitle} />
            <Group>
              <GroupRow
                icon={Link2}
                tint={directMode === "DIRECT" ? "green" : "ink"}
                title={t.directToggle}
                hint={directMode === "DIRECT" && chosen
                  ? `${t.directOpens} ${lang === "hi" && chosen.labelHi ? chosen.labelHi : visibleButtonLabel(chosen)}`
                  : t.directHint}
                selected={directMode === "DIRECT"}
                onPress={() => {
                  const next = directMode !== "DIRECT";
                  if (next && locked("direct-link")) {
                    openPlanLock("direct-link");
                    return;
                  }
                  setDirectOn(next);
                  if (next && !directOptions.some((link) => link.key === directTarget) && directOptions[0]) setDirectKey(directOptions[0].key);
                }}
              />
              {directOptions.map((link) => (
                <GroupRow key={link.key} icon={Link2} tint="blue" title={visibleButtonLabel(link)} hint={buttonLabel(link.type, lang)}
                  selected={link.key === directTarget && directMode === "DIRECT"}
                  onPress={() => {
                    if (locked("direct-link")) {
                      openPlanLock("direct-link");
                      return;
                    }
                    setDirectOn(true);
                    setDirectKey(link.key);
                  }} />
              ))}
            </Group>
            {directMode === "DIRECT" && chosen ? <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.directOpens} {visibleButtonLabel(chosen)}</Text> : null}
            {directMode === "TAP_PAGE" && shown.filter((link) => link.enabled).length === 1 && directOptions.length === 1 ? <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.directHint}</Text> : null}
            <Field label={t.about} tone="paper" value={bioText} onChangeText={setBio} />
            {themeBlock}
            {buttonBlock}
            <SectionHeader label={t.customColour} />
            <Field label={t.customColour} tone="paper" value={bg} onChangeText={setBg} autoCapitalize="none" />
            <Field label={t.customLink} tone="paper" value={ink} onChangeText={setInk} autoCapitalize="none" />
            <PillButton label={t.save} tone="outline" onPress={saveColour} />
            {data?.code ? <>
              <PillButton label={t.shareQr} onPress={share} tone="outline" />
              <PillButton label={t.openBrowser} onPress={() => WebBrowser.openBrowserAsync(preview)} disabled={!preview} tone="outline" />
              {preview ? <WebView source={{ uri: preview }} style={styles.preview} /> : null}
            </> : null}
          </> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {section !== "qr" ? <PillButton label={t.publish} onPress={publish} disabled={busy} hint={t.hintWait} tone="dark" /> : null}
        </View>
      )}
      <CoachTour
        disabled={!showQrPageTour}
        screen="qr"
        steps={[
          { title: t.coachQrShow, body: t.coachQrShowBody, top: 140 },
          { title: t.coachQrNfc, body: t.coachQrNfcBody, top: 360 }
        ]}
      />
      <BottomSheet visible={editingLink !== null} title={t.editButton} onClose={() => setEditingLink(null)}>
        {editingLink !== null && shown[editingLink] ? (
          <View style={styles.stack}>
            <Field label={t.buttonLabel} tone="paper" value={shown[editingLink].labelEn} onChangeText={(labelEn) => edit(editingLink, { labelEn })} />
            <Field label={t.buttonLabelHi} tone="paper" value={shown[editingLink].labelHi} onChangeText={(labelHi) => edit(editingLink, { labelHi })} />
            <Field label={t.linkAddress} tone="paper" value={shown[editingLink].url} onChangeText={(url) => edit(editingLink, { url })} autoCapitalize="none" />
            <PillButton label={t.save} onPress={() => setEditingLink(null)} tone="dark" />
          </View>
        ) : null}
      </BottomSheet>
      <SetupWalkthrough step="link" screen="qr" targets={{ link: linkTarget, share: linkShareTarget }} steps={[
        { title: t.pageLink, body: t.setupCoachLink, top: 170, target: "link" },
        { title: t.sharePage, body: t.setupCoachLink, top: 320, target: "share" }
      ]} />
      <SetupWalkthrough step="buttons" screen="qr" targets={{ buttons: buttonRowTarget }} steps={[
        { title: t.pageButtons, body: t.setupCoachButtons, top: 220, target: "buttons" }
      ]} />
      <SetupWalkthrough step="print" screen="qr" targets={{ qr: qrTarget, share: qrShareTarget }} steps={[
        { title: t.printYourQr, body: t.setupCoachQr, top: 200, target: "qr" },
        { title: t.shareQr, body: t.setupCoachShare, top: 370, target: "share" }
      ]} />
    </KeyboardAwareScrollView>
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

type NativeView = ElementRef<typeof View>;

function PageButtonRow({
  icon: Icon,
  label,
  enabled,
  index,
  count,
  palette,
  dragLabel,
  editLabel,
  onToggle,
  onEdit,
  onReorder,
  targetRef
}: {
  icon: LucideIcon;
  label: string;
  enabled: boolean;
  index: number;
  count: number;
  palette: Palette;
  dragLabel: string;
  editLabel: string;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onReorder: (from: number, to: number) => void;
  targetRef?: RefObject<NativeView | null>;
}) {
  const { lang } = useI18n();
  const drag = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 6,
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_event, gesture) => {
      const target = Math.max(0, Math.min(count - 1, index + Math.round(gesture.dy / 78)));
      if (target !== index) onReorder(index, target);
    }
  }), [count, index, onReorder]);
  return (
    <View ref={targetRef} collapsable={false} style={[rowStyles.buttonRow, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${editLabel}`} onPress={onEdit} style={rowStyles.buttonEdit}>
        <View style={[rowStyles.buttonIcon, { backgroundColor: palette.accentSoft }]}><Icon color={palette.deep} size={20} strokeWidth={1.8} /></View>
        <Text style={[rowStyles.buttonName, { color: palette.ink }, lang === "hi" && rowStyles.hindi]} numberOfLines={2}>{label}</Text>
        <Pencil color={palette.muted} size={16} />
      </Pressable>
      <Switch
        accessibilityLabel={label}
        accessibilityState={{ checked: enabled }}
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: palette.line, true: palette.primary }}
        thumbColor={palette.card}
      />
      <View accessibilityRole="button" accessibilityLabel={dragLabel} {...drag.panHandlers} style={rowStyles.dragHandle}>
        <GripVertical color={palette.muted} size={22} />
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  buttonRow: { minHeight: 72, borderRadius: 18, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  buttonEdit: { minHeight: 56, flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  buttonIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buttonName: { flex: 1, fontFamily: fonts.bodyStrong, fontSize: 14 },
  dragHandle: { width: 42, height: 52, alignItems: "center", justifyContent: "center" },
  hindi: { fontFamily: fonts.hindi }
});

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
  previewButton: { minHeight: 36, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  previewButtonText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  linkCard: { minHeight: 152, borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  linkText: { fontFamily: fonts.bodyStrong, fontSize: 16 },
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
  qr: { width: 200, height: 200, borderRadius: 16 }
});
}

export default function TapScreen() {
  return (
    <Screen topInset={true}><TapScreenContent /></Screen>
  );
}

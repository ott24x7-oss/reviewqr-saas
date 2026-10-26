import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BUSINESS_CATEGORIES,
  ONBOARDING_THEMES,
  emptyDraft,
  mergeDraft,
  normalizeSlug,
  pastedLinkRejected,
  resumeStep,
  skipSlugChoice,
  wizardIssues,
  type WizardDraft
} from "@reviewqr/shared";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import LottieView from "lottie-react-native";
import { Camera, Download, Image as ImageIcon, Share2, ShoppingBag, Store, Utensils } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { trackAppEvent } from "../../src/analytics/events";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { WIZARD_LOCAL_KEY } from "../../src/onboarding/seen";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { OptionTile, ProgressSteps } from "../../src/ui/bits";
import { PrimaryButton, TextButton } from "../../src/ui/buttons";
import { Field, PillButton } from "../../src/ui/controls";
import { tapSuccess } from "../../src/ui/haptics";
import { useTheme } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";

type Progress = {
  step: number;
  completed: boolean;
  draft: WizardDraft;
};

type SlugCheck = { slug: string; available: boolean; reason: string | null; url: string; suggestions?: string[] };
type PlaceHit = { placeId: string; description: string };
type Done = { businessId: string; name: string; publicUrl: string; scanUrl: string; qrDataUrl: string };

export default function WizardScreen() {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { palette, reduceMotion, lowRam } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const slide = useSharedValue(0);
  const previewFade = useSharedValue(1);
  const qrScale = useSharedValue(1);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>(emptyDraft());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState<SlugCheck | null>(null);
  const [places, setPlaces] = useState<PlaceHit[]>([]);
  const [placeQuery, setPlaceQuery] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const localRaw = await AsyncStorage.getItem(WIZARD_LOCAL_KEY).catch(() => null);
      const prefill = await AsyncStorage.getItem("reviewqr.prefillBusiness").catch(() => null);
      let next = emptyDraft();
      let nextStep = 1;
      if (localRaw) {
        try {
          const local = JSON.parse(localRaw) as { step?: number; draft?: unknown };
          next = mergeDraft(local.draft);
          nextStep = resumeStep(local.step || 1, false) || 1;
        } catch {
          next = emptyDraft();
        }
      }
      try {
        const remote = await apiData<Progress>("/api/v1/onboarding");
        if (!remote.completed) {
          const remoteStep = resumeStep(remote.step, false) || 1;
          if (remote.step >= nextStep) {
            next = mergeDraft({ ...next, ...remote.draft });
            nextStep = remoteStep;
          }
        }
      } catch {
        // Local progress still opens the step.
      }
      if (!next.whatsapp && user?.phone) next = { ...next, whatsapp: user.phone };
      if (!next.name && prefill) next = { ...next, name: prefill };
      if (!live) return;
      setDraft(next);
      setStep(nextStep);
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, [user?.phone]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(WIZARD_LOCAL_KEY, JSON.stringify({ step, draft })).catch(() => undefined);
  }, [ready, step, draft]);

  useEffect(() => {
    if (step !== 3 || draft.slug || !draft.name) return;
    const next = normalizeSlug(draft.name);
    if (next) patch({ slug: next });
    // Prefill once when the link step opens with an empty address.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== 3) return;
    const slugQuery = draft.slug;
    const name = draft.name;
    const timer = setTimeout(() => {
      const query = `slug=${encodeURIComponent(slugQuery)}&name=${encodeURIComponent(name)}`;
      apiData<SlugCheck>(`/api/v1/slugs/availability?${query}`)
        .then((row) => {
          if (row.slug === slugQuery) setSlug(row);
        })
        .catch(() => setSlug(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [step, draft.slug, draft.name]);

  function patch(partial: Partial<WizardDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  async function upload(kind: "logo" | "cover", source: "library" | "camera") {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError(t.cameraOff);
        return;
      }
    }
    const shot =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (shot.canceled || !shot.assets[0]) return;
    const asset = shot.assets[0];
    const body = new FormData();
    body.append("variant", kind);
    body.append("file", { uri: asset.uri, name: `${kind}.jpg`, type: "image/jpeg" } as unknown as Blob);
    setBusy(true);
    setError(null);
    try {
      const saved = await apiData<{ url: string }>("/api/v1/uploads", { method: "POST", body });
      patch(kind === "logo" ? { logo: saved.url } : { cover: saved.url });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save that photo");
    } finally {
      setBusy(false);
    }
  }

  async function searchPlaces() {
    setError(null);
    try {
      const data = await apiData<{ enabled: boolean; predictions: PlaceHit[] }>(
        `/api/v1/places/search?q=${encodeURIComponent(placeQuery)}`
      );
      setPlaces(data.predictions || []);
      if (!data.enabled) setError(t.placesOff);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.placesOff);
    }
  }

  async function choosePlace(placeId: string) {
    try {
      const data = await apiData<{ place: { googleReviewUrl?: string; name?: string; city?: string } | null }>(
        `/api/v1/places/details?placeId=${encodeURIComponent(placeId)}`
      );
      if (data.place?.googleReviewUrl) patch({ googleReviewUrl: data.place.googleReviewUrl });
      if (data.place?.city && !draft.city) patch({ city: data.place.city });
      setPlaces([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.placesOff);
    }
  }

  async function importPhoto() {
    const shot = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.4, mediaTypes: ["images"] });
    if (shot.canceled || !shot.assets[0]?.base64) return;
    setPhoto(`data:image/jpeg;base64,${shot.assets[0].base64}`);
  }

  async function persist(nextStep: number, source: WizardDraft = draft) {
    const issues = wizardIssues(nextStep, source);
    if (issues.length) {
      setError(issues[0]);
      return false;
    }
    if (nextStep === 3 && (slug?.slug !== source.slug || !slug?.available)) {
      const fresh = await apiData<SlugCheck>(
        `/api/v1/slugs/availability?slug=${encodeURIComponent(source.slug)}&name=${encodeURIComponent(source.name)}`
      ).catch(() => null);
      if (fresh) setSlug(fresh);
      const ok = fresh?.slug === source.slug && fresh.available;
      if (!ok) {
        setError(fresh?.reason === "reserved" ? t.slugReserved : fresh?.reason === "invalid" ? t.slugUrl : t.slugTaken);
        return false;
      }
    }
    await apiData("/api/v1/onboarding", {
      method: "PUT",
      body: JSON.stringify({ step: nextStep, draft: source })
    });
    return true;
  }

  async function finish(source: WizardDraft) {
    const created = await apiData<Done>("/api/v1/onboarding/finish", { method: "POST", body: "{}" });
    if (photo) {
      try {
        const snapped = await apiData<{ item: { name?: string; priceRupees?: number } }>(
          `/api/v1/businesses/${created.businessId}/menu/snap`,
          { method: "POST", body: JSON.stringify({ image: photo }) }
        );
        if (snapped.item?.name) {
          await apiData(`/api/v1/businesses/${created.businessId}/menu`, {
            method: "POST",
            body: JSON.stringify({
              action: "item",
              name: snapped.item.name,
              priceRupees: snapped.item.priceRupees || 0
            })
          });
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Type the menu items yourself");
      }
    }
    await AsyncStorage.removeItem(WIZARD_LOCAL_KEY).catch(() => undefined);
    void trackAppEvent("setup_complete");
    setDone(created);
    return source;
  }

  async function next() {
    setBusy(true);
    setError(null);
    try {
      const saved = await persist(step);
      if (!saved) return;
      if (step < 4) {
        if (!reduceMotion) {
          slide.value = 28;
          slide.value = withTiming(0, { duration: 280 });
        }
        setStep(step + 1);
        return;
      }
      await finish(draft);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this step");
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    if (step < 2) return;
    setBusy(true);
    setError(null);
    try {
      let source = draft;
      if (step === 4) {
        const reviewOk = !draft.googleReviewUrl || /^https?:\/\//i.test(draft.googleReviewUrl);
        source = {
          ...draft,
          googleReviewUrl: reviewOk ? draft.googleReviewUrl : "",
          items: draft.items.filter((item) => item.name.trim() && /^\d+(\.\d{1,2})?$/.test(item.price.trim()))
        };
        setDraft(source);
      }
      if (step === 3) {
        const fresh = await apiData<SlugCheck>(
          `/api/v1/slugs/availability?slug=${encodeURIComponent(draft.slug)}&name=${encodeURIComponent(draft.name)}`
        );
        setSlug(fresh);
        const chosen = skipSlugChoice(fresh.slug, fresh.available, fresh.suggestions || []);
        if (!chosen) {
          setError(t.slugTaken);
          return;
        }
        source = { ...draft, slug: chosen };
        setDraft(source);
      }
      const saved = await persist(step, source);
      if (!saved) return;
      if (step < 4) {
        setStep(step + 1);
        return;
      }
      await finish(source);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this step");
    } finally {
      setBusy(false);
    }
  }

  async function shareQr() {
    if (!done) return;
    const base64 = done.qrDataUrl.split(",")[1] || "";
    const path = `${FileSystem.cacheDirectory}reviewqr.jpg`;
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
  }

  useEffect(() => {
    if (reduceMotion) return;
    previewFade.value = 0.45;
    previewFade.value = withTiming(1, { duration: 200 });
  }, [draft.name, draft.themeId, previewFade, reduceMotion]);

  useEffect(() => {
    if (!done) return;
    tapSuccess();
    if (reduceMotion || lowRam) {
      qrScale.value = 1;
      return;
    }
    qrScale.value = 0.9;
    qrScale.value = withSpring(1, { damping: 14 });
  }, [done, lowRam, qrScale, reduceMotion]);

  const stepShift = useAnimatedStyle(() => ({ transform: [{ translateX: slide.value }], opacity: reduceMotion ? 1 : 1 }));
  const previewAnim = useAnimatedStyle(() => ({ opacity: previewFade.value }));
  const qrAnim = useAnimatedStyle(() => ({ transform: [{ scale: qrScale.value }] }));

  if (!ready) return <SafeAreaView style={styles.screen} />;

  if (done) {
    return (
      <SafeAreaView style={styles.screen} testID="wizard-success">
        <ScrollView contentContainerStyle={styles.content}>
          {!reduceMotion && !lowRam ? (
            <LottieView source={require("../../assets/lottie/confetti.json")} autoPlay loop={false} style={styles.confetti} />
          ) : null}
          <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.pageLive}</Text>
          <Text style={[styles.url, { color: palette.muted }]}>{done.publicUrl}</Text>
          <Animated.View style={[styles.qrCard, { backgroundColor: palette.card }, qrAnim]}>
            <Image source={{ uri: done.qrDataUrl }} style={styles.qr} />
          </Animated.View>
          <PrimaryButton testID="go-dashboard" label={t.goDashboard} onPress={() => router.replace("/(app)")} />
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel={t.openPage} onPress={() => Linking.openURL(done.publicUrl)} style={styles.action}>
              <Store color={palette.deep} size={22} strokeWidth={1.75} />
              <Text style={[styles.actionText, { color: palette.ink }]}>{t.openPage}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t.shareWhatsapp} onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(done.publicUrl)}`)} style={styles.action}>
              <Share2 color={palette.deep} size={22} strokeWidth={1.75} />
              <Text style={[styles.actionText, { color: palette.ink }]}>{t.shareWhatsapp}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t.downloadQr} onPress={shareQr} style={styles.action}>
              <Download color={palette.deep} size={22} strokeWidth={1.75} />
              <Text style={[styles.actionText, { color: palette.ink }]}>{t.downloadQr}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t.orderStand} onPress={() => router.replace("/(app)/shop")} style={styles.action}>
              <ShoppingBag color={palette.deep} size={22} strokeWidth={1.75} />
              <Text style={[styles.actionText, { color: palette.ink }]}>{t.orderStand}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const theme = ONBOARDING_THEMES.find((item) => item.id === draft.themeId) || ONBOARDING_THEMES[0];

  return (
    <SafeAreaView style={styles.screen} testID={`wizard-step-${step}`}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressSteps labels={[t.stepBusiness, t.stepLook, t.stepLink, t.stepMenu]} step={step} />
        <Animated.View style={stepShift}>
        {step === 1 ? (
          <View style={styles.stack}>
            <Field label={t.businessName} tone="paper" value={draft.name} onChangeText={(name) => patch({ name })} />
            <Text style={styles.label}>{t.category}</Text>
            <View style={styles.tiles}>
              {BUSINESS_CATEGORIES.map((item) => {
                const Icon = item.id === "cafe" ? Utensils : item.id === "clinic" ? Store : item.id === "shop" ? ShoppingBag : item.id === "salon" ? ImageIcon : Store;
                return (
                  <OptionTile
                    key={item.id}
                    icon={Icon}
                    title={lang === "hi" ? item.hi : item.en}
                    selected={draft.category === item.id}
                    onPress={() => patch({ category: item.id })}
                  />
                );
              })}
            </View>
            <Field label={t.city} tone="paper" value={draft.city} onChangeText={(city) => patch({ city })} />
            <Field label={t.whatsapp} tone="paper" value={draft.whatsapp} onChangeText={(whatsapp) => patch({ whatsapp })} keyboardType="phone-pad" />
          </View>
        ) : null}
        {step === 2 ? (
          <View style={styles.stack}>
            <View style={styles.tiles}>
              <OptionTile icon={Camera} title={t.camera} onPress={() => upload("logo", "camera")} />
              <OptionTile icon={ImageIcon} title={t.gallery} onPress={() => upload("logo", "library")} />
            </View>
            <PillButton label={t.coverPhoto} tone="outline" onPress={() => upload("cover", "library")} />
            <Animated.View style={[styles.preview, { backgroundColor: theme.bg }, previewAnim]}>
              <Text style={[styles.previewName, { color: theme.ink }]}>{draft.name || t.businessName}</Text>
              <View style={[styles.previewButton, { backgroundColor: theme.button }]}>
                <Text style={styles.previewButtonText}>{t.preview}</Text>
              </View>
            </Animated.View>
            <View style={styles.row}>
              {ONBOARDING_THEMES.map((item) => (
                <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.id} accessibilityState={{ selected: draft.themeId === item.id }} onPress={() => patch({ themeId: item.id })} style={[styles.swatch, { backgroundColor: item.bg }, draft.themeId === item.id && styles.swatchOn]} />
              ))}
            </View>
          </View>
        ) : null}
        {step === 3 ? (
          <View style={styles.stack}>
            <Text style={[styles.title, { fontSize: 28 }, lang === "hi" && styles.hindi]}>{t.pageAddress}</Text>
            <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.pageAddressHelp}</Text>
            <View style={[styles.prefixRow, { backgroundColor: palette.card, borderColor: palette.line }]}>
              <Text style={[styles.prefix, { color: palette.muted }]}>qr24x7.in/</Text>
              <TextInput
                accessibilityLabel={t.pageLink}
                value={draft.slug}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="mango-cafe"
                placeholderTextColor={palette.muted}
                onChangeText={(value) => {
                  if (pastedLinkRejected(value)) {
                    setError(t.slugUrl);
                    patch({ slug: "" });
                    return;
                  }
                  setError(null);
                  patch({ slug: normalizeSlug(value) });
                }}
                style={[styles.prefixInput, { color: palette.ink }]}
              />
            </View>
            <Text style={styles.url}>{draft.slug ? `qr24x7.in/${draft.slug}` : "qr24x7.in/"}</Text>
            {slug?.slug === draft.slug ? (
              <Text style={styles.note}>
                {slug.available ? t.slugFree : slug.reason === "reserved" ? t.slugReserved : slug.reason === "invalid" ? t.slugUrl : t.slugTaken}
              </Text>
            ) : null}
            <View style={styles.row}>
              {(slug?.suggestions || []).map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={item}
                  onPress={() => patch({ slug: item })}
                  style={[styles.chip, draft.slug === item && styles.chipOn]}
                >
                  <Text style={[styles.chipText, draft.slug === item && styles.chipTextOn]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        {step === 4 ? (
          <View style={styles.stack}>
            <Field label={t.searchPlaces} tone="paper" value={placeQuery} onChangeText={setPlaceQuery} />
            <PillButton label={t.searchPlaces} tone="outline" onPress={searchPlaces} />
            {places.map((place) => (
              <Pressable key={place.placeId} accessibilityRole="button" accessibilityLabel={place.description} onPress={() => choosePlace(place.placeId)} style={styles.chip}>
                <Text>{place.description}</Text>
              </Pressable>
            ))}
            <Field label={t.reviewUrl} tone="paper" value={draft.googleReviewUrl} onChangeText={(googleReviewUrl) => patch({ googleReviewUrl })} autoCapitalize="none" />
            {draft.items.map((item, index) => (
              <View key={index} style={styles.row}>
                <View style={styles.grow}>
                  <Field
                    label={t.addItem}
                    tone="paper"
                    value={item.name}
                    onChangeText={(name) => {
                      const items = draft.items.slice();
                      items[index] = { ...item, name };
                      patch({ items });
                    }}
                  />
                </View>
                <View style={styles.price}>
                  <Field
                    label={t.price}
                    tone="paper"
                    value={item.price}
                    keyboardType="decimal-pad"
                    onChangeText={(price) => {
                      const items = draft.items.slice();
                      items[index] = { ...item, price };
                      patch({ items });
                    }}
                  />
                </View>
              </View>
            ))}
            {draft.items.length < 3 ? (
              <PillButton label={t.addItem} tone="outline" onPress={() => patch({ items: [...draft.items, { name: "", price: "" }] })} />
            ) : null}
            <PillButton label={photo ? t.photo : t.importMenu} tone="outline" onPress={importPhoto} />
          </View>
        ) : null}
        </Animated.View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={step === 4 ? t.finish : t.wizardNext} onPress={next} disabled={busy} hint={t.hintWait} />
        {step > 1 ? <TextButton label={t.skipForNow} onPress={skip} /> : null}
        {step > 1 ? (
          <PillButton
            label={t.wizardBack}
            tone="outline"
            onPress={() => {
              if (!reduceMotion) {
                slide.value = -28;
                slide.value = withTiming(0, { duration: 280 });
              }
              setStep(step - 1);
            }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 14 },
  stack: { gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.ink },
  kicker: { fontFamily: fonts.bodyStrong, color: colors.inkSoft },
  label: { fontFamily: fonts.bodyStrong, color: colors.inkSoft },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 48, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.deep },
  chipText: { fontFamily: fonts.bodyStrong, color: colors.ink },
  chipTextOn: { color: colors.onPrimary },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  confetti: { width: 220, height: 140, alignSelf: "center" },
  qrCard: { borderRadius: 20, padding: 16, alignItems: "center" },
  actions: { flexDirection: "row", gap: 8 },
  action: { flex: 1, minHeight: 72, alignItems: "center", justifyContent: "center", gap: 6 },
  actionText: { fontFamily: fonts.bodyStrong, fontSize: 12, textAlign: "center" },
  preview: { borderRadius: 24, padding: 20, gap: 16, minHeight: 180, justifyContent: "center" },
  previewName: { fontFamily: fonts.display, fontSize: 28 },
  previewButton: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  previewButtonText: { color: colors.white, fontFamily: fonts.bodyStrong },
  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: "#DDD6C8" },
  swatchOn: { borderColor: colors.ink, borderWidth: 3 },
  prefixRow: { minHeight: 56, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 4 },
  prefix: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  prefixInput: { flex: 1, minHeight: 48, fontFamily: fonts.body, fontSize: 16 },
  url: { fontFamily: fonts.body, color: colors.ink },
  note: { fontFamily: fonts.body, color: colors.inkSoft },
  error: { color: colors.danger, fontFamily: fonts.body },
  qr: { width: 220, height: 220, alignSelf: "center" },
  grow: { flex: 1 },
  price: { width: 110 },
  hindi: { fontFamily: fonts.hindi }
});
}

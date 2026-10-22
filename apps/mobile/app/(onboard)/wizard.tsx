import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BUSINESS_CATEGORIES,
  ONBOARDING_THEMES,
  emptyDraft,
  mergeDraft,
  normalizeSlug,
  resumeStep,
  wizardIssues,
  type WizardDraft
} from "@reviewqr/shared";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { WIZARD_LOCAL_KEY } from "../../src/onboarding/seen";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";
import { Field, PillButton } from "../../src/ui/controls";

type Progress = {
  step: number;
  completed: boolean;
  draft: WizardDraft;
};

type SlugCheck = { slug: string; available: boolean; reason: string | null; url: string };
type PlaceHit = { placeId: string; description: string };
type Done = { businessId: string; name: string; publicUrl: string; scanUrl: string; qrDataUrl: string };

export default function WizardScreen() {
  const { t, lang } = useI18n();
  const { user } = useSession();
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
    if (step !== 3 || draft.slug.length < 3) {
      setSlug(null);
      return;
    }
    const timer = setTimeout(() => {
      apiData<SlugCheck>(`/api/v1/slugs/availability?slug=${encodeURIComponent(draft.slug)}`)
        .then(setSlug)
        .catch(() => setSlug(null));
    }, 300);
    return () => clearTimeout(timer);
  }, [step, draft.slug]);

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

  async function persist(nextStep: number) {
    const issues = wizardIssues(nextStep, draft);
    if (issues.length) {
      setError(issues[0]);
      return false;
    }
    if (nextStep === 3 && !slug?.available) {
      setError(slug?.reason === "reserved" ? t.slugReserved : t.slugTaken);
      return false;
    }
    await apiData("/api/v1/onboarding", {
      method: "PUT",
      body: JSON.stringify({ step: nextStep, draft })
    });
    return true;
  }

  async function next() {
    setBusy(true);
    setError(null);
    try {
      const saved = await persist(step);
      if (!saved) return;
      if (step < 4) {
        setStep(step + 1);
        return;
      }
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
      setDone(created);
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

  if (!ready) return <SafeAreaView style={styles.screen} />;

  if (done) {
    return (
      <SafeAreaView style={styles.screen} testID="wizard-success">
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.successTitle}</Text>
          <Text style={styles.url}>{done.publicUrl}</Text>
          <Image source={{ uri: done.qrDataUrl }} style={styles.qr} />
          <PillButton label={t.openPage} onPress={() => Linking.openURL(done.publicUrl)} />
          <PillButton
            label={t.shareWhatsapp}
            tone="outline"
            onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(done.publicUrl)}`)}
          />
          <PillButton label={t.downloadQr} tone="outline" onPress={shareQr} />
          <PillButton label={t.orderStand} tone="dark" onPress={() => router.replace("/(app)/shop")} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const theme = ONBOARDING_THEMES.find((item) => item.id === draft.themeId) || ONBOARDING_THEMES[0];

  return (
    <SafeAreaView style={styles.screen} testID={`wizard-step-${step}`}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.kicker, lang === "hi" && styles.hindi]}>{step} / 4</Text>
        {step === 1 ? (
          <View style={styles.stack}>
            <Field label={t.businessName} tone="paper" value={draft.name} onChangeText={(name) => patch({ name })} />
            <Text style={styles.label}>{t.category}</Text>
            <View style={styles.row}>
              {BUSINESS_CATEGORIES.map((item) => (
                <Pressable key={item.id} onPress={() => patch({ category: item.id })} style={[styles.chip, draft.category === item.id && styles.chipOn]}>
                  <Text style={[styles.chipText, draft.category === item.id && styles.chipTextOn, lang === "hi" && styles.hindi]}>
                    {lang === "hi" ? item.hi : item.en}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Field label={t.city} tone="paper" value={draft.city} onChangeText={(city) => patch({ city })} />
            <Field label={t.whatsapp} tone="paper" value={draft.whatsapp} onChangeText={(whatsapp) => patch({ whatsapp })} keyboardType="phone-pad" />
          </View>
        ) : null}
        {step === 2 ? (
          <View style={styles.stack}>
            <PillButton label={t.camera} tone="outline" onPress={() => upload("logo", "camera")} />
            <PillButton label={t.gallery} tone="outline" onPress={() => upload("logo", "library")} />
            <PillButton label={t.coverPhoto} tone="outline" onPress={() => upload("cover", "library")} />
            <View style={[styles.preview, { backgroundColor: theme.bg }]}>
              <Text style={[styles.previewName, { color: theme.ink }]}>{draft.name || t.businessName}</Text>
              <View style={[styles.previewButton, { backgroundColor: theme.button }]}>
                <Text style={styles.previewButtonText}>{t.preview}</Text>
              </View>
            </View>
            <View style={styles.row}>
              {ONBOARDING_THEMES.map((item) => (
                <Pressable key={item.id} onPress={() => patch({ themeId: item.id })} style={[styles.swatch, { backgroundColor: item.bg }, draft.themeId === item.id && styles.swatchOn]} />
              ))}
            </View>
          </View>
        ) : null}
        {step === 3 ? (
          <View style={styles.stack}>
            <Field
              label={t.pageLink}
              tone="paper"
              value={draft.slug}
              autoCapitalize="none"
              onChangeText={(value) => patch({ slug: normalizeSlug(value) })}
            />
            {slug?.url ? <Text style={styles.url}>{slug.url}</Text> : null}
            {slug ? (
              <Text style={styles.note}>{slug.available ? t.slugFree : slug.reason === "reserved" ? t.slugReserved : t.slugTaken}</Text>
            ) : null}
          </View>
        ) : null}
        {step === 4 ? (
          <View style={styles.stack}>
            <Field label={t.searchPlaces} tone="paper" value={placeQuery} onChangeText={setPlaceQuery} />
            <PillButton label={t.searchPlaces} tone="outline" onPress={searchPlaces} />
            {places.map((place) => (
              <Pressable key={place.placeId} onPress={() => choosePlace(place.placeId)} style={styles.chip}>
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
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PillButton label={step === 4 ? t.finish : t.wizardNext} onPress={next} disabled={busy} />
        {step > 1 ? <PillButton label={t.wizardBack} tone="outline" onPress={() => setStep(step - 1)} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 14 },
  stack: { gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.ink },
  kicker: { fontFamily: fonts.bodyStrong, color: colors.inkSoft },
  label: { fontFamily: fonts.bodyStrong, color: colors.inkSoft },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.bodyStrong, color: colors.ink },
  chipTextOn: { color: colors.white },
  preview: { borderRadius: 24, padding: 20, gap: 16, minHeight: 180, justifyContent: "center" },
  previewName: { fontFamily: fonts.display, fontSize: 28 },
  previewButton: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  previewButtonText: { color: colors.white, fontFamily: fonts.bodyStrong },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "#DDD6C8" },
  swatchOn: { borderColor: colors.ink, borderWidth: 3 },
  url: { fontFamily: fonts.body, color: colors.ink },
  note: { fontFamily: fonts.body, color: colors.inkSoft },
  error: { color: colors.danger, fontFamily: fonts.body },
  qr: { width: 220, height: 220, alignSelf: "center" },
  grow: { flex: 1 },
  price: { width: 110 },
  hindi: { fontFamily: fonts.hindi }
});

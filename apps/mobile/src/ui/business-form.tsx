import type { PlaceDetails, PlacesSearch } from "@reviewqr/shared";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState , useMemo } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../api/data";
import { ApiError } from "../api/http";
import { useI18n } from "../i18n";
import { accountKey } from "../query/keys";
import { useBusiness, type BusinessCard } from "../state/business";
import { useSession } from "../state/session";
import { fonts } from "../theme";
import { usePalette } from "./theme";
import type { Palette } from "./tokens";
import { FilledField, PillButton, StickyAction } from "./controls";
import { SectionHeader } from "./rows";

type Draft = {
  name: string;
  phone: string;
  city: string;
  address: string;
  googleReviewUrl: string;
  googlePlaceId: string;
  whatsappNumber: string;
};

const empty: Draft = {
  name: "",
  phone: "",
  city: "",
  address: "",
  googleReviewUrl: "",
  googlePlaceId: "",
  whatsappNumber: ""
};

export function BusinessForm({ initial, businessId }: { initial?: BusinessCard | null; businessId?: string }) {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { choose, reload } = useBusiness();
  const client = useQueryClient();
  const [draft, setDraft] = useState<Draft>({
    ...empty,
    name: initial?.name || "",
    phone: initial?.phone || "",
    city: initial?.city || "",
    address: initial?.address || "",
    googleReviewUrl: initial?.googleReviewUrl || "",
    googlePlaceId: initial?.googlePlaceId || "",
    whatsappNumber: initial?.whatsappNumber || ""
  });
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlacesSearch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function patch(part: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...part }));
  }

  async function search() {
    setError(null);
    setBusy(true);
    try {
      const found = await apiData<PlacesSearch>(`/api/v1/places/search?q=${encodeURIComponent(query)}`);
      setPlaces(found);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  async function pick(placeId: string) {
    setError(null);
    setBusy(true);
    try {
      const details = await apiData<PlaceDetails>(`/api/v1/places/details?placeId=${encodeURIComponent(placeId)}`);
      if (details.place) {
        patch({
          name: details.place.name,
          phone: details.place.phone,
          city: details.place.city,
          address: details.place.address,
          googlePlaceId: details.place.googlePlaceId,
          googleReviewUrl: details.place.googleReviewUrl
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load that place");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const body = {
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        city: draft.city.trim(),
        address: draft.address.trim(),
        googleReviewUrl: draft.googleReviewUrl.trim(),
        googlePlaceId: draft.googlePlaceId.trim(),
        whatsappNumber: draft.whatsappNumber.trim()
      };
      const saved = businessId
        ? await apiData<{ business: { id: string } }>(`/api/v1/businesses/${businessId}`, {
            method: "PATCH",
            body: JSON.stringify(body)
          })
        : await apiData<{ business: { id: string } }>("/api/v1/businesses", {
            method: "POST",
            body: JSON.stringify(body)
          });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "businesses") });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "dashboard") });
      choose(saved.business.id);
      reload();
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionHeader label={t.searchPlaces} />
        <View style={styles.card}>
          <FilledField label={t.searchPlaces} value={query} onChangeText={setQuery} />
          <PillButton label={t.searchPlaces} onPress={search} disabled={busy || query.trim().length < 2} tone="outline" />
          {places && !places.enabled ? <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.placesOff}</Text> : null}
          {places?.predictions.map((row) => (
            <Pressable key={row.placeId} accessibilityRole="button" accessibilityLabel={row.description} onPress={() => pick(row.placeId)} style={styles.hit}>
              <Text style={[styles.hitText, lang === "hi" && styles.hindi]}>{row.description}</Text>
            </Pressable>
          ))}
        </View>
        <SectionHeader label={t.businessName} />
        <View style={styles.card}>
          <FilledField label={t.businessName} value={draft.name} onChangeText={(name) => patch({ name })} />
          <FilledField label={t.phone} value={draft.phone} onChangeText={(phone) => patch({ phone })} keyboardType="phone-pad" />
          <FilledField label={t.whatsapp} value={draft.whatsappNumber} onChangeText={(whatsappNumber) => patch({ whatsappNumber })} keyboardType="phone-pad" />
        </View>
        <SectionHeader label={t.address} />
        <View style={styles.card}>
          <FilledField label={t.city} value={draft.city} onChangeText={(city) => patch({ city })} />
          <FilledField label={t.address} value={draft.address} onChangeText={(address) => patch({ address })} />
        </View>
        <SectionHeader label={t.reviewUrl} />
        <View style={styles.card}>
          <FilledField label={t.reviewUrl} value={draft.googleReviewUrl} onChangeText={(googleReviewUrl) => patch({ googleReviewUrl })} autoCapitalize="none" />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <StickyAction>
        <PillButton
          label={t.save}
          onPress={save}
          disabled={busy || draft.name.trim().length < 2}
          hint={draft.name.trim().length < 2 ? t.hintBusiness : t.hintWait}
          tone="dark"
        />
      </StickyAction>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 12, gap: 10 },
  hit: { minHeight: 48, justifyContent: "center", backgroundColor: colors.paper, borderRadius: 14, paddingHorizontal: 14 },
  hitText: { fontFamily: fonts.body, color: colors.ink },
  note: { fontFamily: fonts.body, color: colors.inkSoft, lineHeight: 22 },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});
}

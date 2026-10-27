import { Screen } from "../../src/ui/screen";
import { FeatureGate } from "../../src/state/plan-lock";
import { DURATION_STEPS, formatDuration, formatServicePrice, type PriceType } from "@reviewqr/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Plus, Scissors } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { BottomSheet, Card, EmptyState, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { Field, PillButton } from "../../src/ui/controls";
import { PhotoSourceButtons } from "../../src/ui/photo-source-buttons";
import { useTheme } from "../../src/ui/theme";

type PriceKind = PriceType;
type Variant = { id: string; label: string; pricePaise: number; durationMinutes?: number | null };
type ServiceItem = {
  id: string;
  name: string;
  pricePaise: number;
  photo?: string | null;
  durationMinutes?: number | null;
  kind?: "PRODUCT" | "SERVICE";
  priceType?: PriceKind;
  bookable?: boolean;
  variants?: Variant[];
};

function photoUri(photo?: string | null) {
  if (!photo) return null;
  if (photo.startsWith("http") || photo.startsWith("data:")) return photo;
  if (photo.startsWith("/")) {
    const base = apiBaseUrl();
    return base ? `${base}${photo}` : null;
  }
  return null;
}

function ServicesScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const id = business?.id;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState<number | null>(30);
  const [priceType, setPriceType] = useState<PriceKind>("FIXED");
  const [bookable, setBookable] = useState(true);
  const [photo, setPhoto] = useState("");
  const [optionName, setOptionName] = useState("");
  const [optionPrice, setOptionPrice] = useState("");
  const [optionDuration, setOptionDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hindi = lang === "hi";

  const items = useQuery({
    queryKey: accountKey(user?.id ?? "", "menu", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: ServiceItem[] }>(`/api/v1/businesses/${id}/menu?limit=50`)
  });
  const services = (items.data?.items ?? []).filter((item) => item.kind === "SERVICE");

  function reset(item?: ServiceItem | null) {
    setEditing(item ?? null);
    setName(item?.name ?? "");
    setPrice(item ? String(item.pricePaise / 100) : "");
    setDuration(item?.durationMinutes ?? 30);
    setPriceType(item?.priceType || "FIXED");
    setBookable(item?.bookable !== false);
    setPhoto(item?.photo || "");
    setOptionName("");
    setOptionPrice("");
    setOptionDuration(null);
    setError(null);
    setOpen(true);
  }

  async function pickPhoto(source: "camera" | "library") {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError(t.cameraOff);
        return;
      }
    }
    const shot = source === "camera"
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4, mediaTypes: ["images"] })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.4, mediaTypes: ["images"] });
    const encoded = shot.assets?.[0]?.base64;
    if (shot.canceled || !encoded) return;
    const dataUrl = `data:image/jpeg;base64,${encoded}`;
    if (dataUrl.length > 1_400_000) {
      setError(t.servicePhotos);
      return;
    }
    setPhoto(dataUrl);
  }

  async function save() {
    if (!id || busy) return;
    const priceRupees = Number(price || 0);
    if (!name.trim() || !Number.isFinite(priceRupees)) return;
    setBusy(true);
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/menu`, {
        method: "POST",
        body: JSON.stringify({
          action: editing ? "update" : "item",
          ...(editing ? { id: editing.id } : {}),
          name: name.trim(),
          priceRupees,
          itemKind: "SERVICE",
          priceType,
          bookable,
          durationMinutes: duration,
          ...(photo ? { photo } : {})
        })
      });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "menu", id) });
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function addOption() {
    if (!id || !editing || !optionName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/menu`, {
        method: "POST",
        body: JSON.stringify({
          action: "variant",
          id: editing.id,
          name: optionName.trim(),
          priceRupees: Number(optionPrice || 0),
          ...(optionDuration ? { durationMinutes: optionDuration } : {})
        })
      });
      setOptionName("");
      setOptionPrice("");
      setOptionDuration(null);
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "menu", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const priceChoices: PriceKind[] = ["FIXED", "FROM", "ON_REQUEST"];
  const priceLabel = (kind: PriceKind) => (kind === "FROM" ? t.priceFrom : kind === "ON_REQUEST" ? t.priceOnRequest : t.priceFixed);

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: palette.ink }, hindi && styles.hindi]}>{t.services}</Text>
        {items.isLoading ? <Skeleton height={120} /> : null}
        {items.isError ? <LoadErrorCard onRetry={() => items.refetch().catch(() => undefined)} /> : null}
        {!items.isLoading && services.length === 0 ? (
          <EmptyState icon={Scissors} title={t.services} body={t.noServices} action={t.addService} onAction={() => reset(null)} />
        ) : null}
        {services.map((item) => {
          const uri = photoUri(item.photo);
          return (
            <Pressable key={item.id} accessibilityRole="button" onPress={() => reset(item)}>
              <Card>
                <View style={styles.row}>
                  {uri ? <Image source={{ uri }} style={styles.thumb} contentFit="cover" /> : null}
                  <View style={styles.copy}>
                    <Text style={[styles.name, { color: palette.ink }, hindi && styles.hindi]}>{item.name}</Text>
                    <Text style={[styles.meta, { color: palette.muted }, hindi && styles.hindi]}>
                      {formatDuration(item.durationMinutes, lang)}
                      {item.durationMinutes ? " · " : ""}
                      {formatServicePrice({ pricePaise: item.pricePaise, priceType: item.priceType, lang })}
                      {item.bookable === false ? ` · ${t.notBookable}` : ""}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.addService}
        onPress={() => reset(null)}
        style={[styles.fab, { backgroundColor: palette.primary }]}
      >
        <Plus color={palette.onPrimary} size={24} strokeWidth={1.75} />
      </Pressable>
      <BottomSheet visible={open} title={editing ? t.editService : t.addService} onClose={() => setOpen(false)}>
        <View style={styles.stack}>
          <PhotoSourceButtons lang={lang} palette={palette} onCamera={() => pickPhoto("camera")} onGallery={() => pickPhoto("library")} disabled={busy} />
          {photoUri(photo) ? <Image source={{ uri: photoUri(photo) || "" }} style={styles.preview} contentFit="cover" /> : null}
          <Field label={t.name} value={name} onChangeText={setName} />
          <Field label={t.price} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <Text style={[styles.meta, { color: palette.muted }, hindi && styles.hindi]}>{t.duration}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: duration == null }} onPress={() => setDuration(null)} style={[styles.chip, { borderColor: palette.line, backgroundColor: duration == null ? palette.primary : palette.card }]}>
              <Text style={{ color: duration == null ? palette.onPrimary : palette.ink }}>—</Text>
            </Pressable>
            {DURATION_STEPS.map((step) => (
              <Pressable
                key={step}
                accessibilityRole="button"
                accessibilityState={{ selected: duration === step }}
                onPress={() => setDuration(step)}
                style={[styles.chip, { borderColor: palette.line, backgroundColor: duration === step ? palette.primary : palette.card }]}
              >
                <Text style={[{ color: duration === step ? palette.onPrimary : palette.ink }, hindi && styles.hindi]}>{formatDuration(step, lang)}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={[styles.meta, { color: palette.muted }, hindi && styles.hindi]}>{t.priceType}</Text>
          <View style={styles.chips}>
            {priceChoices.map((kind) => (
              <Pressable
                key={kind}
                accessibilityRole="button"
                accessibilityState={{ selected: priceType === kind }}
                onPress={() => setPriceType(kind)}
                style={[styles.chip, { borderColor: palette.line, backgroundColor: priceType === kind ? palette.primary : palette.card }]}
              >
                <Text style={[{ color: priceType === kind ? palette.onPrimary : palette.ink }, hindi && styles.hindi]}>{priceLabel(kind)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.switchRow}>
            <Text style={[styles.name, { color: palette.ink }, hindi && styles.hindi]}>{t.bookable}</Text>
            <Switch
              accessibilityLabel={t.bookable}
              value={bookable}
              onValueChange={setBookable}
              trackColor={{ false: palette.line, true: palette.primary }}
              thumbColor={palette.card}
            />
          </View>
          {editing ? (
            <View style={styles.stack}>
              <Text style={[styles.meta, { color: palette.muted }, hindi && styles.hindi]}>{t.serviceOption}</Text>
              {(editing.variants ?? []).map((variant) => (
                <Text key={variant.id} style={[styles.meta, { color: palette.ink }]}>
                  {variant.label}
                  {variant.durationMinutes ? ` · ${formatDuration(variant.durationMinutes, lang)}` : ""}
                  {` · ${formatServicePrice({ pricePaise: variant.pricePaise, lang })}`}
                </Text>
              ))}
              <Field label={t.serviceOption} value={optionName} onChangeText={setOptionName} />
              <Field label={t.optionPrice} value={optionPrice} onChangeText={setOptionPrice} keyboardType="decimal-pad" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {DURATION_STEPS.filter((step) => step <= 180).map((step) => (
                  <Pressable key={step} accessibilityRole="button" onPress={() => setOptionDuration(step)} style={[styles.chip, { borderColor: palette.line, backgroundColor: optionDuration === step ? palette.primary : palette.card }]}>
                    <Text style={{ color: optionDuration === step ? palette.onPrimary : palette.ink }}>{formatDuration(step, lang)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <PillButton label={t.addOption} tone="outline" onPress={addOption} disabled={busy || !optionName.trim()} />
            </View>
          ) : null}
          {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
          <PillButton label={t.saveService} onPress={save} disabled={busy || !name.trim()} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  copy: { flex: 1, gap: 4 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  meta: { fontFamily: fonts.body, fontSize: 14 },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  preview: { height: 120, borderRadius: 14 },
  stack: { gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  switchRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fab: { position: "absolute", right: 16, bottom: 24, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  hindi: { fontFamily: fonts.hindi }
});

export default function ServicesScreen() {
  return (
    <FeatureGate id="services-booking">
      <Screen topInset={true}>
        <ServicesScreenContent />
      </Screen>
    </FeatureGate>
  );
}

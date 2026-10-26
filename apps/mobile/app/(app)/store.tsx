import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Screen } from "../../src/ui/screen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { hasModule, useEntitlement } from "../../src/state/entitlement";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card } from "../../src/ui/bits";
import { Field, PillButton } from "../../src/ui/controls";
import { LockedModuleCard } from "../../src/ui/locked-module";
import { useTheme } from "../../src/ui/theme";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
type Day = (typeof DAYS)[number];
type Slot = { open: string; close: string } | null;
type Settings = {
  holiday: boolean;
  hours: Partial<Record<Day, Slot>>;
  dineIn: boolean;
  takeaway: boolean;
  delivery: boolean;
  deliveryPincodes: string;
  deliveryChargeRupees: number;
  freeDeliveryAboveRupees: number | null;
  minOrderRupees: number;
  packingChargeRupees: number;
  gstEnabled: boolean;
  gstPercent: number;
  pricesIncludeGst: boolean;
  prepMinutes: number;
  upiId?: string;
  layout: "AUTO" | "FOOD" | "SHOP" | "SERVICES";
  design: "CLASSIC" | "PREMIUM" | "MINIMAL" | "BOLD";
};

const DESIGNS = ["CLASSIC", "PREMIUM", "MINIMAL", "BOLD"] as const;

function hoursFrom(raw: Settings["hours"] | undefined) {
  const hours = {} as Record<Day, Slot>;
  for (const day of DAYS) {
    hours[day] = raw && Object.prototype.hasOwnProperty.call(raw, day) ? raw[day] ?? null : { open: "09:00", close: "21:00" };
  }
  return hours;
}

function StoreScreenContent() {
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const entitlement = useEntitlement();
  const modules = entitlement.data?.modules;
  const open = !!business && (!modules || hasModule(modules, "STORE"));
  const id = business?.id;
  const [draft, setDraft] = useState<Settings | null>(null);
  const [place, setPlace] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const settings = useQuery({
    queryKey: accountKey(user?.id ?? "", "store", id),
    enabled: !!user && open,
    queryFn: () => apiData<Settings>(`/api/v1/businesses/${id}/store`)
  });
  const locations = useQuery({
    queryKey: accountKey(user?.id ?? "", "locations", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: { id: string; name: string; city: string }[] }>(`/api/v1/businesses/${id}/locations`)
  });
  const form = draft ?? (settings.data ? { ...settings.data, hours: hoursFrom(settings.data.hours), upiId: settings.data.upiId || "" } : null);

  async function save() {
    if (!id || !form) return;
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/store`, { method: "PUT", body: JSON.stringify({ ...form, upiId: form.upiId || "" }) });
      setDraft(null);
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "store", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  async function addLocation() {
    if (!id || place.trim().length < 2) return;
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/locations`, { method: "POST", body: JSON.stringify({ name: place.trim(), city: city.trim() }) });
      setPlace("");
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "locations", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add");
    }
  }

  return (
    <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.storeSettings}</Text>
      {modules && !hasModule(modules, "STORE") ? <LockedModuleCard moduleId="STORE" /> : null}
      {form ? (
        <>
          <PillButton label={form.holiday ? t.holidayMode : t.available} tone={form.holiday ? "dark" : "outline"} onPress={() => setDraft({ ...form, holiday: !form.holiday })} />
          {DAYS.map((day) => {
            const slot = form.hours[day];
            return (
              <Card key={day} style={styles.card}>
                <Text style={[styles.name, { color: palette.ink }]}>{day}</Text>
                <PillButton label={slot ? t.available : t.closedDay} tone="outline" onPress={() => setDraft({ ...form, hours: { ...form.hours, [day]: slot ? null : { open: "09:00", close: "21:00" } } })} />
                {slot ? (
                  <View style={styles.row}>
                    <Field label={t.available} tone="paper" value={slot.open} onChangeText={(openTime) => setDraft({ ...form, hours: { ...form.hours, [day]: { ...slot, open: openTime } } })} />
                    <Field label={t.closedDay} tone="paper" value={slot.close} onChangeText={(close) => setDraft({ ...form, hours: { ...form.hours, [day]: { ...slot, close } } })} />
                  </View>
                ) : null}
              </Card>
            );
          })}
          <Field label={t.upiId} tone="paper" value={form.upiId || ""} onChangeText={(upiId) => setDraft({ ...form, upiId })} autoCapitalize="none" />
          <PillButton label={t.dineIn} tone={form.dineIn ? "dark" : "outline"} onPress={() => setDraft({ ...form, dineIn: !form.dineIn })} />
          <PillButton label={t.pickup} tone={form.takeaway ? "dark" : "outline"} onPress={() => setDraft({ ...form, takeaway: !form.takeaway })} />
          <PillButton label={t.delivery} tone={form.delivery ? "dark" : "outline"} onPress={() => setDraft({ ...form, delivery: !form.delivery })} />
          <Field label={t.minOrder} tone="paper" value={String(form.minOrderRupees)} onChangeText={(value) => setDraft({ ...form, minOrderRupees: Number(value) || 0 })} keyboardType="number-pad" />
          <Text style={[styles.name, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.storeDesign}</Text>
          <View style={styles.row}>
            {DESIGNS.map((design) => (
              <Pressable key={design} accessibilityRole="button" onPress={() => setDraft({ ...form, design })} style={[styles.chip, { borderColor: palette.line, backgroundColor: form.design === design ? palette.primary : palette.card }]}>
                <Text style={{ color: form.design === design ? palette.onPrimary : palette.ink, fontFamily: fonts.bodyStrong }}>{design}</Text>
              </Pressable>
            ))}
          </View>
          <PillButton label={t.save} tone="dark" onPress={save} />
        </>
      ) : null}
      <Text style={[styles.name, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.locations}</Text>
      <Field label={t.addLocation} tone="paper" value={place} onChangeText={setPlace} />
      <Field label={t.city} tone="paper" value={city} onChangeText={setCity} />
      <PillButton label={t.addLocation} tone="outline" onPress={addLocation} />
      {(locations.data?.items ?? []).map((row) => (
        <Text key={row.id} style={[styles.note, { color: palette.muted }]}>{row.name}{row.city ? ` · ${row.city}` : ""}</Text>
      ))}
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  note: { fontFamily: fonts.body, fontSize: 14 },
  card: { gap: 6 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center" },
  hindi: { fontFamily: fonts.hindi }
});

export default function StoreScreen() {
  return (
    <Screen topInset={true}><StoreScreenContent /></Screen>
  );
}

import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import { Screen } from "../../src/ui/screen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { ElementRef } from "react";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { hasModule, useEntitlement } from "../../src/state/entitlement";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { BottomSheet, Card, EmptyState, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { Field, PillButton, StickyAction } from "../../src/ui/controls";
import { LockedModuleCard } from "../../src/ui/locked-module";
import { useTheme } from "../../src/ui/theme";
import { SetupWalkthrough } from "../../src/guide/setup-tour";

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
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const entitlement = useEntitlement();
  const hoursTarget = useRef<ElementRef<typeof View>>(null);
  const upiTarget = useRef<ElementRef<typeof View>>(null);
  const modules = entitlement.data?.modules;
  const open = !!business && (!modules || hasModule(modules, "STORE"));
  const id = business?.id;
  const [draft, setDraft] = useState<Settings | null>(null);
  const [place, setPlace] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [timeField, setTimeField] = useState<{ day: Day; field: "open" | "close" } | null>(null);
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
  const dayNames: Record<Day, string> = {
    sun: t.sunday, mon: t.monday, tue: t.tuesday, wed: t.wednesday,
    thu: t.thursday, fri: t.friday, sat: t.saturday
  };
  const designNames: Record<(typeof DESIGNS)[number], string> = {
    CLASSIC: t.storeDesignClassic, PREMIUM: t.storeDesignPremium,
    MINIMAL: t.storeDesignMinimal, BOLD: t.storeDesignBold
  };

  function setDay(day: Day, slot: Slot) {
    if (!form) return;
    setDraft({ ...form, hours: { ...form.hours, [day]: slot } });
  }

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
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <KeyboardAwareScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={12}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.storeSettings}</Text>
      {modules && !hasModule(modules, "STORE") ? <LockedModuleCard moduleId="STORE" /> : null}
      {settings.isLoading ? <View style={styles.loading}><Skeleton height={64} /><Skeleton height={64} /></View> : null}
      {settings.isError ? <LoadErrorCard onRetry={() => settings.refetch().catch(() => undefined)} /> : null}
      {form ? (
        <>
          <SettingSwitch label={t.holidayMode} value={form.holiday} onChange={(holiday) => setDraft({ ...form, holiday })} />
          <View ref={upiTarget} collapsable={false}>
            <Field label={t.upiId} tone="paper" value={form.upiId || ""} onChangeText={(upiId) => setDraft({ ...form, upiId })} autoCapitalize="none" />
          </View>
          {DAYS.map((day) => {
            const slot = form.hours[day];
            return (
              <Card key={day} style={styles.card}>
                <View ref={day === "sun" ? hoursTarget : undefined} collapsable={false} style={styles.dayHead}>
                  <Text style={[styles.name, { color: palette.ink }, lang === "hi" && styles.hindi]}>{dayNames[day]}</Text>
                  <View style={styles.openSwitch}>
                    <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindi]}>{slot ? t.storeOpen : t.storeClosed}</Text>
                    <Switch
                      accessibilityLabel={`${dayNames[day]} ${slot ? t.storeOpen : t.storeClosed}`}
                      value={!!slot}
                      onValueChange={(enabled) => setDay(day, enabled ? (slot ?? { open: "09:00", close: "21:00" }) : null)}
                      trackColor={{ false: palette.line, true: palette.primary }}
                      thumbColor={palette.card}
                    />
                  </View>
                </View>
                {slot ? (
                  <View style={styles.row}>
                    {(["open", "close"] as const).map((field) => (
                      <View key={field} style={styles.timeCell}>
                        <Text style={[styles.timeLabel, { color: palette.muted }, lang === "hi" && styles.hindi]}>{field === "open" ? t.opensAt : t.closesAt}</Text>
                        <Pressable accessibilityRole="button" accessibilityLabel={`${dayNames[day]} ${field === "open" ? t.storeOpen : t.storeClosed}`} onPress={() => setTimeField({ day, field })} style={[styles.timeButton, { borderColor: palette.line, backgroundColor: palette.card }]}>
                          <Text style={[styles.timeText, { color: palette.ink }]}>{slot[field]}</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
                {day === "sun" ? (
                  <Pressable accessibilityRole="button" onPress={() => {
                    const hours = Object.fromEntries(DAYS.map((item) => [item, slot])) as Record<Day, Slot>;
                    setDraft({ ...form, hours });
                  }} style={styles.copyHours}>
                    <Text style={[styles.copyText, { color: palette.deep }, lang === "hi" && styles.hindi]}>{t.copyHoursToAll}</Text>
                  </Pressable>
                ) : null}
              </Card>
            );
          })}
          <SettingSwitch label={t.dineIn} value={form.dineIn} onChange={(dineIn) => setDraft({ ...form, dineIn })} />
          <SettingSwitch label={t.pickup} value={form.takeaway} onChange={(takeaway) => setDraft({ ...form, takeaway })} />
          <SettingSwitch label={t.delivery} value={form.delivery} onChange={(delivery) => setDraft({ ...form, delivery })} />
          <Field label={t.minOrder} tone="paper" value={String(form.minOrderRupees)} onChangeText={(value) => setDraft({ ...form, minOrderRupees: Number(value) || 0 })} keyboardType="number-pad" />
          <Text style={[styles.name, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.storeDesign}</Text>
          <View style={styles.row}>
            {DESIGNS.map((design) => (
              <Pressable key={design} accessibilityRole="button" onPress={() => setDraft({ ...form, design })} style={[styles.chip, { borderColor: palette.line, backgroundColor: form.design === design ? palette.primary : palette.card }]}>
                <Text style={{ color: form.design === design ? palette.onPrimary : palette.ink, fontFamily: fonts.bodyStrong }}>{designNames[design]}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <Text style={[styles.name, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.locations}</Text>
      <Field label={t.addLocation} tone="paper" value={place} onChangeText={setPlace} />
      <Field label={t.city} tone="paper" value={city} onChangeText={setCity} />
      <PillButton label={t.addLocation} tone="outline" onPress={addLocation} />
      {locations.isLoading ? <View style={styles.loading}><Skeleton height={58} /><Skeleton height={58} /></View> : null}
      {locations.isError ? <LoadErrorCard onRetry={() => locations.refetch().catch(() => undefined)} /> : null}
      {!locations.isLoading && !locations.isError && (locations.data?.items ?? []).length === 0 ? (
        <EmptyState icon={MapPin} title={t.emptyLocationsTitle} body={t.emptyLocationsBody} action={t.addLocation} onAction={() => scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true })} />
      ) : null}
      {!locations.isLoading && !locations.isError ? (locations.data?.items ?? []).map((row) => (
        <Text key={row.id} style={[styles.note, { color: palette.muted }]}>{row.name}{row.city ? ` · ${row.city}` : ""}</Text>
      )) : null}
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </KeyboardAwareScrollView>
    {form ? <StickyAction><PillButton label={t.save} tone="dark" onPress={save} /></StickyAction> : null}
    <BottomSheet visible={!!timeField} title={t.pickTime} onClose={() => setTimeField(null)}>
      <View style={styles.timeGrid}>
        {Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`).map((time) => (
          <Pressable key={time} accessibilityRole="button" onPress={() => {
            if (!timeField || !form) return;
            const slot = form.hours[timeField.day];
            if (slot) setDay(timeField.day, { ...slot, [timeField.field]: time });
            setTimeField(null);
          }} style={[styles.timeChoice, { backgroundColor: palette.chip, borderColor: palette.line }]}>
            <Text style={[styles.timeText, { color: palette.ink }]}>{time}</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
    <SetupWalkthrough
      step="store"
      screen="qr"
      targets={{ hours: hoursTarget, upi: upiTarget }}
      steps={[
        { title: t.storeSettings, body: t.setupCoachStoreHours, top: 160, target: "hours" },
        { title: t.upiId, body: t.setupCoachStoreUpi, top: 310, target: "upi" }
      ]}
    />
    </View>
  );
}

function SettingSwitch({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const { palette } = useTheme();
  const { lang } = useI18n();
  return (
    <View style={[styles.settingRow, { borderColor: palette.line, backgroundColor: palette.card }]}>
      <Text style={[styles.name, { color: palette.ink }, lang === "hi" && styles.hindi]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: palette.line, true: palette.primary }}
        thumbColor={palette.card}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  loading: { gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  note: { fontFamily: fonts.body, fontSize: 14 },
  card: { gap: 10 },
  row: { flexDirection: "row", gap: 8 },
  dayHead: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  openSwitch: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeCell: { flex: 1, gap: 6 },
  timeLabel: { fontFamily: fonts.body, fontSize: 12 },
  timeButton: { minHeight: 48, borderWidth: 1, borderRadius: 14, justifyContent: "center", paddingHorizontal: 12 },
  timeText: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  copyHours: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  copyText: { fontFamily: fonts.bodyStrong },
  settingRow: { minHeight: 58, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeChoice: { width: "22%", minHeight: 48, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  chip: { minHeight: 40, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center" },
  hindi: { fontFamily: fonts.hindi }
});

export default function StoreScreen() {
  return (
    <Screen topInset={true}><StoreScreenContent /></Screen>
  );
}

import { Screen } from "../../src/ui/screen";
import { FeatureGate } from "../../src/state/plan-lock";
import { useQuery } from "@tanstack/react-query";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { router } from "expo-router";
import { CalendarDays } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, EmptyState, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { tapStrong } from "../../src/ui/haptics";
import { useTheme } from "../../src/ui/theme";

type BookingCard = {
  id: string;
  customerName: string;
  serviceName: string;
  optionLabel: string;
  preferredDate: string;
  timeLabel: string;
  status: string;
};

const FILTERS = ["", "NEW", "CONFIRMED", "DONE", "CANCELLED", "NO_SHOW"] as const;

function labelFor(status: string, t: ReturnType<typeof useI18n>["t"]) {
  if (status === "CONFIRMED") return t.bookingStatusConfirmed;
  if (status === "DONE") return t.bookingStatusDone;
  if (status === "CANCELLED") return t.bookingStatusCancelled;
  if (status === "NO_SHOW") return t.bookingStatusNoShow;
  if (status === "NEW") return t.bookingStatusNew;
  return t.bookings;
}

function BookingsScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { business } = useBusiness();
  const [status, setStatus] = useState("");
  const id = business?.id ?? "";
  const known = useRef<Set<string> | null>(null);
  const player = useRef<AudioPlayer | null>(null);
  const hindi = lang === "hi";
  const rows = useQuery({
    queryKey: accountKey(user?.id ?? "", "bookings", id, status),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: BookingCard[] }>(`/api/v1/bookings?limit=40&businessId=${id}${status ? `&status=${status}` : ""}`)
  });

  useEffect(() => {
    try {
      player.current = createAudioPlayer(require("../../assets/sounds/order.wav"));
    } catch {
      player.current = null;
    }
    return () => {
      player.current?.remove();
    };
  }, []);

  useEffect(() => {
    const items = rows.data?.items;
    if (!items) return;
    if (known.current) {
      const arrived = items.filter((item) => item.status === "NEW" && !known.current?.has(item.id));
      if (arrived.length > 0) {
        tapStrong();
        const sound = player.current;
        if (sound) {
          sound.seekTo(0).catch(() => undefined);
          sound.play();
        }
      }
    }
    known.current = new Set(items.map((item) => item.id));
  }, [rows.data]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, hindi && styles.hindi]}>{t.bookings}</Text>
      <View style={styles.filters}>
        {FILTERS.map((item) => (
          <Pressable
            key={item || "all"}
            accessibilityRole="button"
            accessibilityState={{ selected: status === item }}
            onPress={() => setStatus(item)}
            style={[styles.chip, { borderColor: palette.line, backgroundColor: status === item ? palette.primary : palette.card }]}
          >
            <Text style={[{ color: status === item ? palette.onPrimary : palette.ink }, hindi && styles.hindi]}>
              {item ? labelFor(item, t) : t.bookings}
            </Text>
          </Pressable>
        ))}
      </View>
      {rows.isLoading ? <Skeleton height={120} /> : null}
      {rows.isError ? <LoadErrorCard onRetry={() => rows.refetch().catch(() => undefined)} /> : null}
      {!rows.isLoading && (rows.data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={CalendarDays} title={t.bookings} body={t.noBookings} />
      ) : null}
      {(rows.data?.items ?? []).map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/(app)/booking-detail", params: { id: item.id } })}
        >
          <Card>
            <Text style={[styles.name, { color: palette.ink }, hindi && styles.hindi]}>{item.customerName}</Text>
            <Text style={[styles.meta, { color: palette.muted }, hindi && styles.hindi]}>
              {item.serviceName}
              {item.optionLabel ? ` · ${item.optionLabel}` : ""}
            </Text>
            <Text style={[styles.meta, { color: palette.ink }]}>
              {item.preferredDate}
              {item.timeLabel ? ` · ${item.timeLabel}` : ""} · {labelFor(item.status, t)}
            </Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  meta: { fontFamily: fonts.body, fontSize: 14, marginTop: 2 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  hindi: { fontFamily: fonts.hindi }
});

export default function BookingsScreen() {
  return (
    <FeatureGate id="services-booking">
      <Screen topInset={true}>
        <BookingsScreenContent />
      </Screen>
    </FeatureGate>
  );
}

import { Screen } from "../../src/ui/screen";
import { FeatureGate } from "../../src/state/plan-lock";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { bookingStatusChoices } from "../../src/bookings/flow";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";

type Detail = {
  id: string;
  customerName: string;
  serviceName: string;
  optionLabel: string;
  phone: string | null;
  preferredDate: string;
  timeLabel: string;
  note: string;
  status: string;
  canManage: boolean;
  callUrl: string | null;
  whatsAppUrl: string | null;
};

function labelFor(status: string, t: ReturnType<typeof useI18n>["t"]) {
  if (status === "CONFIRMED") return t.bookingStatusConfirmed;
  if (status === "DONE") return t.bookingStatusDone;
  if (status === "CANCELLED") return t.bookingStatusCancelled;
  if (status === "NO_SHOW") return t.bookingStatusNoShow;
  if (status === "NEW") return t.bookingStatusNew;
  return status;
}

function BookingDetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const client = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hindi = lang === "hi";
  const booking = useQuery({
    queryKey: accountKey(user?.id ?? "", "booking", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<Detail>(`/api/v1/bookings/${id}`)
  });
  const row = booking.data;

  async function setStatus(status: string) {
    if (!id || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiData(`/api/v1/bookings/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "booking", id) });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "bookings") });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, hindi && styles.hindi]}>{row?.customerName || t.bookingDetail}</Text>
      {booking.isLoading ? <Skeleton height={160} /> : null}
      {booking.isError ? <LoadErrorCard onRetry={() => booking.refetch().catch(() => undefined)} /> : null}
      {row ? (
        <Card>
          <Text style={[styles.name, { color: palette.ink }, hindi && styles.hindi]}>{row.serviceName}</Text>
          {row.optionLabel ? <Text style={[styles.meta, { color: palette.muted }]}>{row.optionLabel}</Text> : null}
          <Text style={[styles.meta, { color: palette.ink }]}>
            {row.preferredDate}
            {row.timeLabel ? ` · ${row.timeLabel}` : ""}
          </Text>
          <Text style={[styles.meta, { color: palette.deep }]}>{labelFor(row.status, t)}</Text>
          {row.note ? <Text style={[styles.meta, { color: palette.muted }]}>{row.note}</Text> : null}
          <View style={styles.actions}>
            {row.callUrl ? <PillButton label={t.callCustomer} onPress={() => Linking.openURL(row.callUrl || "")} /> : null}
            {row.whatsAppUrl ? <PillButton label={t.whatsAppCustomer} tone="outline" onPress={() => Linking.openURL(row.whatsAppUrl || "")} /> : null}
          </View>
          {row.canManage ? (
            <View style={styles.actions}>
              {bookingStatusChoices(row.status).map((status) => (
                <PillButton key={status} label={labelFor(status, t)} tone="outline" disabled={busy} onPress={() => setStatus(status)} />
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 18 },
  meta: { fontFamily: fonts.body, fontSize: 15, marginTop: 4 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  hindi: { fontFamily: fonts.hindi }
});

export default function BookingDetailScreen() {
  return (
    <FeatureGate id="services-booking">
      <Screen topInset={true}>
        <BookingDetailContent />
      </Screen>
    </FeatureGate>
  );
}

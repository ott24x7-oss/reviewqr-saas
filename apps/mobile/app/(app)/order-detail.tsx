import { useQuery } from "@tanstack/react-query";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, Skeleton } from "../../src/ui/bits";
import { PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";

type Line = { name: string; qty: number; note: string; variant: string; addons: string[] };
type Detail = {
  id: string;
  number: string;
  status: string;
  customerName: string;
  place: string;
  note: string;
  totalPaise: number;
  phone: string | null;
  whatsAppUrl: string | null;
  items: Line[];
  events: { status: string; at: string }[];
  kot: string;
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const [error, setError] = useState<string | null>(null);
  const order = useQuery({
    queryKey: accountKey(user?.id ?? "", "order", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<Detail>(`/api/v1/orders/${id}`)
  });
  const row = order.data;

  async function shareKot() {
    if (!row) return;
    setError(null);
    try {
      const path = `${FileSystem.cacheDirectory}kot-${row.number}.txt`;
      await FileSystem.writeAsStringAsync(path, row.kot);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: "text/plain" });
    } catch {
      setError(row.kot);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>
        {row ? `#${row.number}` : t.orders}
      </Text>
      {order.isLoading ? <Skeleton height={160} /> : null}
      {row ? (
        <>
          <Card>
            <Text style={[styles.status, { color: palette.deep }]}>{row.status}</Text>
            <Text style={[styles.body, { color: palette.ink }]}>{row.customerName || t.feedback}</Text>
            {row.place ? <Text style={[styles.body, { color: palette.muted }]}>{t.tableLabel}: {row.place}</Text> : null}
            {row.note ? <Text style={[styles.body, { color: palette.muted }]}>{row.note}</Text> : null}
            <Text style={[styles.body, { color: palette.ink }]}>{t.rupee}{Math.round(row.totalPaise / 100)}</Text>
          </Card>
          <Text style={[styles.section, { color: palette.muted }]}>{t.menuTab}</Text>
          {row.items.map((item, index) => (
            <Card key={`${item.name}-${index}`}>
              <Text style={[styles.body, { color: palette.ink }]}>{item.qty} × {item.name}</Text>
              {item.variant ? <Text style={[styles.note, { color: palette.muted }]}>{item.variant}</Text> : null}
              {item.addons.length ? <Text style={[styles.note, { color: palette.muted }]}>{item.addons.join(", ")}</Text> : null}
              {item.note ? <Text style={[styles.note, { color: palette.muted }]}>{item.note}</Text> : null}
            </Card>
          ))}
          <Text style={[styles.section, { color: palette.muted }]}>{t.timeline}</Text>
          {row.events.map((event) => (
            <Text key={`${event.status}-${event.at}`} style={[styles.note, { color: palette.ink }]}>
              {event.status} · {event.at.slice(0, 16).replace("T", " ")}
            </Text>
          ))}
          <View style={styles.row}>
            {row.phone ? <PillButton label={t.callCustomer} onPress={() => Linking.openURL(`tel:${row.phone}`)} /> : null}
            {row.whatsAppUrl ? <PillButton label={t.whatsAppCustomer} tone="outline" onPress={() => Linking.openURL(row.whatsAppUrl || "")} /> : null}
          </View>
          <PillButton label={t.shareKot} tone="dark" onPress={shareKot} />
        </>
      ) : null}
      {error ? <Text style={{ color: palette.danger }}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  section: { fontFamily: fonts.bodyStrong, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 6 },
  status: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  body: { fontFamily: fonts.body, fontSize: 16, marginTop: 4 },
  note: { fontFamily: fonts.body, fontSize: 14, marginTop: 2 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  hindi: { fontFamily: fonts.hindi }
});

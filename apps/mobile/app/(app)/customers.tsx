import { useQuery } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card } from "../../src/ui/bits";
import { PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";

type Customer = { id: string; name: string; phone: string; orders: number; spendPaise: number; tags: string[] };

export default function CustomersScreen() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { business } = useBusiness();
  const [error, setError] = useState<string | null>(null);
  const id = business?.id;
  const rows = useQuery({
    queryKey: accountKey(user?.id ?? "", "customers", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Customer[] }>(`/api/v1/customers?businessId=${id}`)
  });

  async function exportCsv() {
    if (!id) return;
    setError(null);
    try {
      const data = await apiData<{ csv: string }>(`/api/v1/customers/export?businessId=${id}`);
      const dest = `${FileSystem.cacheDirectory}customers.csv`;
      await FileSystem.writeAsStringAsync(dest, data.csv);
      await Sharing.shareAsync(dest, { mimeType: "text/csv", UTI: "public.comma-separated-values-text" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not export");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.customers}</Text>
      <PillButton label={t.exportCsv} tone="dark" onPress={exportCsv} />
      {(rows.data?.items ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.name, { color: palette.ink }]}>{row.name || row.phone}</Text>
          <Text style={[styles.note, { color: palette.muted }]}>{row.orders} · {t.rupee}{Math.round(row.spendPaise / 100)} · {row.tags.join(", ")}</Text>
          <PillButton label={t.callCustomer} tone="outline" onPress={() => Linking.openURL(`tel:${row.phone}`)} />
          <PillButton label={t.whatsAppCustomer} tone="outline" onPress={() => Linking.openURL(`https://wa.me/${row.phone.replace(/\D/g, "")}`)} />
        </Card>
      ))}
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  note: { fontFamily: fonts.body, fontSize: 14 },
  card: { gap: 6 },
  hindi: { fontFamily: fonts.hindi }
});

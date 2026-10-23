import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { QrCode } from "lucide-react-native";
import { useState , useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { EmptyState } from "../../src/ui/bits";
import { usePalette } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";

type Analytics = {
  summary: {
    scans: number;
    tapsNfc: number;
    tapsQr: number;
    pageViews: number;
    buttonClicks: number;
    orders: number | null;
    orderPaise: number | null;
    feedback: number;
    avgRating: number | null;
  };
  trend: { day: string; scans: number }[];
  heatmap: number[][];
  modules: { store: boolean };
};

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function AnalyticsScreen() {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { business } = useBusiness();
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const id = business?.id;
  const query = useQuery({
    queryKey: accountKey(user?.id ?? "", "analytics", id, range),
    enabled: !!user && !!id,
    queryFn: () => apiData<Analytics>(`/api/v1/analytics?businessId=${id}&range=${range}`)
  });
  const summary = query.data?.summary;
  const quiet = !!query.data && isQuiet(query.data);
  const trend = query.data?.trend ?? [];
  const maxScan = Math.max(1, ...trend.map((row) => row.scans));
  const heat = query.data?.heatmap ?? [];
  const heatMax = Math.max(1, ...heat.flat());

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.analytics}</Text>
      <View style={styles.ranges}>
        {(["7d", "30d"] as const).map((item) => (
          <Pressable key={item} accessibilityRole="button" accessibilityLabel={item} accessibilityState={{ selected: range === item }} onPress={() => setRange(item)} style={[styles.chip, range === item && styles.chipOn]}>
            <Text style={[styles.chipText, range === item && styles.chipTextOn]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      {quiet ? (
        <EmptyState
          icon={QrCode}
          title={t.firstScans}
          body={t.firstScansBody}
          action={t.showQr}
          onAction={() => router.push("/(app)/tap")}
        />
      ) : (
      <>
      <View style={styles.grid}>
        <Card label={t.scans} value={summary ? String(summary.scans) : "…"} />
        <Card label={t.taps} value={summary ? `${summary.tapsNfc} + ${summary.tapsQr}` : "…"} />
        <Card label={t.pageViews} value={summary ? String(summary.pageViews) : "…"} />
        <Card
          label={t.ordersValue}
          value={
            query.data && !query.data.modules.store
              ? "—"
              : summary?.orders == null
                ? "…"
                : `${summary.orders} · ₹${Math.round((summary.orderPaise || 0) / 100)}`
          }
        />
      </View>
      <View style={styles.panel}>
        <Text style={[styles.panelTitle, lang === "hi" && styles.hindi]}>{t.scans}</Text>
        <View style={styles.trend}>
          {trend.map((row) => (
            <View key={row.day} style={styles.barWrap}>
              <View style={[styles.bar, { height: Math.max(4, (row.scans / maxScan) * 72) }]} />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.panel}>
        <Text style={[styles.panelTitle, lang === "hi" && styles.hindi]}>{t.analytics}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {heat.map((row, day) => (
              <View key={DAYS[day] + day} style={styles.heatRow}>
                <Text style={styles.heatLabel}>{DAYS[day]}</Text>
                {row.map((count, hour) => (
                  <View
                    key={`${day}-${hour}`}
                    style={[styles.heatCell, { backgroundColor: `rgba(28,27,24,${0.08 + (count / heatMax) * 0.92})` }]}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      </>
      )}
    </ScrollView>
  );
}

function isQuiet(data: Analytics) {
  const summary = data.summary;
  const totals =
    summary.scans +
    summary.tapsNfc +
    summary.tapsQr +
    summary.pageViews +
    summary.buttonClicks +
    summary.feedback +
    (summary.orders ?? 0) +
    (summary.orderPaise ?? 0);
  const trend = data.trend.reduce((sum, row) => sum + row.scans, 0);
  const heat = data.heatmap.flat().reduce((sum, count) => sum + count, 0);
  return totals + trend + heat === 0;
}

function Card({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { lang } = useI18n();
  return (
    <View style={styles.card}>
      <Text style={[styles.cardLabel, lang === "hi" && styles.hindi]}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12 },
  title: { fontFamily: fonts.title, fontSize: 22, color: colors.ink },
  ranges: { flexDirection: "row", gap: 8 },
  chip: { minHeight: 48, borderRadius: 999, paddingHorizontal: 16, justifyContent: "center", backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.deep },
  chipText: { fontFamily: fonts.bodyStrong, color: colors.ink },
  chipTextOn: { color: colors.onPrimary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "47%", backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 6 },
  cardLabel: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 14 },
  cardValue: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  panel: { backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 8 },
  panelTitle: { fontFamily: fonts.bodyStrong, color: colors.ink },
  trend: { height: 80, flexDirection: "row", alignItems: "flex-end", gap: 3 },
  barWrap: { flex: 1, height: 80, justifyContent: "flex-end" },
  bar: { backgroundColor: colors.ink, borderRadius: 3 },
  heatRow: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: 2 },
  heatLabel: { width: 14, fontFamily: fonts.body, fontSize: 10, color: colors.inkSoft },
  heatCell: { width: 10, height: 10, borderRadius: 2 },
  hindi: { fontFamily: fonts.hindi }
});
}

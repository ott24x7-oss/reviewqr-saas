import type { Dashboard } from "@reviewqr/shared";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";
import { PillButton } from "../../src/ui/controls";

export default function HomeScreen() {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { businesses, business, choose } = useBusiness();
  const home = useQuery({
    queryKey: accountKey(user?.id ?? "", "dashboard", business?.id ?? "all"),
    enabled: !!user,
    queryFn: () => apiData<Dashboard>(`/api/v1/dashboard${business ? `?businessId=${business.id}` : ""}`)
  });
  const plan = home.data?.plan;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher}>
        {businesses.map((item) => (
          <Pressable key={item.id} onPress={() => choose(item.id)} style={[styles.chip, item.id === business?.id && styles.chipOn]}>
            <Text style={[styles.chipText, lang === "hi" && styles.hindi]}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.grid}>
        <Stat label={t.todayOrders} value={home.data?.ordersToday} />
        <Stat label={t.todayFeedback} value={home.data?.feedbackToday} />
        <Stat label={t.todayScans} value={home.data?.scansToday} />
        <Stat label={t.plan} value={plan ? `${plan.tier}` : "…"} hint={plan?.status} />
      </View>
      {plan?.subscriptionEndsAt ? <Text style={styles.hint}>{plan.subscriptionEndsAt.slice(0, 10)}</Text> : null}
      {plan?.trialEndsAt && !plan.subscriptionEndsAt ? <Text style={styles.hint}>{plan.trialEndsAt.slice(0, 10)}</Text> : null}
      <PillButton label={t.preview} onPress={() => router.push("/(app)/tap")} tone="dark" />
      <PillButton label={t.addBusiness} onPress={() => router.push("/(app)/business-new")} tone="outline" />
      {business ? <PillButton label={business.name} onPress={() => router.push("/(app)/business-edit")} tone="outline" /> : null}
    </ScrollView>
  );
}

function Stat({ label, value, hint }: { label: string; value?: number | string; hint?: string }) {
  const { lang } = useI18n();
  return (
    <View style={styles.card}>
      <Text style={[styles.cardLabel, lang === "hi" && styles.hindi]}>{label}</Text>
      <Text style={styles.cardValue}>{value ?? "…"}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 16 },
  switcher: { gap: 8 },
  chip: { minHeight: 44, borderRadius: 999, paddingHorizontal: 16, justifyContent: "center", backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.bodyStrong, color: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "47%", backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 6 },
  cardLabel: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 14 },
  cardValue: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  hint: { fontFamily: fonts.body, color: colors.inkSoft },
  hindi: { fontFamily: fonts.hindi }
});

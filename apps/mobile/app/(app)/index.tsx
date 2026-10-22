import type { Dashboard } from "@reviewqr/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";
import { PillButton } from "../../src/ui/controls";

type Tip = { key: string; titleEn: string; titleHi: string; appHref: string; done?: boolean };
type Growth = { ready: boolean; score: number | null; tips: Tip[]; checklist: Tip[] };
type Note = { id: string; title: string; titleHi: string; body: string; bodyHi: string; link: string };

export default function HomeScreen() {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { businesses, business, choose } = useBusiness();
  const client = useQueryClient();
  const home = useQuery({
    queryKey: accountKey(user?.id ?? "", "dashboard", business?.id ?? "all"),
    enabled: !!user,
    queryFn: () => apiData<Dashboard>(`/api/v1/dashboard${business ? `?businessId=${business.id}` : ""}`)
  });
  const growth = useQuery({
    queryKey: accountKey(user?.id ?? "", "growth", business?.id),
    enabled: !!user && !!business,
    queryFn: () => apiData<Growth>(`/api/v1/growth?businessId=${business?.id}`)
  });
  const notes = useQuery({
    queryKey: accountKey(user?.id ?? "", "announcements"),
    enabled: !!user,
    queryFn: () => apiData<Note[]>("/api/v1/announcements")
  });
  const plan = home.data?.plan;

  async function markTip(tipKey: string) {
    if (!business) return;
    await apiData("/api/v1/growth", { method: "POST", body: JSON.stringify({ businessId: business.id, tipKey }) });
    await growth.refetch();
  }

  async function dismiss(id: string) {
    await apiData("/api/v1/announcements", { method: "POST", body: JSON.stringify({ id }) });
    await notes.refetch();
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={home.isRefetching}
          onRefresh={() => {
            home.refetch().catch(() => undefined);
            growth.refetch().catch(() => undefined);
            notes.refetch().catch(() => undefined);
            client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "subscription") }).catch(() => undefined);
          }}
        />
      }
    >
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
      {(notes.data ?? []).map((note) => (
        <View key={note.id} style={styles.note}>
          <Text style={[styles.cardLabel, lang === "hi" && styles.hindi]}>{lang === "hi" && note.titleHi ? note.titleHi : note.title}</Text>
          <Text style={[styles.hint, lang === "hi" && styles.hindi]}>{lang === "hi" && note.bodyHi ? note.bodyHi : note.body}</Text>
          <Pressable onPress={() => dismiss(note.id).catch(() => undefined)} style={styles.done}>
            <Text style={styles.doneText}>{t.dismiss}</Text>
          </Pressable>
        </View>
      ))}
      {growth.data ? (
        <View style={styles.note}>
          <View style={styles.noteHead}>
            <Text style={[styles.panelTitle, lang === "hi" && styles.hindi]}>{growth.data.ready ? t.growthScore : t.gettingStarted}</Text>
            {growth.data.ready && growth.data.score != null ? <Text style={styles.cardValue}>{growth.data.score}</Text> : null}
          </View>
          {growth.data.ready ? <Text style={[styles.hint, lang === "hi" && styles.hindi]}>{t.doThisWeek}</Text> : null}
          {(growth.data.ready ? growth.data.tips : growth.data.checklist).map((tip) => (
            <View key={tip.key} style={styles.tipRow}>
              <Pressable onPress={() => router.push(tip.appHref as Href)} style={styles.tipLink}>
                <Text style={[styles.tipText, lang === "hi" && styles.hindi]}>
                  {tip.done ? "✓ " : ""}
                  {lang === "hi" ? tip.titleHi : tip.titleEn}
                </Text>
              </Pressable>
              {growth.data?.ready ? (
                <Pressable onPress={() => markTip(tip.key).catch(() => undefined)} style={styles.done}>
                  <Text style={styles.doneText}>{t.markDone}</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      <PillButton label={t.preview} onPress={() => router.push("/(app)/tap")} tone="dark" />
      <PillButton label={t.orders} onPress={() => router.push("/(app)/orders")} tone="outline" />
      <PillButton label={t.quickMenu} onPress={() => router.push("/(app)/menu")} tone="outline" />
      <PillButton label={t.quickFeedback} onPress={() => router.push("/(app)/feedback")} tone="outline" />
      <PillButton label={t.orderStand} onPress={() => router.push("/(app)/shop")} tone="outline" />
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
  hindi: { fontFamily: fonts.hindi },
  note: { backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 8 },
  noteHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  panelTitle: { fontFamily: fonts.title, fontSize: 18, color: colors.ink },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipLink: { flex: 1, minHeight: 44, justifyContent: "center" },
  tipText: { fontFamily: fonts.bodyStrong, color: colors.ink },
  done: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.chip },
  doneText: { fontFamily: fonts.bodyStrong, color: colors.ink, fontSize: 12 }
});

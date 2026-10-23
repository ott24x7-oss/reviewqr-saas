import type { Dashboard } from "@reviewqr/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { Check, ClipboardList, MessageSquare, Printer, QrCode, Share2, ShoppingBag, Sparkles, Star } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { apiData } from "../../src/api/data";
import { CoachTour } from "../../src/guide/coach";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, Chip, EmptyState, KpiCard, Skeleton } from "../../src/ui/bits";
import { TextButton } from "../../src/ui/buttons";
import { useTheme } from "../../src/ui/theme";
import { writeWidgetSnapshot } from "../../src/widgets/cache";

type Tip = { key: string; titleEn: string; titleHi: string; appHref: string; done?: boolean };
type Growth = { ready: boolean; score: number | null; tips: Tip[]; checklist: Tip[] };
type Note = { id: string; title: string; titleHi: string; body: string; bodyHi: string; link: string };
type Analytics = {
  summary: { scans: number; orders: number | null; orderPaise: number | null; feedback: number };
  trend: { day: string; scans: number }[];
  modules: { store: boolean };
};
type OrderCard = { id: string; number: string; status: string; customerName: string; totalPaise: number };
type FeedbackRow = { id: string; message: string; review: { rating: number; customerName: string | null } };

export default function HomeScreen() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { businesses, business, choose } = useBusiness();
  const client = useQueryClient();
  const [live, setLive] = useState(true);
  const [range, setRange] = useState<"7d" | "30d">("7d");
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
  const analytics = useQuery({
    queryKey: accountKey(user?.id ?? "", "analytics", business?.id, range),
    enabled: !!user && !!business,
    queryFn: () => apiData<Analytics>(`/api/v1/analytics?businessId=${business?.id}&range=${range}`)
  });
  const orders = useQuery({
    queryKey: accountKey(user?.id ?? "", "orders", business?.id),
    enabled: !!user && !!business,
    queryFn: () => apiData<{ items: OrderCard[] }>(`/api/v1/orders?limit=5&businessId=${business?.id}`)
  });
  const feedback = useQuery({
    queryKey: accountKey(user?.id ?? "", "feedback", business?.id),
    enabled: !!user,
    queryFn: () => apiData<{ items: FeedbackRow[] }>(`/api/v1/feedback?limit=5${business ? `&businessId=${business.id}` : ""}`)
  });
  const plan = home.data?.plan;
  const scans = live ? home.data?.scansToday : analytics.data?.summary.scans;
  const reviews = live ? home.data?.feedbackToday : analytics.data?.summary.feedback;
  const orderCount = live ? home.data?.ordersToday : analytics.data?.summary.orders;
  const sales = analytics.data?.modules.store === false ? null : analytics.data?.summary.orderPaise;
  const points = (analytics.data?.trend ?? []).map((row) => row.scans);
  const scanTrend = points.length > 1 && points[points.length - 1] > points[0] ? "up" : points.length > 1 && points[points.length - 1] < points[0] ? "down" : "flat";

  useEffect(() => {
    if (!user || !home.data) return;
    writeWidgetSnapshot({
      loggedIn: true,
      scans: home.data.scansToday,
      orders: home.data.ordersToday,
      reviews: home.data.feedbackToday,
      businessName: business?.name ?? ""
    }).catch(() => undefined);
  }, [user, home.data, business?.name]);

  async function markTip(tipKey: string) {
    if (!business) return;
    await apiData("/api/v1/growth", { method: "POST", body: JSON.stringify({ businessId: business.id, tipKey }) });
    await growth.refetch();
  }

  async function dismiss(id: string) {
    await apiData("/api/v1/announcements", { method: "POST", body: JSON.stringify({ id }) });
    await notes.refetch();
  }

  const actions = [
    { label: t.showQr, icon: QrCode, href: "/(app)/tap" },
    { label: t.addProduct, icon: ShoppingBag, href: "/(app)/menu" },
    { label: t.orders, icon: ClipboardList, href: "/(app)/orders" },
    { label: t.quickFeedback, icon: MessageSquare, href: "/(app)/feedback" },
    { label: t.sharePage, icon: Share2, href: "/(app)/tap" },
    { label: t.printStand, icon: Printer, href: "/(app)/shop" }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={home.isRefetching}
            onRefresh={() => {
              home.refetch().catch(() => undefined);
              growth.refetch().catch(() => undefined);
              notes.refetch().catch(() => undefined);
              analytics.refetch().catch(() => undefined);
              orders.refetch().catch(() => undefined);
              feedback.refetch().catch(() => undefined);
              client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "subscription") }).catch(() => undefined);
            }}
          />
        }
      >
        <View style={[styles.header, { backgroundColor: palette.header }]}>
          <Text style={[styles.hello, lang === "hi" && styles.hindi]}>{t.greeting}{user?.name ? `, ${user.name}` : ""}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher}>
            {businesses.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{ selected: item.id === business?.id }} onPress={() => choose(item.id)} style={[styles.biz, item.id === business?.id && styles.bizOn]}>
                <Text style={[styles.bizText, { color: item.id === business?.id ? "#1C1813" : "#F4EFE6" }, lang === "hi" && styles.hindi]}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {plan ? <Text style={styles.plan}>{plan.tier} · {plan.status}</Text> : null}
        </View>
        <View style={styles.filters}>
          <Chip label={live ? t.liveView : range === "7d" ? t.range7 : t.range30} selected={!live} onPress={() => { setLive(false); setRange(range === "7d" ? "30d" : "7d"); }} />
          <Chip label={t.liveView} tone="live" selected={live} onPress={() => setLive(true)} />
          <TextButton label={t.analytics} onPress={() => router.push("/(app)/analytics")} />
        </View>
        {home.isLoading ? (
          <View style={styles.kpis}><Skeleton height={110} width={148} /><Skeleton height={110} width={148} /></View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpis}>
            <KpiCard label={t.kpiScans} value={scans == null ? "…" : String(scans)} count={scans} trend={scanTrend} points={points} />
            <KpiCard label={t.kpiReviews} value={reviews == null ? "…" : String(reviews)} count={reviews} points={points.slice(0, 4)} />
            <KpiCard label={t.kpiOrders} value={orderCount == null ? "…" : String(orderCount)} count={orderCount} points={points.slice(0, 4)} />
            <KpiCard label={`${t.rupee} ${t.kpiSales}`} value={sales == null ? "—" : `${t.rupee}${Math.round(sales / 100)}`} count={sales == null ? null : Math.round(sales / 100)} prefix={sales == null ? undefined : t.rupee} points={points.slice(0, 4)} />
          </ScrollView>
        )}
        {growth.data ? (
          <Card>
            <View style={styles.noteHead}>
              <Text style={[styles.panelTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{growth.data.ready ? t.growthScore : t.gettingStarted}</Text>
              <Ring score={growth.data.ready ? growth.data.score ?? 0 : 0} track={palette.line} />
            </View>
            {growth.data.ready ? <Text style={[styles.hint, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.doThisWeek}</Text> : null}
            {(growth.data.ready ? growth.data.tips : growth.data.checklist).map((tip) => (
              <View key={tip.key} style={styles.tipRow}>
                <Pressable accessibilityRole="button" accessibilityLabel={lang === "hi" ? tip.titleHi : tip.titleEn} accessibilityState={{ checked: !!tip.done }} onPress={() => router.push(tip.appHref as Href)} style={styles.tipLink}>
                  <View style={styles.tipLine}>
                    {tip.done ? <Check color={palette.deep} size={16} strokeWidth={2} /> : null}
                    <Text style={[styles.tipText, { color: palette.ink, flexShrink: 1 }, lang === "hi" && styles.hindi]}>
                      {lang === "hi" ? tip.titleHi : tip.titleEn}
                    </Text>
                  </View>
                </Pressable>
                {growth.data?.ready ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={t.markDone} onPress={() => markTip(tip.key).catch(() => undefined)} style={[styles.done, { backgroundColor: palette.chip }]}>
                    <Text style={{ color: palette.ink, fontFamily: fonts.bodyStrong, fontSize: 12 }}>{t.markDone}</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}
        <View style={styles.grid}>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={action.label} onPress={() => router.push(action.href as Href)} style={[styles.action, { backgroundColor: palette.card, borderColor: palette.line }]}>
                <Icon color={palette.deep} size={22} strokeWidth={1.75} />
                <Text style={[styles.actionText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{action.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {(notes.data ?? []).map((note) => (
          <Card key={note.id}>
            <Text style={[styles.panelTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{lang === "hi" && note.titleHi ? note.titleHi : note.title}</Text>
            <Text style={[styles.hint, { color: palette.muted }, lang === "hi" && styles.hindi]}>{lang === "hi" && note.bodyHi ? note.bodyHi : note.body}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t.dismiss} onPress={() => dismiss(note.id).catch(() => undefined)} style={styles.tipLink}>
              <Text style={{ color: palette.deep, fontFamily: fonts.bodyStrong }}>{t.dismiss}</Text>
            </Pressable>
          </Card>
        ))}
        <Text style={[styles.panelTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.ordersToFulfil}</Text>
        {(orders.data?.items ?? []).length === 0 && (feedback.data?.items ?? []).length === 0 ? (
          <EmptyState icon={Sparkles} title={t.thatsIt} body={t.checkLater} action={t.addProduct} onAction={() => router.push("/(app)/menu")} />
        ) : (
          <>
            {(orders.data?.items ?? []).map((order) => (
              <Pressable key={order.id} accessibilityRole="button" accessibilityLabel={`#${order.number} ${order.status}`} onPress={() => router.push("/(app)/orders?tab=orders")} style={[styles.rowCard, { backgroundColor: palette.card }]}>
                <View style={[styles.avatar, { backgroundColor: palette.header }]}><Text style={styles.avatarText}>{(order.customerName || "?").slice(0, 1)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tipText, { color: palette.ink }]}>#{order.number} · {order.status}</Text>
                  <Text style={[styles.hint, { color: palette.muted }]}>{order.customerName} · {t.rupee}{Math.round(order.totalPaise / 100)}</Text>
                </View>
              </Pressable>
            ))}
            {(feedback.data?.items ?? []).map((row) => (
              <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`${row.review.rating} ${row.message}`} onPress={() => router.push("/(app)/feedback")} style={[styles.rowCard, { backgroundColor: palette.card }]}>
                <View style={[styles.avatar, { backgroundColor: palette.deep }]}><Text style={styles.avatarText}>{(row.review.customerName || "?").slice(0, 1)}</Text></View>
                <View style={{ flex: 1 }}>
                  <View style={styles.stars} accessibilityElementsHidden>
                    {Array.from({ length: Math.max(1, Math.min(5, row.review.rating)) }, (_, index) => (
                      <Star key={index} color={palette.star} size={14} fill={palette.star} strokeWidth={1.5} />
                    ))}
                  </View>
                  <Text style={[styles.hint, { color: palette.muted }]}>{row.message}</Text>
                </View>
              </Pressable>
            ))}
          </>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel={t.askReviews} onPress={() => router.push({ pathname: "/(app)/help", params: { q: t.askReviews } })} style={[styles.ask, { backgroundColor: palette.card, borderColor: palette.line }]}>
          <Sparkles color={palette.deep} size={18} strokeWidth={1.75} />
          <Text style={[styles.tipText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.askReviews}</Text>
        </Pressable>
        <TextButton label={t.addBusiness} onPress={() => router.push("/(app)/business-new")} />
        {business ? <TextButton label={business.name} onPress={() => router.push("/(app)/business-edit")} /> : null}
        {plan?.subscriptionEndsAt ? <Text style={[styles.hint, { color: palette.muted }]}>{plan.subscriptionEndsAt.slice(0, 10)}</Text> : null}
        {plan?.trialEndsAt && !plan.subscriptionEndsAt ? <Text style={[styles.hint, { color: palette.muted }]}>{plan.trialEndsAt.slice(0, 10)}</Text> : null}
      </ScrollView>
      <CoachTour
        screen="home"
        steps={[
          { title: t.coachHomeStats, body: t.coachHomeStatsBody, top: 168 },
          { title: t.coachHomeGrowth, body: t.coachHomeGrowthBody, top: 280 },
          { title: t.coachHomeActions, body: t.coachHomeActionsBody, top: 390 }
        ]}
      />
    </View>
  );
}

function Ring({ score, track }: { score: number; track: string }) {
  const radius = 22;
  const c = 2 * Math.PI * radius;
  const dash = c * (Math.max(0, Math.min(100, score)) / 100);
  return (
    <View style={{ width: 56, height: 56, alignItems: "center", justifyContent: "center" }}>
      <View style={{ transform: [{ rotate: "-90deg" }] }}>
        <Svg width={56} height={56}>
          <Circle cx={28} cy={28} r={radius} stroke={track} strokeWidth={5} fill="none" />
          <Circle cx={28} cy={28} r={radius} stroke="#0F7A37" strokeWidth={5} fill="none" strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
        </Svg>
      </View>
      <Text style={styles.ringText}>{Math.round(score)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120, gap: 14 },
  header: { padding: 20, paddingTop: 16, gap: 10, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  hello: { color: "#F4EFE6", fontFamily: fonts.display, fontSize: 28 },
  switcher: { gap: 8 },
  biz: { minHeight: 48, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  bizOn: { backgroundColor: "#F4EFE6" },
  bizText: { fontFamily: fonts.bodyStrong, color: "#1C1813" },
  plan: { color: "#F4EFE6", fontFamily: fonts.bodyStrong },
  filters: { flexDirection: "row", gap: 8, paddingHorizontal: 16, alignItems: "center", flexWrap: "wrap" },
  kpis: { paddingHorizontal: 16, gap: 10 },
  noteHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  panelTitle: { fontFamily: fonts.title, fontSize: 18, marginHorizontal: 16 },
  hint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipLink: { flex: 1, minHeight: 48, justifyContent: "center" },
  tipLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipText: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  done: { minHeight: 48, justifyContent: "center", paddingHorizontal: 12, borderRadius: 999 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16 },
  action: { width: "31%", minHeight: 88, borderRadius: 18, borderWidth: 1, alignItems: "flex-start", justifyContent: "center", padding: 12, gap: 8 },
  actionText: { fontFamily: fonts.bodyStrong, fontSize: 13, flexShrink: 1 },
  stars: { flexDirection: "row", gap: 2 },
  rowCard: { marginHorizontal: 16, borderRadius: 18, padding: 12, flexDirection: "row", gap: 10, alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontFamily: fonts.bodyStrong },
  ask: { marginHorizontal: 16, minHeight: 56, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  ringText: { position: "absolute", fontFamily: fonts.bodyStrong, fontSize: 12, color: "#1C1813" },
  hindi: { fontFamily: fonts.hindi }
});

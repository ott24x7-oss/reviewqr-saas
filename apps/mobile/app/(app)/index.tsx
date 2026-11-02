import { Screen } from "../../src/ui/screen";
import type { Dashboard, TapPage } from "@reviewqr/shared";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Bell, Check, ChevronDown, ChevronRight, ClipboardList, Package, Printer, QrCode, Share2, ShoppingBag, Star, Store, UserRound } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { homeChecklist, homePromoIndex, type HomeChecklistKey } from "../../src/home/checklist";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { useAgentMode } from "../../src/agent/mode-context";
import { fonts } from "../../src/theme";
import { BottomSheet, LoadErrorCard, Sparkline } from "../../src/ui/bits";
import { useTheme } from "../../src/ui/theme";
import { widgetPaletteFromPalette } from "../../src/widgets/format";
import { writeWidgetSnapshot } from "../../src/widgets/cache";

type Analytics = {
  summary: { scans: number; orders: number | null; orderPaise: number | null; feedback: number };
  trend: { day: string; scans: number; orders?: number | null; orderPaise?: number | null }[];
  modules: { store: boolean };
};
type OrderCard = { id: string; number: string; status: string; customerName: string; totalPaise: number };
type FeedbackRow = { id: string; message: string; status: string; review: { rating: number; customerName: string | null } };
type BookingCard = { id: string; customerName: string; serviceName: string; timeLabel: string; status: string };
type Product = { id: string; kind?: string };
type StoreSettings = { layout?: string };
type ShopOrder = { id: string; status: string; statusLabel: string };
type InboxSummary = { unread: number };
type Review = { id: string };

const PROMOS = ["unbranded", "refer", "reseller"] as const;
const CHECKLIST_KEYS: HomeChecklistKey[] = ["logo", "items", "stand", "review"];

function HomeScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { businesses, business, choose } = useBusiness();
  const { setMode } = useAgentMode();
  const [picker, setPicker] = useState(false);
  const [promoDay, setPromoDay] = useState<Date | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const userId = user?.id ?? "";
  const id = business?.id ?? "";
  const home = useQuery({
    queryKey: accountKey(userId, "dashboard", business?.id ?? "all"),
    enabled: !!user,
    queryFn: () => apiData<Dashboard>("/api/v1/dashboard" + (business ? "?businessId=" + business.id : ""))
  });
  const analytics = useQuery({
    queryKey: accountKey(userId, "analytics", id, "7d"),
    enabled: !!user && !!id,
    queryFn: () => apiData<Analytics>("/api/v1/analytics?businessId=" + id + "&range=7d", {}, { planSheet: false })
  });
  const notifications = useQuery({
    queryKey: accountKey(userId, "inbox"),
    enabled: !!user,
    queryFn: () => apiData<InboxSummary>("/api/v1/notifications")
  });
  const menu = useQuery({
    queryKey: accountKey(userId, "menu", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Product[] }>("/api/v1/businesses/" + id + "/menu?limit=50"),
    staleTime: 60_000
  });
  const store = useQuery({
    queryKey: accountKey(userId, "store", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<StoreSettings>("/api/v1/businesses/" + id + "/store", {}, { planSheet: false }),
    staleTime: 60_000
  });
  const shopOrders = useQuery({
    queryKey: accountKey(userId, "shop-orders"),
    enabled: !!user,
    queryFn: () => apiData<{ items: ShopOrder[] }>("/api/v1/shop/orders", {}, { planSheet: false }),
    staleTime: 60_000
  });
  const reviews = useQuery({
    queryKey: accountKey(userId, "reviews", id, ""),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Review[] }>("/api/v1/businesses/" + id + "/reviews"),
    staleTime: 60_000
  });
  const orders = useQuery({
    queryKey: accountKey(userId, "orders", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: OrderCard[] }>("/api/v1/orders?limit=5&businessId=" + id, {}, { planSheet: false })
  });
  const feedback = useQuery({
    queryKey: accountKey(userId, "feedback", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: FeedbackRow[] }>("/api/v1/feedback?limit=30&businessId=" + id, {}, { planSheet: false })
  });
  const serviceBusiness = store.data?.layout === "SERVICES" || (menu.data?.items ?? []).some((item) => item.kind === "SERVICE");
  const bookings = useQuery({
    queryKey: accountKey(userId, "bookings", id),
    enabled: !!user && !!id && serviceBusiness,
    queryFn: () => apiData<{ items: BookingCard[] }>("/api/v1/bookings?limit=5&businessId=" + id, {}, { planSheet: false })
  });
  const tap = useQuery({
    queryKey: accountKey(userId, "tap", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<TapPage>("/api/v1/businesses/" + id + "/tap"),
    staleTime: 60_000
  });

  useEffect(() => {
    const timer = setTimeout(() => setPromoDay(new Date()), 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!user || !home.data) return;
    writeWidgetSnapshot({
      loggedIn: true,
      scans: home.data.scansToday,
      orders: home.data.ordersToday,
      reviews: home.data.feedbackToday,
      businessName: business?.name ?? "",
      palette: widgetPaletteFromPalette(palette)
    }).catch(() => undefined);
  }, [user, home.data, business?.name, palette]);

  const points = useMemo(() => (analytics.data?.trend ?? []).map((row) => row.scans), [analytics.data?.trend]);
  const todayPoint = analytics.data?.trend.at(-1);
  const salesToday = analytics.data?.modules.store === false ? null : todayPoint?.orderPaise ?? null;
  const feedbackToReply = (feedback.data?.items ?? []).filter((row) => row.status === "NEW" || row.status === "IN_PROGRESS").slice(0, 3);
  const recentOrders = (orders.data?.items ?? []).slice(0, 3);
  const recentBookings = (bookings.data?.items ?? []).slice(0, 3);
  const checklist = homeChecklist({
    hasLogo: !!business?.logo,
    itemCount: menu.data?.items.length ?? 0,
    hasStandOrder: (shopOrders.data?.items ?? []).length > 0,
    hasReview: (reviews.data?.items.length ?? 0) > 0
  });
  const showChecklist = checklist.some((step) => !step.done);
  const promo = PROMOS[promoDay ? homePromoIndex(promoDay) : 0];
  const hello = (hour ?? 12) < 12 ? t.greetMorning : (hour ?? 12) < 17 ? t.greetAfternoon : t.greetEvening;

  useEffect(() => {
    const timer = setTimeout(() => setHour(new Date().getHours()), 0);
    return () => clearTimeout(timer);
  }, []);
  function refresh() {
    [home, analytics, notifications, menu, store, shopOrders, reviews, orders, feedback, bookings, tap].forEach((query) => {
      query.refetch().catch(() => undefined);
    });
  }

  function goToChecklist(key: HomeChecklistKey) {
    if (key === "logo") router.push("/(app)/business-edit");
    else if (key === "items") router.push(serviceBusiness ? "/(app)/services" : "/(app)/menu");
    else if (key === "stand") router.push("/(app)/shop");
    else router.push({ pathname: "/(app)/tap", params: { section: "qr" } });
  }

  async function sharePage() {
    const path = tap.data?.publicPath;
    const base = apiBaseUrl();
    if (!path || !base) {
      router.push({ pathname: "/(app)/tap", params: { section: "link" } });
      return;
    }
    await Share.share({ message: base + path }).catch(() => undefined);
  }

  function openPromo() {
    if (promo === "unbranded") router.push({ pathname: "/(app)/shop", params: { unbranded: "1" } });
    else if (promo === "refer") router.push("/(app)/refer");
    else if (user?.role === "AGENT") {
      setMode("agent");
      router.push("/(app)/agent-home");
    } else router.push("/(app)/agent-join");
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={refresh} />}
      >
        <View style={[styles.header, { backgroundColor: palette.header }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: palette.headerInk }, lang === "hi" && styles.hindi]}>
                {hello}{user?.name ? ", " + user.name : ""}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={business?.name || t.businesses} onPress={() => setPicker(true)} style={styles.switcher}>
                <Text style={[styles.businessName, { color: palette.headerInk }, lang === "hi" && styles.hindi]} numberOfLines={1}>
                  {business?.name || t.businesses}
                </Text>
                <ChevronDown color={palette.headerInk} size={18} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.notifications}
              onPress={() => router.push("/(app)/inbox")}
              style={[styles.bell, { borderColor: palette.headerInk }]}
            >
              <Bell color={palette.headerInk} size={22} />
              {(notifications.data?.unread ?? 0) > 0 ? <View style={[styles.bellDot, { backgroundColor: palette.primary }]} /> : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          {home.isError || analytics.isError ? <LoadErrorCard onRetry={refresh} /> : null}
          <View style={[styles.todayCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
            <View style={styles.cardHeading}>
              <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.todaySummary}</Text>
              {points.length > 1 && Math.min(...points) !== Math.max(...points) ? <Sparkline points={points} width={104} height={34} /> : null}
            </View>
            <View style={styles.metrics}>
              <Metric label={t.kpiScansToday} value={home.data ? String(home.data.scansToday) : "…"} icon={QrCode} />
              <Metric label={t.kpiReviews} value={home.data ? String(home.data.feedbackToday) : "…"} icon={Star} />
              <Metric label={t.kpiOrders} value={home.data ? String(home.data.ordersToday) : "…"} icon={ClipboardList} />
              <Metric label={t.kpiSales} value={salesToday == null ? "—" : t.rupee + Math.round(salesToday / 100)} icon={Store} />
            </View>
            <Text style={[styles.note, { color: palette.muted }, lang === "hi" && styles.hindi]}>
              {t.range7}{points.length ? " · " + points.reduce((sum, value) => sum + value, 0) + " " + t.scans.toLowerCase() : ""}
            </Text>
          </View>

          {showChecklist ? (
            <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
              <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.setupChecklistTitle}</Text>
              {CHECKLIST_KEYS.map((key, index) => {
                const step = checklist[index];
                const label = key === "logo" ? t.setupLogo : key === "items" ? serviceBusiness ? t.setupThreeServices : t.setupThreeItems : key === "stand" ? t.setupStand : t.setupFirstReview;
                const Icon = key === "logo" ? UserRound : key === "items" ? Store : key === "stand" ? Printer : Star;
                return (
                  <Pressable key={key} accessibilityRole="button" accessibilityState={{ checked: step.done }} onPress={() => goToChecklist(key)} style={styles.checkRow}>
                    <View style={[styles.checkMark, { backgroundColor: step.done ? palette.primary : palette.accentSoft }]}>
                      {step.done ? <Check color={palette.onPrimary} size={16} /> : <Icon color={palette.deep} size={16} />}
                    </View>
                    <Text style={[styles.rowTitle, { color: palette.ink }, step.done && { color: palette.muted }, lang === "hi" && styles.hindi]}>{label}</Text>
                    {!step.done ? <ChevronRight color={palette.muted} size={18} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <HomeAction label={t.showQr} icon={QrCode} onPress={() => router.push({ pathname: "/(app)/tap", params: { section: "qr" } })} palette={palette} />
            <HomeAction label={t.sharePage} icon={Share2} onPress={() => { void sharePage(); }} palette={palette} />
            <HomeAction label={t.orderStand} icon={ShoppingBag} onPress={() => router.push("/(app)/shop")} palette={palette} />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.liveSection}</Text>
          </View>
          <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
            <View style={styles.listHeading}>
              <Text style={[styles.listTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{serviceBusiness ? t.latestBookings : t.latestOrders}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t.seeAll} onPress={() => router.push(serviceBusiness ? "/(app)/bookings" : "/(app)/orders")} style={styles.seeAll}>
                <Text style={[styles.linkText, { color: palette.deep }, lang === "hi" && styles.hindi]}>{t.seeAll}</Text>
              </Pressable>
            </View>
            {serviceBusiness ? recentBookings.length ? recentBookings.map((row) => (
              <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={row.customerName + " " + row.serviceName} onPress={() => router.push({ pathname: "/(app)/booking-detail", params: { id: row.id } })} style={styles.liveRow}>
                <View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}><UserRound color={palette.deep} size={18} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: palette.ink }]}>{row.customerName}</Text>
                  <Text style={[styles.note, { color: palette.muted }]}>{row.serviceName}{row.timeLabel ? " · " + row.timeLabel : ""}</Text>
                </View>
                <ChevronRight color={palette.muted} size={18} />
              </Pressable>
            )) : <Text style={[styles.note, { color: palette.muted }]}>{t.noBookings}</Text> : recentOrders.length ? recentOrders.map((row) => (
              <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={"#" + row.number + " " + row.status} onPress={() => router.push({ pathname: "/(app)/order-detail", params: { id: row.id } })} style={styles.liveRow}>
                <View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}><ClipboardList color={palette.deep} size={18} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: palette.ink }]}>#{row.number} · {row.status}</Text>
                  <Text style={[styles.note, { color: palette.muted }]}>{row.customerName} · {t.rupee}{Math.round(row.totalPaise / 100)}</Text>
                </View>
                <ChevronRight color={palette.muted} size={18} />
              </Pressable>
            )) : <Text style={[styles.note, { color: palette.muted }]}>{t.emptyOrdersBody}</Text>}
          </View>

          <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
            <View style={styles.listHeading}>
              <Text style={[styles.listTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.reviewsToReply}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t.seeAll} onPress={() => router.push("/(app)/reviews")} style={styles.seeAll}>
                <Text style={[styles.linkText, { color: palette.deep }, lang === "hi" && styles.hindi]}>{t.seeAll}</Text>
              </Pressable>
            </View>
            {feedbackToReply.length ? feedbackToReply.map((row) => (
              <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={row.review.rating + " " + row.message} onPress={() => router.push("/(app)/reviews")} style={styles.liveRow}>
                <View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}><Star color={palette.deep} size={18} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: palette.ink }]}>{row.review.customerName || t.reviews} · {row.review.rating}/5</Text>
                  <Text style={[styles.note, { color: palette.muted }]} numberOfLines={2}>{row.message}</Text>
                </View>
                <ChevronRight color={palette.muted} size={18} />
              </Pressable>
            )) : <Text style={[styles.note, { color: palette.muted }]}>{t.emptyFeedbackBody}</Text>}
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel={promo === "unbranded" ? t.promoUnbrandedStand : promo === "refer" ? t.promoReferFreeMonths : t.promoBecomeReseller} onPress={openPromo} style={[styles.promo, { backgroundColor: palette.header }]}>
            <View style={[styles.promoIcon, { backgroundColor: palette.accentSoft }]}>
              {promo === "unbranded" ? <Package color={palette.deep} size={20} /> : promo === "refer" ? <Share2 color={palette.deep} size={20} /> : <UserRound color={palette.deep} size={20} />}
            </View>
            <Text style={[styles.promoText, { color: palette.headerInk }, lang === "hi" && styles.hindi]}>
              {promo === "unbranded" ? t.promoUnbrandedStand : promo === "refer" ? t.promoReferFreeMonths : t.promoBecomeReseller}
            </Text>
            <ChevronRight color={palette.headerInk} size={20} />
          </Pressable>
        </View>
      </ScrollView>
      <BottomSheet visible={picker} title={t.businesses} onClose={() => setPicker(false)}>
        {businesses.map((item) => (
          <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{ selected: item.id === business?.id }} onPress={() => { choose(item.id); setPicker(false); }} style={styles.pickerRow}>
            <Text style={[styles.rowTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{item.name}</Text>
            {item.id === business?.id ? <Check color={palette.deep} size={18} /> : null}
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" onPress={() => { setPicker(false); router.push("/(app)/business-new"); }} style={styles.pickerRow}>
          <Text style={[styles.linkText, { color: palette.deep }, lang === "hi" && styles.hindi]}>{t.addBusiness}</Text>
          <ChevronRight color={palette.muted} size={18} />
        </Pressable>
      </BottomSheet>
    </View>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof QrCode }) {
  const { palette } = useTheme();
  const { lang } = useI18n();
  return (
    <View style={styles.metric}>
      <Icon color={palette.muted} size={17} />
      <Text style={[styles.metricValue, { color: palette.ink }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.metricLabel, { color: palette.muted }, lang === "hi" && styles.hindi]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function HomeAction({ label, icon: Icon, onPress, palette }: { label: string; icon: typeof QrCode; onPress: () => void; palette: ReturnType<typeof useTheme>["palette"] }) {
  const { lang } = useI18n();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.action, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Icon color={palette.deep} size={20} />
      <Text style={[styles.actionText, { color: palette.ink }, lang === "hi" && styles.hindi]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 118 },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 50, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: { opacity: 0.82, fontFamily: fonts.bodyStrong, fontSize: 13 },
  switcher: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, alignSelf: "flex-start" },
  businessName: { fontFamily: fonts.display, fontSize: 19, flexShrink: 1 },
  bell: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  bellDot: { position: "absolute", top: 9, right: 10, width: 8, height: 8, borderRadius: 4 },
  body: { marginTop: -36, paddingHorizontal: 14, gap: 12 },
  todayCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  cardHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: fonts.title, fontSize: 19 },
  metrics: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  metric: { flex: 1, minWidth: 0, minHeight: 72, justifyContent: "center", gap: 4 },
  metricValue: { fontFamily: fonts.title, fontSize: 19 },
  metricLabel: { fontFamily: fonts.bodyStrong, fontSize: 11 },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  sectionCard: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 8 },
  checkRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10 },
  checkMark: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  rowTitle: { flex: 1, fontFamily: fonts.bodyStrong, fontSize: 14 },
  actionRow: { flexDirection: "row", gap: 8 },
  action: { flex: 1, minHeight: 68, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 4 },
  actionText: { fontFamily: fonts.bodyStrong, fontSize: 12, textAlign: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listHeading: { minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listTitle: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  seeAll: { minWidth: 48, minHeight: 44, alignItems: "flex-end", justifyContent: "center" },
  linkText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  liveRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  promo: { minHeight: 72, borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  promoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  promoText: { flex: 1, fontFamily: fonts.bodyStrong, fontSize: 15 },
  pickerRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hindi: { fontFamily: fonts.hindi }
});

export default function HomeScreen() {
  const { palette } = useTheme();
  return <Screen topInset statusBarColor={palette.header}><HomeScreenContent /></Screen>;
}

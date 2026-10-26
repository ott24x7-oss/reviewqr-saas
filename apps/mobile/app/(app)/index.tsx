import { Screen } from "../../src/ui/screen";
import type { Dashboard, FeatureId } from "@reviewqr/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect, type Href } from "expo-router";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Lock,
  MessageSquare,
  Plus,
  Printer,
  QrCode,
  Share2,
  Sparkles,
  Star
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { widgetPaletteFromPalette } from "../../src/widgets/format";
import { consumeSetupStep, nextSetupStep, SETUP_STEP_KEYS, type SetupStepKey } from "../../src/guide/setup";
import { SetupCompleteCard, SetupGuideCard, type SetupGuideStep } from "../../src/guide/setup-guide";
import { useI18n } from "../../src/i18n";
import { businessDestinations } from "../../src/nav/business-destinations";
import { accountKey } from "../../src/query/keys";
import { useReviewMoment } from "../../src/review/watch";
import { useBusiness } from "../../src/state/business";
import { openPlanLock, useFeatures } from "../../src/state/plan-lock";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { BottomSheet, Card, KpiCard, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { TextButton } from "../../src/ui/buttons";
import { rowTintFor } from "../../src/ui/rows";
import { useTheme } from "../../src/ui/theme";
import { writeWidgetSnapshot } from "../../src/widgets/cache";

type Tip = { key: string; titleEn: string; titleHi: string; appHref: string; done?: boolean };
type SetupStep = { key: string; done: boolean };
const EMPTY_SETUP: SetupStep[] = [];
const SETUP_FEATURES: Partial<Record<SetupStepKey, FeatureId>> = { menu: "menu", store: "store" };
type Growth = { ready: boolean; score: number | null; tips: Tip[]; checklist: Tip[]; setup?: SetupStep[] };
type Note = { id: string; title: string; titleHi: string; body: string; bodyHi: string; link: string };
type Analytics = {
  summary: { scans: number; orders: number | null; orderPaise: number | null; feedback: number };
  trend: { day: string; scans: number }[];
  modules: { store: boolean };
};
type OrderCard = { id: string; number: string; status: string; customerName: string; totalPaise: number };
type FeedbackRow = { id: string; message: string; review: { rating: number; customerName: string | null } };

function periodChange(points: number[]) {
  if (points.length < 2 || points[0] === 0) return null;
  const pct = Math.round(((points[points.length - 1] - points[0]) / Math.abs(points[0])) * 100);
  return pct === 0 ? null : pct;
}

function HomeScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { businesses, business, choose } = useBusiness();
  const { locked } = useFeatures();
  const client = useQueryClient();
  const [live, setLive] = useState(true);
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [picker, setPicker] = useState(false);
  const [growthOpen, setGrowthOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [expandedSetup, setExpandedSetup] = useState<SetupStepKey | null>(null);
  const [setupExpandedManually, setSetupExpandedManually] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const previousSetupDone = useRef<number | null>(null);
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
    queryFn: () => apiData<Analytics>(`/api/v1/analytics?businessId=${business?.id}&range=${range}`, {}, { planSheet: false })
  });
  const orders = useQuery({
    queryKey: accountKey(user?.id ?? "", "orders", business?.id),
    enabled: !!user && !!business,
    queryFn: () => apiData<{ items: OrderCard[] }>(`/api/v1/orders?limit=5&businessId=${business?.id}`, {}, { planSheet: false })
  });
  const feedback = useQuery({
    queryKey: accountKey(user?.id ?? "", "feedback", business?.id),
    enabled: !!user,
    queryFn: () => apiData<{ items: FeedbackRow[] }>(`/api/v1/feedback?limit=5${business ? `&businessId=${business.id}` : ""}`, {}, { planSheet: false })
  });
  const plan = home.data?.plan;
  const scans = live ? home.data?.scansToday : analytics.data?.summary.scans;
  const reviews = live ? home.data?.feedbackToday : analytics.data?.summary.feedback;
  const orderCount = live ? home.data?.ordersToday : analytics.data?.summary.orders;
  const sales = analytics.data?.modules.store === false ? null : analytics.data?.summary.orderPaise;
  const points = (analytics.data?.trend ?? []).map((row) => row.scans);
  const scanPct = periodChange(points);
  const scanTrend = scanPct == null ? "flat" : scanPct > 0 ? "up" : "down";
  const hour = new Date().getHours();
  const hello = hour < 12 ? t.greetMorning : hour < 17 ? t.greetAfternoon : t.greetEvening;
  const tasks = growth.data ? (growth.data.ready ? growth.data.tips : growth.data.checklist) : [];
  const setup = growth.data?.setup ?? EMPTY_SETUP;
  const setupDone = setup.filter((step) => step.done).length;
  const showSetup = setup.length > 0 && setupDone < setup.length;
  const growthBusinessId = business?.id;
  const growthUserId = user?.id;
  useFocusEffect(
    useCallback(() => {
      let focused = true;
      if (growthUserId && growthBusinessId) {
        client.invalidateQueries({ queryKey: accountKey(growthUserId, "growth", growthBusinessId) }).catch(() => undefined);
      }
      consumeSetupStep().then((next) => {
        if (!focused || !next) return;
        if (next === "first") {
          setSetupExpandedManually(false);
          setExpandedSetup(null);
        } else {
          setSetupExpandedManually(true);
          setExpandedSetup(next);
        }
      }).catch(() => undefined);
      return () => { focused = false; };
    }, [client, growthBusinessId, growthUserId])
  );
  const menuLocked = locked("menu");
  const storeLocked = locked("store");
  const setupRows = useMemo<SetupGuideStep[]>(() => {
    const rows: Record<SetupStepKey, Omit<SetupGuideStep, "done">> = {
      details: { key: "details", title: t.businessDetails, body: t.setupWhyDetails },
      link: { key: "link", title: t.pageLink, body: t.setupWhyLink },
      menu: { key: "menu", title: t.menuItems, body: t.setupWhyMenu },
      buttons: { key: "buttons", title: t.pageButtons, body: t.setupWhyButtons },
      store: { key: "store", title: t.storeHoursUpi, body: t.setupWhyStore },
      print: { key: "print", title: t.printYourQr, body: t.setupWhyPrint }
    };
    return SETUP_STEP_KEYS.map((key) => ({
      ...rows[key],
      done: setup.find((step) => step.key === key)?.done === true,
      locked: key === "menu" ? menuLocked : key === "store" ? storeLocked : false
    }));
  }, [menuLocked, setup, storeLocked, t]);
  const expandedSetupKey = showSetup
    ? setupExpandedManually ? expandedSetup : expandedSetup ?? setupRows.find((step) => !step.done)?.key ?? null
    : null;
  useEffect(() => {
    if (setup.length === 0) return;
    const previous = previousSetupDone.current;
    if (previous !== null && previous < setup.length && setupDone === setup.length) {
      setShowCelebration(true);
      const timeout = setTimeout(() => setShowCelebration(false), 5000);
      previousSetupDone.current = setupDone;
      return () => clearTimeout(timeout);
    }
    previousSetupDone.current = setupDone;
  }, [setup.length, setupDone]);
  const tiles = businessDestinations(t);
  const noteCount = (notes.data ?? []).length;
  const recentOrders = orders.data?.items ?? [];
  const recentFeedback = feedback.data?.items ?? [];
  useReviewMoment(recentOrders, recentFeedback, home.isError || orders.isError || feedback.isError);
  const quiet = recentOrders.length === 0 && recentFeedback.length === 0;
  const hasDashboardError = home.isError || growth.isError || notes.isError || analytics.isError || orders.isError || feedback.isError;

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

  async function markTip(tipKey: string) {
    if (!business) return;
    await apiData("/api/v1/growth", { method: "POST", body: JSON.stringify({ businessId: business.id, tipKey }) });
    await growth.refetch();
  }

  async function dismiss(id: string) {
    await apiData("/api/v1/announcements", { method: "POST", body: JSON.stringify({ id }) });
    await notes.refetch();
  }

  const actions: { label: string; icon: typeof QrCode; href: string; feature?: FeatureId }[] = [
    { label: t.showQr, icon: QrCode, href: "/(app)/tap" },
    { label: t.addItem, icon: Plus, href: "/(app)/menu", feature: "menu" },
    { label: t.orders, icon: ClipboardList, href: "/(app)/orders", feature: "orders" },
    { label: t.quickFeedback, icon: MessageSquare, href: "/(app)/feedback", feature: "reviews-log" },
    { label: t.sharePage, icon: Share2, href: "/(app)/tap" },
    { label: t.printStand, icon: Printer, href: "/(app)/shop" }
  ];
  function openHref(href: Href, feature?: FeatureId) {
    if (feature && locked(feature)) {
      openPlanLock(feature);
      return;
    }
    router.push(href);
  }

  function startSetup(key: SetupStepKey) {
    const feature = SETUP_FEATURES[key];
    if (feature && locked(feature)) {
      openPlanLock(feature);
      return;
    }
    const next = nextSetupStep(key);
    const route = key === "details" ? "/(app)/business-edit"
      : key === "menu" ? "/(app)/menu"
      : key === "store" ? "/(app)/store"
      : "/(app)/tap";
    const params = key === "buttons" ? { section: "buttons" }
      : key === "print" ? { section: "qr" }
      : key === "link" ? { section: "link" }
      : {};
    router.push({ pathname: route, params: { ...params, setupGuide: key, setupNext: next ?? "complete" } } as Href);
  }

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
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.hello, { color: palette.headerInk }, lang === "hi" && styles.hindi]}>
                {hello}{user?.name ? `, ${user.name}` : ""}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={business?.name || t.businesses}
                onPress={() => setPicker(true)}
                style={styles.switcher}
              >
                <Text
                  style={{
                    color: palette.headerInk,
                    fontFamily: lang === "hi" ? fonts.hindiStrong : fonts.bodyStrong,
                    fontSize: 19,
                    flexShrink: 1
                  }}
                  numberOfLines={1}
                >
                  {business?.name || t.businesses}
                </Text>
                <ChevronDown color={palette.headerInk} size={18} strokeWidth={2.2} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.dismiss}
              onPress={() => setNotesOpen(true)}
              style={[styles.bell, { borderColor: palette.headerInk }]}
            >
              <Bell color={palette.headerInk} size={22} strokeWidth={1.75} />
              {noteCount > 0 ? <View style={[styles.bellDot, { backgroundColor: palette.primary }]} /> : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.overlap}>
          {showSetup ? (
            <SetupGuideCard
              steps={setupRows}
              expandedKey={expandedSetupKey}
              onExpand={(key) => {
                setSetupExpandedManually(true);
                setExpandedSetup((current) => current === key ? null : key);
              }}
              onStart={startSetup}
            />
          ) : showCelebration ? <SetupCompleteCard /> : null}
          {hasDashboardError ? (
            <LoadErrorCard onRetry={() => {
              home.refetch().catch(() => undefined);
              growth.refetch().catch(() => undefined);
              notes.refetch().catch(() => undefined);
              analytics.refetch().catch(() => undefined);
              orders.refetch().catch(() => undefined);
              feedback.refetch().catch(() => undefined);
            }} />
          ) : null}
          <View style={[styles.segmentedControl, { backgroundColor: palette.chip, borderColor: palette.line }]}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: live }}
              accessibilityLabel={t.liveView}
              onPress={() => setLive(true)}
              style={[styles.segment, live && { backgroundColor: palette.primary }]}
            >
              <Text style={[styles.segmentText, { color: live ? palette.onPrimary : palette.ink }, lang === "hi" && styles.hindi]} numberOfLines={1}>{t.liveView}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: !live }}
              accessibilityLabel={range === "7d" ? t.range7 : t.range30}
              onPress={() => {
                if (live) setLive(false);
                else setRange((current) => current === "7d" ? "30d" : "7d");
              }}
              style={[styles.segment, !live && { backgroundColor: palette.primary }]}
            >
              <Text style={[styles.segmentText, { color: !live ? palette.onPrimary : palette.ink }, lang === "hi" && styles.hindi]} numberOfLines={1}>{range === "7d" ? t.range7 : t.range30}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={t.analytics}
              onPress={() => openHref("/(app)/analytics", "analytics")}
              style={styles.segment}
            >
              <Text style={[styles.segmentText, { color: palette.ink }, lang === "hi" && styles.hindi]} numberOfLines={1}>{t.analytics}</Text>
            </Pressable>
          </View>
          {home.isLoading ? (
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCell}><Skeleton height={118} /></View>
              <View style={styles.kpiCell}><Skeleton height={118} /></View>
              <View style={styles.kpiCell}><Skeleton height={118} /></View>
              <View style={styles.kpiCell}><Skeleton height={118} /></View>
            </View>
          ) : (
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCell}>
                <KpiCard
                  fill
                  icon={QrCode}
                  label={t.kpiScansToday}
                  value={scans == null ? "…" : String(scans)}
                  count={scans}
                  trend={scanTrend}
                  trendLabel={scanPct == null ? undefined : `${scanPct > 0 ? "↑" : "↓"} ${Math.abs(scanPct)}% ${t.trendVs}`}
                  points={points}
                />
              </View>
              <View style={styles.kpiCell}>
                <KpiCard
                  fill
                  icon={ClipboardList}
                  label={t.kpiOrders}
                  value={orderCount == null ? "…" : String(orderCount)}
                  count={orderCount}
                  points={points.slice(0, 4)}
                  trendLabel={sales == null ? undefined : `${t.rupee}${Math.round(sales / 100)}`}
                />
              </View>
              <View style={styles.kpiCell}>
                <KpiCard
                  fill
                  icon={Star}
                  label={t.kpiReviews}
                  value={reviews == null ? "…" : String(reviews)}
                  count={reviews}
                  points={points.slice(0, 4)}
                />
              </View>
              <View style={styles.kpiCell}>
                <KpiCard
                  fill
                  icon={Sparkles}
                  label={t.kpiSales}
                  value={sales == null ? "—" : `${t.rupee}${Math.round(sales / 100)}`}
                  count={sales == null ? null : Math.round(sales / 100)}
                  prefix={sales == null ? undefined : t.rupee}
                  points={points.slice(0, 4)}
                  trendLabel={orderCount == null ? undefined : `${orderCount} ${t.orders}`}
                />
              </View>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.bookingsToday}
            onPress={() => openHref("/(app)/bookings", "services-booking")}
            style={{ backgroundColor: palette.card, borderColor: palette.line, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 }}
          >
            <Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>
              {t.bookingsToday} · {home.data?.bookingsToday ?? 0}
            </Text>
            {(home.data?.todayBookings ?? []).map((row) => (
              <Text key={row.id} style={{ color: palette.ink, fontFamily: lang === "hi" ? fonts.hindi : fonts.body }}>
                {row.customerName} · {row.serviceName}{row.timeLabel ? ` · ${row.timeLabel}` : ""}
              </Text>
            ))}
          </Pressable>

          <Text style={[styles.section, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.quickActions}</Text>
          <View style={styles.actions}>
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <View key={action.label} style={styles.actionCell}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    onPress={() => openHref(action.href as Href, action.feature)}
                    style={[styles.action, { backgroundColor: palette.card, shadowColor: palette.ink }]}
                  >
                    <View>
                      <View style={[styles.ico, { backgroundColor: palette.accentSoft }]}>
                        <Icon color={palette.deep} size={20} strokeWidth={1.75} />
                      </View>
                      {action.feature && locked(action.feature) ? (
                        <View style={[styles.lockBadge, { backgroundColor: palette.card }]}>
                          <Lock color={palette.muted} size={11} strokeWidth={2.4} />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.actionText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{action.label}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Text style={[styles.section, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.yourBusiness}</Text>
          <View style={styles.actions}>
            {tiles.map((tile) => {
              const Icon = tile.icon;
              const colors = rowTintFor(tile.tint, palette);
              return (
                <View key={tile.key} style={styles.tileCell}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tile.title}
                    onPress={() => openHref(tile.href, tile.feature)}
                    style={[styles.tile, { backgroundColor: palette.card, shadowColor: palette.ink }]}
                  >
                    <View>
                      <View style={[styles.ico, { backgroundColor: colors.bg }]}>
                        <Icon color={colors.fg} size={20} strokeWidth={1.75} />
                      </View>
                      {tile.feature && locked(tile.feature) ? (
                        <View style={[styles.lockBadge, { backgroundColor: palette.card }]}>
                          <Lock color={palette.muted} size={11} strokeWidth={2.4} />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.tileText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{tile.title}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={styles.recentHeading}>
            <Text style={[styles.section, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.recentActivity}</Text>
            {growth.data ? <TextButton label={t.growthIdeas} onPress={() => setGrowthOpen(true)} /> : null}
          </View>
          {quiet ? (
            <View style={[styles.rowCard, { backgroundColor: palette.card, shadowColor: palette.ink }]}>
              <View style={[styles.ico, { backgroundColor: palette.accentSoft }]}>
                <Sparkles color={palette.deep} size={18} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.growthTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.thatsIt}</Text>
                <Text style={[styles.growthHint, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.checkLater}</Text>
              </View>
            </View>
          ) : (
            <>
              {recentOrders.map((order) => (
                <Pressable
                  key={order.id}
                  accessibilityRole="button"
                  accessibilityLabel={`#${order.number} ${order.status}`}
                  onPress={() => openHref("/(app)/orders?tab=orders", "orders")}
                  style={[styles.rowCard, { backgroundColor: palette.card, shadowColor: palette.ink }]}
                >
                  <View style={[styles.avatar, { backgroundColor: palette.header }]}>
                    <Text style={[styles.avatarText, { color: palette.headerInk }]}>{(order.customerName || "?").slice(0, 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.growthTitle, { color: palette.ink }]}>#{order.number} · {order.status}</Text>
                    <Text style={[styles.growthHint, { color: palette.muted }]}>
                      {order.customerName} · {t.rupee}{Math.round(order.totalPaise / 100)}
                    </Text>
                  </View>
                  {locked("orders") ? (
                    <Lock color={palette.muted} size={16} strokeWidth={2} />
                  ) : (
                    <ChevronRight color={palette.muted} size={16} strokeWidth={2} />
                  )}
                </Pressable>
              ))}
              {recentFeedback.map((row) => (
                <Pressable
                  key={row.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.review.rating} ${row.message}`}
                  onPress={() => openHref("/(app)/feedback", "reviews-log")}
                  style={[styles.rowCard, { backgroundColor: palette.card, shadowColor: palette.ink }]}
                >
                  <View style={[styles.avatar, { backgroundColor: palette.primaryDeep }]}>
                    <Text style={[styles.avatarText, { color: palette.headerInk }]}>{(row.review.customerName || "?").slice(0, 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.stars} accessibilityElementsHidden>
                      {Array.from({ length: Math.max(1, Math.min(5, row.review.rating)) }, (_, index) => (
                        <Star key={index} color={palette.star} size={14} fill={palette.star} strokeWidth={1.5} />
                      ))}
                    </View>
                    <Text style={[styles.growthHint, { color: palette.muted }]}>{row.message}</Text>
                  </View>
                  {locked("reviews-log") ? <Lock color={palette.muted} size={16} strokeWidth={2} /> : null}
                </Pressable>
              ))}
            </>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.askReviews}
            onPress={() => router.push({ pathname: "/(app)/help", params: { q: t.askReviews } })}
            style={[styles.rowCard, { backgroundColor: palette.card, shadowColor: palette.ink }]}
          >
            <View style={[styles.ico, { backgroundColor: palette.accentSoft }]}>
              <Sparkles color={palette.deep} size={18} strokeWidth={1.75} />
            </View>
            <Text style={[styles.growthTitle, { color: palette.ink, flex: 1 }, lang === "hi" && styles.hindi]}>{t.askReviews}</Text>
            <ChevronRight color={palette.muted} size={16} strokeWidth={2} />
          </Pressable>
        </View>
      </ScrollView>

      <BottomSheet visible={picker} title={t.businesses} onClose={() => setPicker(false)}>
        {businesses.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            accessibilityState={{ selected: item.id === business?.id }}
            onPress={() => {
              choose(item.id);
              setPicker(false);
            }}
            style={styles.sheetRow}
          >
            <Text style={[styles.growthTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{item.name}</Text>
            {item.id === business?.id ? <Check color={palette.deep} size={18} strokeWidth={2.4} /> : null}
          </Pressable>
        ))}
        {plan ? <Text style={[styles.growthHint, { color: palette.muted }]}>{plan.tier} · {plan.status}</Text> : null}
        {plan?.subscriptionEndsAt ? <Text style={[styles.growthHint, { color: palette.muted }]}>{plan.subscriptionEndsAt.slice(0, 10)}</Text> : null}
        {plan?.trialEndsAt && !plan.subscriptionEndsAt ? <Text style={[styles.growthHint, { color: palette.muted }]}>{plan.trialEndsAt.slice(0, 10)}</Text> : null}
        <TextButton label={t.addBusiness} onPress={() => { setPicker(false); router.push("/(app)/business-new"); }} />
        {business ? (
          <TextButton label={business.name} onPress={() => { setPicker(false); router.push("/(app)/business-edit"); }} />
        ) : null}
      </BottomSheet>

      <BottomSheet visible={growthOpen} title={growth.data?.ready ? t.growthScore : t.gettingStarted} onClose={() => setGrowthOpen(false)}>
        {growth.data?.ready ? <Text style={[styles.growthHint, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.doThisWeek}</Text> : null}
        {tasks.map((tip) => (
          <View key={tip.key} style={styles.tipRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={lang === "hi" ? tip.titleHi : tip.titleEn}
              accessibilityState={{ checked: !!tip.done }}
              onPress={() => {
                setGrowthOpen(false);
                router.push(tip.appHref as Href);
              }}
              style={styles.tipLink}
            >
              <View style={styles.tipLine}>
                {tip.done ? <Check color={palette.deep} size={16} strokeWidth={2} /> : null}
                <Text style={[styles.growthTitle, { color: palette.ink, flexShrink: 1 }, lang === "hi" && styles.hindi]}>
                  {lang === "hi" ? tip.titleHi : tip.titleEn}
                </Text>
              </View>
            </Pressable>
            {growth.data?.ready ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.markDone}
                onPress={() => markTip(tip.key).catch(() => undefined)}
                style={[styles.done, { backgroundColor: palette.chip }]}
              >
                <Text style={{ color: palette.ink, fontFamily: fonts.bodyStrong, fontSize: 12 }}>{t.markDone}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </BottomSheet>

      <BottomSheet visible={notesOpen} title={t.recentActivity} onClose={() => setNotesOpen(false)}>
        {noteCount === 0 ? <Text style={[styles.growthHint, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.checkLater}</Text> : null}
        {(notes.data ?? []).map((note) => (
          <Card key={note.id}>
            <Text style={[styles.growthTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>
              {lang === "hi" && note.titleHi ? note.titleHi : note.title}
            </Text>
            <Text style={[styles.growthHint, { color: palette.muted }, lang === "hi" && styles.hindi]}>
              {lang === "hi" && note.bodyHi ? note.bodyHi : note.body}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t.dismiss} onPress={() => dismiss(note.id).catch(() => undefined)} style={styles.tipLink}>
              <Text style={{ color: palette.deep, fontFamily: fonts.bodyStrong }}>{t.dismiss}</Text>
            </Pressable>
          </Card>
        ))}
      </BottomSheet>

    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 54, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  hello: { opacity: 0.78, fontFamily: fonts.bodyStrong, fontSize: 13 },
  switcher: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, alignSelf: "flex-start" },
  bizName: { fontFamily: fonts.display, fontSize: 19, flexShrink: 1 },
  bell: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  bellDot: { position: "absolute", top: 9, right: 10, width: 8, height: 8, borderRadius: 4 },
  overlap: { marginTop: -40, paddingHorizontal: 14, gap: 10 },
  segmentedControl: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 4, gap: 3 },
  segment: { flex: 1, minWidth: 0, minHeight: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  segmentText: { fontFamily: fonts.bodyStrong, fontSize: 11, textAlign: "center" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  kpiCell: { width: "50%", padding: 5 },
  recentHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tileCell: { width: "50%", padding: 5 },
  tile: {
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    minHeight: 72,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  tileText: { flex: 1, fontFamily: fonts.bodyStrong, fontSize: 13 },
  growthTitle: { fontFamily: fonts.bodyStrong, fontSize: 14 },
  growthHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, marginTop: 2 },
  section: { fontFamily: fonts.bodyStrong, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 4, marginLeft: 2 },
  actions: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  actionCell: { width: "33.33%", padding: 5 },
  action: {
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 6,
    minHeight: 92,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  ico: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  lockBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center"
  },
  actionText: { fontFamily: fonts.bodyStrong, fontSize: 12, textAlign: "center" },
  rowCard: {
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bodyStrong },
  stars: { flexDirection: "row", gap: 2 },
  sheetRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipLink: { flex: 1, minHeight: 48, justifyContent: "center" },
  tipLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  done: { minHeight: 48, justifyContent: "center", paddingHorizontal: 12, borderRadius: 999 },
  hindi: { fontFamily: fonts.hindi }
});

export default function HomeScreen() {
  const { palette } = useTheme();
  return (
    <Screen topInset statusBarColor={palette.header}><HomeScreenContent /></Screen>
  );
}

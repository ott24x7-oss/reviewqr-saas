import { Screen } from "../../src/ui/screen";
import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronRight, ClipboardList } from "lucide-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { CoachTour } from "../../src/guide/coach";
import { HelpButton } from "../../src/guide/help-sheet";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { trackAppEvent } from "../../src/analytics/events";
import { enqueueOrderStatus, isNetworkFailure } from "../../src/orders/queue";
import { noteOrderCompleted } from "../../src/review/prompt";
import { useReviewMoment } from "../../src/review/watch";
import { useBusiness } from "../../src/state/business";
import { hasModule, useEntitlement } from "../../src/state/entitlement";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, Chip, EmptyState, Skeleton } from "../../src/ui/bits";
import { Field, PillButton } from "../../src/ui/controls";
import { tapStrong } from "../../src/ui/haptics";
import { LockedModuleCard } from "../../src/ui/locked-module";
import { useTheme } from "../../src/ui/theme";

type Tab = "products" | "orders" | "feedback";
type Status = (typeof STATUSES)[number];

type Product = {
  id: string;
  name: string;
  pricePaise: number;
  available: boolean;
  variants?: { id: string }[];
};

type OrderCard = {
  id: string;
  number: string;
  status: string;
  totalPaise: number;
  customerName: string;
  items: { name: string; qty: number }[];
};

type FeedbackRow = {
  id: string;
  message: string;
  status: string;
  review: { rating: number; customerName: string | null; customerPhone: string | null };
};

const STATUSES = ["ACCEPTED", "PREPARING", "READY", "COMPLETED"] as const;

function kolkataDay(daysAgo: number) {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000 - daysAgo * 24 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function labelFor(status: string, t: { statusNew: string; statusPreparing: string; statusReady: string; statusDone: string }) {
  if (status === "ACCEPTED") return t.statusNew;
  if (status === "PREPARING") return t.statusPreparing;
  if (status === "READY") return t.statusReady;
  if (status === "COMPLETED") return t.statusDone;
  return status;
}

function nextStatus(status: string): Status | null {
  const index = STATUSES.indexOf(status as Status);
  if (index < 0 || index >= STATUSES.length - 1) return null;
  return STATUSES[index + 1];
}

function EnterRow({ index, drop, children }: { index: number; drop?: boolean; children: ReactNode }) {
  const { reduceMotion } = useTheme();
  const y = useSharedValue(reduceMotion ? 0 : drop ? -28 : 10);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    const delay = index < 8 ? index * 30 : 0;
    y.value = withDelay(delay, withSpring(0, { damping: 16 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
  }, [drop, index, opacity, reduceMotion, y]);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));
  return <Animated.View style={anim}>{children}</Animated.View>;
}

function SwipeAdvance({ hint, onAdvance, children }: { hint: string; onAdvance: () => void; children: ReactNode }) {
  const { palette, reduceMotion } = useTheme();
  const x = useSharedValue(0);
  const width = useSharedValue(1);
  const pan = Gesture.Pan()
    .activeOffsetX(16)
    .failOffsetY([-18, 18])
    .onUpdate((event) => {
      x.value = Math.max(0, event.translationX);
    })
    .onEnd(() => {
      const pass = x.value > width.value * 0.4;
      x.value = reduceMotion ? 0 : withSpring(0, { damping: 18 });
      if (pass) runOnJS(onAdvance)();
    });
  const card = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(event) => {
          width.value = event.nativeEvent.layout.width;
        }}
      >
        <View style={[styles.reveal, { backgroundColor: palette.primary }]}>
          <ChevronRight color={palette.onPrimary} size={22} strokeWidth={1.75} />
          <Text style={[styles.revealText, { color: palette.onPrimary }]}>{hint}</Text>
        </View>
        <Animated.View style={card}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

function OrdersScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string }>();
  const requested = params.tab === "orders" || params.tab === "feedback" || params.tab === "products" ? params.tab : null;
  const linkKey = requested ?? "";
  const [picked, setPicked] = useState<{ key: string; tab: Tab } | null>(null);
  const tab = picked?.key === linkKey ? picked.tab : (requested ?? "orders");
  function setTab(next: Tab) {
    setPicked({ key: linkKey, tab: next });
  }
  const [filter, setFilter] = useState<Status>("ACCEPTED");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [range, setRange] = useState<"all" | "today" | "week">("all");
  const [skeletonReady, setSkeletonReady] = useState(false);
  const entitlement = useEntitlement();
  const modules = entitlement.data?.modules;
  const id = business?.id;
  const userId = user?.id ?? "";
  const known = useRef<Set<string> | null>(null);
  const fresh = useRef<Set<string>>(new Set());
  const player = useRef<AudioPlayer | null>(null);

  const products = useQuery({
    queryKey: accountKey(userId, "menu", id),
    enabled: !!user && !!id && tab === "products",
    queryFn: () => apiData<{ items: Product[] }>(`/api/v1/businesses/${id}/menu?limit=50`)
  });
  const from = range === "all" ? "" : kolkataDay(range === "week" ? 6 : 0);
  const orders = useQuery({
    queryKey: accountKey(userId, "orders", id, range),
    enabled: !!user && !!id && tab === "orders",
    queryFn: () => apiData<{ items: OrderCard[] }>(`/api/v1/orders?limit=30${id ? `&businessId=${id}` : ""}${from ? `&from=${from}` : ""}`)
  });
  const feedback = useQuery({
    queryKey: accountKey(userId, "feedback", id),
    enabled: !!user && !!id && tab === "feedback",
    queryFn: () => apiData<{ items: FeedbackRow[] }>(`/api/v1/feedback?limit=30${id ? `&businessId=${id}` : ""}`)
  });

  const loading = tab === "products" ? products.isLoading : tab === "orders" ? orders.isLoading : feedback.isLoading;
  useReviewMoment(orders.data?.items ?? [], feedback.data?.items ?? [], Boolean(error) || orders.isError || feedback.isError);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSkeletonReady(true), 300);
    return () => {
      clearTimeout(timer);
      setSkeletonReady(false);
    };
  }, [loading]);
  const showSkeleton = loading && skeletonReady;

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
    const items = orders.data?.items;
    if (!items) return;
    if (known.current) {
      const arrived = items.filter((item) => !known.current?.has(item.id));
      for (const item of arrived) fresh.current.add(item.id);
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
  }, [orders.data]);

  async function run(path: string, body: unknown, key: string[]) {
    setError(null);
    try {
      await apiData(path, { method: "POST", body: JSON.stringify(body) });
      await client.invalidateQueries({ queryKey: key });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  async function addProduct() {
    if (!id) return;
    const priceRupees = Number(price);
    if (!name.trim() || !Number.isFinite(priceRupees)) return;
    await run(`/api/v1/businesses/${id}/menu`, { action: "item", name: name.trim(), priceRupees }, accountKey(userId, "menu", id));
    setName("");
    setPrice("");
  }

  async function fromPhoto(source: "camera" | "library") {
    if (!id) return;
    setError(null);
    const shot =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4, mediaTypes: ["images"] })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.4, mediaTypes: ["images"] });
    if (shot.canceled || !shot.assets[0]?.base64) return;
    try {
      const data = await apiData<{ item: { name?: string } }>(`/api/v1/businesses/${id}/menu/snap`, {
        method: "POST",
        body: JSON.stringify({ image: `data:image/jpeg;base64,${shot.assets[0].base64}` })
      });
      if (data.item.name) setName(data.item.name);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Type the name and price");
    }
  }

  async function toggle(item: Product) {
    if (!id) return;
    const available = !item.available;
    await run(`/api/v1/businesses/${id}/menu`, { action: "update", id: item.id, available }, accountKey(userId, "menu", id));
    for (const variant of item.variants || []) {
      await run(
        `/api/v1/businesses/${id}/menu`,
        { action: "variant-update", id: variant.id, inStock: available },
        accountKey(userId, "menu", id)
      );
    }
  }

  function rememberStatus(orderId: string, status: string) {
    client.setQueryData(accountKey(userId, "orders", id || ""), (current: { items: OrderCard[] } | undefined) => {
      if (!current?.items) return current;
      return { ...current, items: current.items.map((item) => (item.id === orderId ? { ...item, status } : item)) };
    });
  }

  async function queueStatus(orderId: string, status: string) {
    await enqueueOrderStatus({ orderId, status });
    rememberStatus(orderId, status);
    if (status === "COMPLETED") void noteOrderCompleted(false);
  }

  async function setOrderStatus(orderId: string, status: string) {
    setError(null);
    try {
      const net = await import("expo-network");
      const state = await net.getNetworkStateAsync();
      if (state.isConnected === false || state.isInternetReachable === false) {
        await queueStatus(orderId, status);
        return;
      }
    } catch {
      // A missing network module still tries the request.
    }
    try {
      await apiData(`/api/v1/orders/${orderId}/status`, { method: "POST", body: JSON.stringify({ status }) });
      void trackAppEvent("order_status_changed");
      await client.invalidateQueries({ queryKey: accountKey(userId, "orders", id || "") });
      if (status === "COMPLETED") void noteOrderCompleted(false);
    } catch (err) {
      if (isNetworkFailure(err)) {
        await queueStatus(orderId, status);
        return;
      }
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  async function draftReply(row: FeedbackRow) {
    setError(null);
    setReply(null);
    try {
      const data = await apiData<{ publicReply: string; whatsappReply: string }>(`/api/v1/feedback/${row.id}/reply-draft`, {
        method: "POST"
      });
      setReply(data.publicReply);
      const phone = (row.review.customerPhone || "").replace(/\D/g, "");
      if (phone.length >= 8) {
        await Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(data.whatsappReply)}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "A reply draft isn't available right now.");
    }
  }

  async function resolve(row: FeedbackRow) {
    setError(null);
    try {
      await apiData(`/api/v1/feedback/${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "RESOLVED" }) });
      await client.invalidateQueries({ queryKey: accountKey(userId, "feedback", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  const menuLocked = !!(modules && !hasModule(modules, "MENU"));
  const storeLocked = !!(modules && !hasModule(modules, "STORE"));
  const reviewsLocked = !!(modules && !hasModule(modules, "REVIEWS"));
  const locked = tab === "products" ? menuLocked : tab === "orders" ? storeLocked : reviewsLocked;
  const orderRows = (orders.data?.items ?? []).filter((order) => order.status === filter);
  const listData: (Product | OrderCard | FeedbackRow)[] = locked
    ? []
    : tab === "products"
      ? (products.data?.items ?? [])
      : tab === "orders"
        ? orderRows
        : (feedback.data?.items ?? []);

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={[styles.screenTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.orders}</Text>
        <HelpButton title={t.coachOrdersFilter} body={t.coachOrdersSwipeBody} />
      </View>
      <View style={styles.row}>
        {(["orders", "products", "feedback"] as const).map((item) => (
          <Chip
            key={item}
            label={item === "products" ? t.products : item === "orders" ? t.orders : t.feedback}
            selected={tab === item}
            onPress={() => setTab(item)}
          />
        ))}
      </View>
      {tab === "orders" && !locked ? (
        <View style={styles.row}>
          {(["today", "week", "all"] as const).map((item) => (
            <Chip
              key={item}
              label={item === "today" ? t.dateToday : item === "week" ? t.dateWeek : t.dateAll}
              selected={range === item}
              onPress={() => setRange(item)}
            />
          ))}
          {STATUSES.map((status) => (
            <Chip key={status} label={labelFor(status, t)} selected={filter === status} onPress={() => setFilter(status)} />
          ))}
        </View>
      ) : null}
      {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
      {locked ? <LockedModuleCard moduleId={tab === "products" ? "MENU" : tab === "orders" ? "STORE" : "REVIEWS"} /> : null}
      {tab === "products" && !locked ? (
        <KeyboardAwareScrollView style={styles.inlineFormScroll} contentContainerStyle={styles.stack} keyboardShouldPersistTaps="handled" bottomOffset={12}>
          <Field label={t.name} tone="paper" value={name} onChangeText={setName} />
          <Field label={t.price} tone="paper" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <PillButton label={t.quickAdd} onPress={addProduct} disabled={!name.trim() || !price.trim()} hint={t.hintNamePrice} tone="dark" />
          <PillButton label={t.photo} onPress={() => fromPhoto("camera")} tone="outline" />
          <PillButton label={t.gallery} onPress={() => fromPhoto("library")} tone="outline" />
        </KeyboardAwareScrollView>
      ) : null}
      {showSkeleton ? (
        <View style={styles.stack}>
          <Skeleton height={88} />
          <Skeleton height={88} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper }]}>
      <FlashList
        data={showSkeleton || locked ? [] : listData}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listPad}
        ListEmptyComponent={
          locked || showSkeleton || loading ? null : tab === "orders" ? (
            <EmptyState icon={ClipboardList} title={t.emptyOrdersTitle} body={t.emptyOrdersBody} />
          ) : tab === "products" ? (
            <EmptyState icon={ClipboardList} title={t.emptyMenuTitle} body={t.emptyMenuBody} action={t.quickAdd} onAction={addProduct} />
          ) : (
            <EmptyState icon={ClipboardList} title={t.emptyFeedbackTitle} body={t.emptyFeedbackBody} />
          )
        }
        renderItem={({ item, index }) => {
          if (tab === "products") {
            const product = item as Product;
            return (
              <EnterRow index={index}>
                <Card style={styles.gap}>
                  <Text style={[styles.title, { color: palette.ink }]}>{product.name}</Text>
                  <Text style={[styles.note, { color: palette.muted }]}>₹{Math.round(product.pricePaise / 100)}</Text>
                  <PillButton
                    label={product.available ? t.available : t.inStock}
                    tone={product.available ? "dark" : "outline"}
                    onPress={() => toggle(product)}
                  />
                  <PillButton
                    label={t.duplicate}
                    tone="outline"
                    onPress={() =>
                      id &&
                      run(
                        `/api/v1/businesses/${id}/menu`,
                        { action: "duplicate", id: product.id, kind: "item" },
                        accountKey(userId, "menu", id)
                      )
                    }
                  />
                </Card>
              </EnterRow>
            );
          }
          if (tab === "feedback") {
            const row = item as FeedbackRow;
            return (
              <EnterRow index={index}>
                <SwipeAdvance hint={t.resolved} onAdvance={() => resolve(row)}>
                  <Card style={styles.gap}>
                    <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>
                      {row.review.customerName || t.feedback} · {row.review.rating}
                    </Text>
                    <Text style={[styles.note, { color: palette.muted }]}>{row.message}</Text>
                    {reply ? <Text style={[styles.note, { color: palette.ink }]}>{reply}</Text> : null}
                    <View style={styles.row}>
                      <Chip label={t.replyThanks} onPress={() => draftReply(row)} />
                      <Chip label={t.replySorry} onPress={() => draftReply(row)} />
                      <Chip label={t.replyOnIt} onPress={() => draftReply(row)} />
                    </View>
                    <PillButton label={t.reply} onPress={() => draftReply(row)} tone="dark" />
                    <PillButton label={t.resolved} tone="outline" onPress={() => resolve(row)} />
                  </Card>
                </SwipeAdvance>
              </EnterRow>
            );
          }
          const order = item as OrderCard;
          const upcoming = nextStatus(order.status);
          const action =
            order.status === "ACCEPTED" ? t.acceptOrder : order.status === "PREPARING" ? t.markReady : order.status === "READY" ? t.statusDone : "";
          return (
            <EnterRow index={index} drop={fresh.current.has(order.id)}>
              <SwipeAdvance hint={action || t.viewDetails} onAdvance={() => (upcoming ? setOrderStatus(order.id, upcoming) : router.push({ pathname: "/(app)/order-detail", params: { id: order.id } }))}>
                <Card style={styles.gap}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: palette.ink }]}>#{order.number}</Text>
                    <View style={[styles.status, { backgroundColor: palette.chip }]}>
                      <Text style={[styles.statusText, { color: palette.deep }]}>{labelFor(order.status, t)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.note, { color: palette.muted }]}>
                    {order.customerName} · ₹{Math.round(order.totalPaise / 100)}
                  </Text>
                  <Text style={[styles.note, { color: palette.ink }]}>{order.items.map((line) => `${line.qty} ${line.name}`).join(", ")}</Text>
                  <View style={styles.track}>
                    {STATUSES.map((status, step) => (
                      <View
                        key={status}
                        style={[
                          styles.trackDot,
                          { backgroundColor: STATUSES.indexOf(order.status as Status) >= step ? palette.primary : palette.line }
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.row}>
                    {STATUSES.map((status) => (
                      <Chip key={status} label={labelFor(status, t)} selected={order.status === status} onPress={() => setOrderStatus(order.id, status)} />
                    ))}
                  </View>
                  {upcoming ? <PillButton label={action} onPress={() => setOrderStatus(order.id, upcoming)} tone="dark" /> : null}
                  <PillButton label={t.viewDetails} tone="outline" onPress={() => router.push({ pathname: "/(app)/order-detail", params: { id: order.id } })} />
                </Card>
              </SwipeAdvance>
            </EnterRow>
          );
        }}
      />

      {tab === "orders" ? (
        <CoachTour
          screen="orders"
          steps={[
            { title: t.coachOrdersFilter, body: t.coachOrdersFilterBody, top: 120 },
            { title: t.coachOrdersSwipe, body: t.coachOrdersSwipeBody, top: 280 }
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listPad: { padding: 16, paddingBottom: 120 },
  header: { gap: 12, marginBottom: 12 },
  stack: { gap: 12 },
  inlineFormScroll: { flexGrow: 0, maxHeight: 280 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  screenTitle: { fontFamily: fonts.display, fontSize: 28 },
  title: { fontFamily: fonts.title, fontSize: 17 },
  note: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  error: { fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi },
  gap: { marginBottom: 12 },
  status: { borderRadius: 999, paddingHorizontal: 10, minHeight: 28, justifyContent: "center" },
  statusText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  track: { flexDirection: "row", gap: 6 },
  trackDot: { flex: 1, height: 6, borderRadius: 99 },
  reveal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 12,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    gap: 6
  },
  revealText: { color: "#FFFFFF", fontFamily: fonts.bodyStrong },
  detail: { position: "absolute", left: 16, right: 16, bottom: 16, gap: 8 }
});

export default function OrdersScreen() {
  return (
    <Screen topInset={true}><OrdersScreenContent /></Screen>
  );
}

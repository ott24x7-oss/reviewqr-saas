import type { BillingSummary, ShopOrderDetail } from "@reviewqr/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { pollPayment } from "../../src/shop/poll";
import { cartPaise } from "../../src/shop/totals";
import { colors, fonts } from "../../src/theme";
import { Field, PillButton } from "../../src/ui/controls";

type Tab = "catalogue" | "orders" | "plan";

type Variant = { sku: string; name: string; salePaise: number; ships: boolean; minQty: number };
type Product = {
  name: string;
  needsDesign: boolean;
  defaultTemplateId: string | null;
  variants: Variant[];
};
type LocalLine = { sku: string; name: string; qty: number; unitPaise: number; ships: boolean; templateId: string | null };
type OrderRow = { id: string; status: string; statusLabel: string; paymentStatus: string; totalPaise: number };

const sellPlans = process.env.EXPO_PUBLIC_SELL_PLANS === "1";

function linkedTab(tab: string | undefined, order: string | undefined): Tab {
  if (order) return "orders";
  if (tab === "plan" || tab === "orders" || tab === "catalogue") return tab;
  return "catalogue";
}

function rupees(paise: number) {
  return `₹${Math.round(paise / 100)}`;
}

export default function ShopScreen() {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string; order?: string }>();
  const tabParam = typeof params.tab === "string" ? params.tab : undefined;
  const orderParam = typeof params.order === "string" ? params.order : "";
  const linkKey = `${tabParam ?? ""}|${orderParam}`;
  const [pickedTab, setPickedTab] = useState<{ key: string; tab: Tab } | null>(null);
  const [pickedOrder, setPickedOrder] = useState<{ key: string; id: string | null } | null>(null);
  const tab = pickedTab?.key === linkKey ? pickedTab.tab : linkedTab(tabParam, orderParam || undefined);
  const openId = pickedOrder?.key === linkKey ? pickedOrder.id : orderParam || null;
  function setTab(next: Tab) {
    setPickedTab({ key: linkKey, tab: next });
  }
  function setOpenId(id: string | null) {
    setPickedOrder({ key: linkKey, id });
  }
  const [lines, setLines] = useState<LocalLine[]>([]);
  const [address, setAddress] = useState({ name: "", phone: "", line1: "", city: "", state: "", pincode: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const pollAbort = useRef<AbortController | null>(null);
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      pollAbort.current?.abort();
    };
  }, []);

  const userId = user?.id ?? "";
  const catalog = useQuery({
    queryKey: accountKey(userId, "shop-catalog"),
    enabled: !!user,
    queryFn: () => apiData<{ items: Product[] }>("/api/v1/shop/catalog")
  });
  const orders = useQuery({
    queryKey: accountKey(userId, "shop-orders"),
    enabled: !!user && tab === "orders",
    queryFn: () => apiData<{ items: OrderRow[] }>("/api/v1/shop/orders")
  });
  const detail = useQuery({
    queryKey: accountKey(userId, "shop-order", openId),
    enabled: !!user && !!openId,
    queryFn: () => apiData<ShopOrderDetail>(`/api/v1/shop/orders/${openId}`)
  });
  const billing = useQuery({
    queryKey: accountKey(userId, "billing"),
    enabled: !!user && tab === "plan",
    queryFn: () => apiData<BillingSummary>("/api/v1/billing/summary")
  });

  function add(product: Product) {
    const variant = product.variants[0];
    if (!variant) return;
    setLines((current) => {
      const found = current.find((line) => line.sku === variant.sku);
      if (found) return current.map((line) => (line.sku === variant.sku ? { ...line, qty: line.qty + 1 } : line));
      return [
        ...current,
        {
          sku: variant.sku,
          name: variant.name || product.name,
          qty: Math.max(1, variant.minQty || 1),
          unitPaise: variant.salePaise,
          ships: variant.ships,
          templateId: product.needsDesign ? product.defaultTemplateId : null
        }
      ];
    });
  }

  function sleepWhilePolling(ms: number, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error("aborted"));
        return;
      }
      const timer = setTimeout(finish, ms);
      function finish() {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }
      function onAbort() {
        clearTimeout(timer);
        reject(new Error("aborted"));
      }
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  async function pay() {
    if (busy || pendingOrderId) return;
    setBusy(true);
    setError(null);
    try {
      let addressId: string | undefined;
      if (lines.some((line) => line.ships)) {
        const saved = await apiData<{ id: string }>("/api/v1/shop/addresses", {
          method: "POST",
          body: JSON.stringify({ ...address, isDefault: true })
        });
        addressId = saved.id;
      }
      await apiData("/api/v1/shop/cart", {
        method: "PUT",
        body: JSON.stringify({
          businessId: business?.id ?? null,
          addressId: addressId ?? null,
          lines: lines.map((line) => ({
            sku: line.sku,
            qty: line.qty,
            design:
              line.templateId && business
                ? { templateId: line.templateId, businessId: business.id }
                : undefined
          }))
        })
      });
      const checkout = await apiData<{ orderId: string; paid: boolean; checkoutUrl: string | null }>("/api/v1/shop/checkout", {
        method: "POST"
      });
      setPendingOrderId(checkout.orderId);
      if (checkout.checkoutUrl) {
        await WebBrowser.openBrowserAsync(checkout.checkoutUrl).catch(() => undefined);
      }
      pollAbort.current?.abort();
      const controller = new AbortController();
      pollAbort.current = controller;
      const outcome = checkout.paid
        ? "paid"
        : await pollPayment({
            orderId: checkout.orderId,
            signal: controller.signal,
            fetchOrder: (id) => apiData<ShopOrderDetail>(`/api/v1/shop/orders/${id}`),
            sleep: (ms) => sleepWhilePolling(ms, controller.signal)
          });
      if (!live.current || outcome === "stopped") return;
      setLines([]);
      setOpenId(checkout.orderId);
      setTab("orders");
      if (outcome === "pending") setError(t.paymentPending);
      else setPendingOrderId(null);
      await client.invalidateQueries({ queryKey: accountKey(userId, "shop-orders") });
    } catch (err) {
      if (!live.current) return;
      setError(err instanceof ApiError ? err.message : "Could not start payment");
    } finally {
      if (live.current) setBusy(false);
    }
  }

  const plan = billing.data?.plan;
  const needsAddress = lines.some((line) => line.ships);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        {(["catalogue", "orders", "plan"] as const).map((item) => (
          <Pressable key={item} onPress={() => setTab(item)} style={[styles.chip, tab === item && styles.chipOn]}>
            <Text style={[styles.chipText, tab === item && styles.chipOnText, lang === "hi" && styles.hindi]}>
              {item === "catalogue" ? t.catalogue : item === "orders" ? t.orders : t.plans}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {tab === "catalogue" ? (
        <View style={styles.stack}>
          {(catalog.data?.items ?? []).map((product) => (
            <Pressable key={product.name} style={styles.card} onPress={() => add(product)}>
              <Text style={styles.title}>{product.name}</Text>
              <Text style={styles.note}>{product.variants[0] ? rupees(product.variants[0].salePaise) : ""}</Text>
            </Pressable>
          ))}
          <Text style={[styles.title, lang === "hi" && styles.hindi]}>
            {t.cart} · {rupees(cartPaise(lines))}
          </Text>
          {lines.map((line) => (
            <Text key={line.sku} style={styles.note}>
              {line.qty} × {line.name}
            </Text>
          ))}
          {needsAddress ? (
            <View style={styles.stack}>
              <Field label={t.name} tone="paper" value={address.name} onChangeText={(name) => setAddress({ ...address, name })} />
              <Field label={t.phone} tone="paper" value={address.phone} onChangeText={(phone) => setAddress({ ...address, phone })} keyboardType="phone-pad" />
              <Field label={t.address} tone="paper" value={address.line1} onChangeText={(line1) => setAddress({ ...address, line1 })} />
              <Field label={t.city} tone="paper" value={address.city} onChangeText={(city) => setAddress({ ...address, city })} />
              <Field label="State" tone="paper" value={address.state} onChangeText={(state) => setAddress({ ...address, state })} />
              <Field label={t.pincode} tone="paper" value={address.pincode} onChangeText={(pincode) => setAddress({ ...address, pincode })} keyboardType="number-pad" />
            </View>
          ) : null}
          <PillButton label={t.checkout} onPress={pay} disabled={busy || lines.length === 0 || !!pendingOrderId} tone="dark" />
        </View>
      ) : null}
      {tab === "orders" ? (
        <View style={styles.stack}>
          {(orders.data?.items ?? []).map((order) => (
            <Pressable key={order.id} style={styles.card} onPress={() => setOpenId(order.id)}>
              <Text style={styles.title}>{order.statusLabel || order.status}</Text>
              <Text style={styles.note}>
                {rupees(order.totalPaise)} · {order.paymentStatus}
              </Text>
            </Pressable>
          ))}
          {detail.data ? (
            <View style={styles.card}>
              <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.tracking}</Text>
              {detail.data.timeline.map((event) => (
                <Text key={`${event.at}-${event.label}`} style={styles.note}>
                  {event.at.slice(0, 16).replace("T", " ")} · {event.label}
                </Text>
              ))}
              {detail.data.status === "DELIVERED" ? (
                <PillButton
                  label={t.reprint}
                  tone="outline"
                  onPress={() =>
                    apiData(`/api/v1/shop/orders/${detail.data!.id}/reprint`, {
                      method: "POST",
                      body: JSON.stringify({ reason: "damage" })
                    })
                      .then(() => client.invalidateQueries({ queryKey: accountKey(userId, "shop-order", detail.data!.id) }))
                      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not ask for a reprint"))
                  }
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
      {tab === "plan" ? (
        <View style={styles.stack}>
          <Text style={[styles.note, lang === "hi" && styles.hindi]}>{sellPlans ? t.plansFlag : t.plansWeb}</Text>
          <View style={styles.card}>
            <Text style={styles.title}>{plan?.tier || "…"}</Text>
            <Text style={styles.note}>{plan?.status}</Text>
            <Text style={styles.note}>{(plan?.subscriptionEndsAt || plan?.trialEndsAt || "").slice(0, 10)}</Text>
          </View>
          <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.planHistory}</Text>
          {(billing.data?.history ?? []).map((row) => (
            <Text key={row.id} style={styles.note}>
              {row.createdAt.slice(0, 10)} · {row.tier} · {rupees(row.amountPaise)} · {row.status}
            </Text>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12 },
  stack: { gap: 12 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, borderRadius: 999, paddingHorizontal: 14, justifyContent: "center", backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.bodyStrong, color: colors.ink },
  chipOnText: { color: colors.white },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 6 },
  title: { fontFamily: fonts.title, fontSize: 18, color: colors.ink },
  note: { fontFamily: fonts.body, color: colors.inkSoft },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { hasModule, useEntitlement } from "../../src/state/entitlement";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";
import { Field, PillButton } from "../../src/ui/controls";
import { LockedModuleCard } from "../../src/ui/locked-module";

type Tab = "products" | "orders" | "feedback";

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

export default function OrdersScreen() {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const params = useLocalSearchParams<{ tab?: string }>();
  const requested = params.tab === "orders" || params.tab === "feedback" || params.tab === "products" ? params.tab : null;
  const linkKey = requested ?? "";
  const [picked, setPicked] = useState<{ key: string; tab: Tab } | null>(null);
  const tab = picked?.key === linkKey ? picked.tab : (requested ?? "products");
  function setTab(next: Tab) {
    setPicked({ key: linkKey, tab: next });
  }
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const entitlement = useEntitlement();
  const modules = entitlement.data?.modules;
  const id = business?.id;
  const userId = user?.id ?? "";

  const products = useQuery({
    queryKey: accountKey(userId, "menu", id),
    enabled: !!user && !!id && tab === "products",
    queryFn: () => apiData<{ items: Product[] }>(`/api/v1/businesses/${id}/menu?limit=50`)
  });
  const orders = useQuery({
    queryKey: accountKey(userId, "orders", id),
    enabled: !!user && !!id && tab === "orders",
    queryFn: () => apiData<{ items: OrderCard[] }>(`/api/v1/orders?limit=30${id ? `&businessId=${id}` : ""}`)
  });
  const feedback = useQuery({
    queryKey: accountKey(userId, "feedback", id),
    enabled: !!user && !!id && tab === "feedback",
    queryFn: () => apiData<{ items: FeedbackRow[] }>(`/api/v1/feedback?limit=30${id ? `&businessId=${id}` : ""}`)
  });

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

  async function fromPhoto() {
    if (!id) return;
    setError(null);
    const shot = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.4, mediaTypes: ["images"] });
    if (shot.canceled || !shot.assets[0]?.base64) return;
    try {
      const data = await apiData<{ item: { name?: string; description?: string; category?: string; veg?: string } }>(
        `/api/v1/businesses/${id}/menu/snap`,
        { method: "POST", body: JSON.stringify({ image: `data:image/jpeg;base64,${shot.assets[0].base64}` }) }
      );
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
      await run(`/api/v1/businesses/${id}/menu`, { action: "variant-update", id: variant.id, inStock: available }, accountKey(userId, "menu", id));
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
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(data.whatsappReply)}`;
        await Linking.openURL(url);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "A reply draft isn't available right now.");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        {(["products", "orders", "feedback"] as const).map((item) => (
          <Pressable key={item} onPress={() => setTab(item)} style={[styles.chip, tab === item && styles.chipOn]}>
            <Text style={[styles.chipText, tab === item && styles.chipTextOn, lang === "hi" && styles.hindi]}>
              {item === "products" ? t.products : item === "orders" ? t.orders : t.feedback}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {tab === "products" && modules && !hasModule(modules, "MENU") ? <LockedModuleCard moduleId="MENU" /> : null}
      {tab === "products" && (!modules || hasModule(modules, "MENU")) ? (
        <View style={styles.stack}>
          <Field label={t.name} tone="paper" value={name} onChangeText={setName} />
          <Field label={t.price} tone="paper" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <PillButton label={t.quickAdd} onPress={addProduct} disabled={!name.trim() || !price.trim()} tone="dark" />
          <PillButton label={t.photo} onPress={fromPhoto} tone="outline" />
          {(products.data?.items ?? []).map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.note}>₹{Math.round(item.pricePaise / 100)}</Text>
              <PillButton label={item.available ? t.available : t.inStock} tone={item.available ? "dark" : "outline"} onPress={() => toggle(item)} />
              <PillButton
                label={t.duplicate}
                tone="outline"
                onPress={() => id && run(`/api/v1/businesses/${id}/menu`, { action: "duplicate", id: item.id, kind: "item" }, accountKey(userId, "menu", id))}
              />
            </View>
          ))}
        </View>
      ) : null}
      {tab === "orders" && modules && !hasModule(modules, "STORE") ? <LockedModuleCard moduleId="STORE" /> : null}
      {tab === "orders" && (!modules || hasModule(modules, "STORE"))
        ? (orders.data?.items ?? []).map((order) => (
            <View key={order.id} style={styles.card}>
              <Text style={styles.title}>#{order.number}</Text>
              <Text style={styles.note}>
                {order.customerName} · ₹{Math.round(order.totalPaise / 100)} · {order.status}
              </Text>
              <Text style={styles.note}>{order.items.map((item) => `${item.qty} ${item.name}`).join(", ")}</Text>
              <View style={styles.row}>
                {STATUSES.map((status) => (
                  <Pressable
                    key={status}
                    style={styles.chip}
                    onPress={() => run(`/api/v1/orders/${order.id}/status`, { status }, accountKey(userId, "orders", id || ""))}
                  >
                    <Text style={styles.chipText}>{status}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        : null}
      {tab === "feedback" && modules && !hasModule(modules, "REVIEWS") ? <LockedModuleCard moduleId="REVIEWS" /> : null}
      {tab === "feedback" && (!modules || hasModule(modules, "REVIEWS"))
        ? (feedback.data?.items ?? []).map((row) => (
            <View key={row.id} style={styles.card}>
              <Text style={styles.title}>
                {row.review.customerName || t.feedback} · {row.review.rating}
              </Text>
              <Text style={styles.note}>{row.message}</Text>
              {reply ? <Text style={styles.note}>{reply}</Text> : null}
              <PillButton label={t.reply} onPress={() => draftReply(row)} tone="dark" />
              <PillButton
                label={t.resolved}
                tone="outline"
                onPress={() =>
                  apiData(`/api/v1/feedback/${row.id}`, { method: "PATCH", body: JSON.stringify({ status: "RESOLVED" }) })
                    .then(() => client.invalidateQueries({ queryKey: accountKey(userId, "feedback", id) }))
                    .catch((err) => setError(err instanceof ApiError ? err.message : "Could not save"))
                }
              />
            </View>
          ))
        : null}
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
  chipText: { fontFamily: fonts.bodyStrong, color: colors.ink, fontSize: 13 },
  chipTextOn: { color: colors.white },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 8 },
  title: { fontFamily: fonts.title, fontSize: 18, color: colors.ink },
  note: { fontFamily: fonts.body, color: colors.inkSoft },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

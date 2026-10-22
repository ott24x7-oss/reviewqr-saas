import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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

type Product = { id: string; name: string; pricePaise: number };

export default function MenuTab() {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { business } = useBusiness();
  const entitlement = useEntitlement();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = business?.id;
  const modules = entitlement.data?.modules;
  const items = useQuery({
    queryKey: accountKey(user?.id ?? "", "menu", id),
    enabled: !!user && !!id && (!modules || hasModule(modules, "MENU")),
    queryFn: () => apiData<{ items: Product[] }>(`/api/v1/businesses/${id}/menu?limit=50`)
  });

  async function add() {
    if (!id) return;
    const priceRupees = Number(price);
    if (!name.trim() || !Number.isFinite(priceRupees)) return;
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/menu`, {
        method: "POST",
        body: JSON.stringify({ action: "item", name: name.trim(), priceRupees })
      });
      setName("");
      setPrice("");
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "menu", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.menuTab}</Text>
      {modules && !hasModule(modules, "MENU") ? <LockedModuleCard moduleId="MENU" /> : null}
      {!modules || hasModule(modules, "MENU") ? (
        <View style={styles.stack}>
          <Field label={t.name} tone="paper" value={name} onChangeText={setName} />
          <Field label={t.price} tone="paper" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <PillButton label={t.quickAdd} onPress={add} disabled={!name.trim() || !price.trim()} tone="dark" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {(items.data?.items ?? []).map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.note}>₹{Math.round(item.pricePaise / 100)}</Text>
            </View>
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
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 6 },
  title: { fontFamily: fonts.title, fontSize: 18, color: colors.ink },
  note: { fontFamily: fonts.body, color: colors.inkSoft },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

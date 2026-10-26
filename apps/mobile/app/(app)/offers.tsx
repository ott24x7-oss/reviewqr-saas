import { Screen } from "../../src/ui/screen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card } from "../../src/ui/bits";
import { Field, PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";

type Coupon = { id: string; code: string; kind: string; amount: number; active: boolean };
type Banner = { id: string; title: string; body: string; active: boolean };

function OffersScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const id = business?.id;
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const coupons = useQuery({
    queryKey: accountKey(user?.id ?? "", "coupons", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Coupon[] }>(`/api/v1/businesses/${id}/coupons`)
  });
  const banners = useQuery({
    queryKey: accountKey(user?.id ?? "", "banners", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Banner[] }>(`/api/v1/businesses/${id}/offers`)
  });

  async function post(payload: object, key: string) {
    if (!id) return;
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/offers`, { method: "POST", body: JSON.stringify(payload) });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", key, id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.offers}</Text>
      <Field label={t.couponCode} tone="paper" value={code} onChangeText={setCode} autoCapitalize="characters" />
      <Field label="%" tone="paper" value={percent} onChangeText={setPercent} keyboardType="number-pad" />
      <PillButton label={t.addItem} tone="dark" disabled={code.trim().length < 3} onPress={() => post({ action: "coupon", code, kind: "PERCENT", amount: Number(percent) || 10 }, "coupons")} />
      {(coupons.data?.items ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.name, { color: palette.ink }]}>{row.code} · {row.kind} {row.amount}</Text>
          <PillButton label={row.active ? t.hidePublic : t.showPublic} tone="outline" onPress={() => post({ action: "coupon-update", id: row.id, active: !row.active }, "coupons")} />
        </Card>
      ))}
      <Field label={t.bannerTitle} tone="paper" value={title} onChangeText={setTitle} />
      <Field label={t.internalNote} tone="paper" value={body} onChangeText={setBody} />
      <PillButton label={t.addItem} tone="dark" disabled={title.trim().length < 2} onPress={() => post({ action: "banner", title, body }, "banners")} />
      {(banners.data?.items ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.name, { color: palette.ink }]}>{row.title}</Text>
          <Text style={[styles.note, { color: palette.muted }]}>{row.body}</Text>
          <PillButton label={row.active ? t.hidePublic : t.showPublic} tone="outline" onPress={() => post({ action: "banner-update", id: row.id, active: !row.active }, "banners")} />
        </Card>
      ))}
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  note: { fontFamily: fonts.body, fontSize: 14 },
  card: { gap: 6 },
  hindi: { fontFamily: fonts.hindi }
});

export default function OffersScreen() {
  return (
    <Screen topInset={true}><OffersScreenContent /></Screen>
  );
}

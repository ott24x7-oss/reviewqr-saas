import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Screen } from "../../src/ui/screen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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

type Review = { id: string; rating: number; customerName: string; staff: string; location: string; createdAt: string; redirected: boolean };
type Testimonial = { id: string; authorName: string; rating: number; message: string; isPublic: boolean };
type Hint = { id: string; content: string };

function ReviewsScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const id = business?.id;
  const [rating, setRating] = useState("");
  const [hint, setHint] = useState("");
  const [services, setServices] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reviews = useQuery({
    queryKey: accountKey(user?.id ?? "", "reviews", id, rating),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Review[] }>(`/api/v1/businesses/${id}/reviews${rating ? `?rating=${rating}` : ""}`)
  });
  const quotes = useQuery({
    queryKey: accountKey(user?.id ?? "", "testimonials", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Testimonial[] }>(`/api/v1/businesses/${id}/testimonials`)
  });
  const hints = useQuery({
    queryKey: accountKey(user?.id ?? "", "hints", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Hint[] }>(`/api/v1/businesses/${id}/hints`)
  });
  const ai = useQuery({
    queryKey: accountKey(user?.id ?? "", "ai", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ enabled: boolean; services: string }>(`/api/v1/businesses/${id}/ai`)
  });

  async function run(task: () => Promise<unknown>, key: string) {
    if (!id) return;
    setError(null);
    try {
      await task();
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", key, id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  return (
    <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.reviews}</Text>
      <View style={styles.row}>
        {["", "5", "4", "3", "2", "1"].map((score) => (
          <Pressable key={score || "all"} accessibilityRole="button" onPress={() => setRating(score)} style={[styles.chip, { borderColor: palette.line, backgroundColor: rating === score ? palette.primary : palette.card }]}>
            <Text style={{ color: rating === score ? palette.onPrimary : palette.ink, fontFamily: fonts.bodyStrong }}>{score || t.dateAll}</Text>
          </Pressable>
        ))}
      </View>
      {(reviews.data?.items ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.name, { color: palette.ink }]}>{row.rating} · {row.customerName || t.reviews}</Text>
          <Text style={[styles.note, { color: palette.muted }]}>{[row.staff, row.location, row.createdAt.slice(0, 10)].filter(Boolean).join(" · ")}</Text>
        </Card>
      ))}
      <Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.testimonials}</Text>
      {(quotes.data?.items ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.name, { color: palette.ink }]}>{row.authorName} · {row.rating}</Text>
          <Text style={[styles.note, { color: palette.muted }]}>{row.message}</Text>
          <PillButton
            label={row.isPublic ? t.hidePublic : t.showPublic}
            tone="outline"
            onPress={() => run(() => apiData(`/api/v1/businesses/${id}/testimonials`, { method: "POST", body: JSON.stringify({ id: row.id, isPublic: !row.isPublic }) }), "testimonials")}
          />
        </Card>
      ))}
      <Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.topicHints}</Text>
      <Field label={t.topicHints} tone="paper" value={hint} onChangeText={setHint} />
      <PillButton label={t.addItem} tone="dark" disabled={hint.trim().length < 2} onPress={() => run(async () => { await apiData(`/api/v1/businesses/${id}/hints`, { method: "POST", body: JSON.stringify({ content: hint.trim() }) }); setHint(""); }, "hints")} />
      {(hints.data?.items ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.note, { color: palette.ink }]}>{row.content}</Text>
          <PillButton label={t.removeItem} tone="outline" onPress={() => run(() => apiData(`/api/v1/businesses/${id}/hints?hintId=${row.id}`, { method: "DELETE" }), "hints")} />
        </Card>
      ))}
      <Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.aiReviews}</Text>
      <Field label={t.servicesHint} tone="paper" value={services || ai.data?.services || ""} onChangeText={setServices} />
      <PillButton
        label={ai.data?.enabled ? t.hidePublic : t.aiReviews}
        tone="dark"
        onPress={() => run(() => apiData(`/api/v1/businesses/${id}/ai`, { method: "PUT", body: JSON.stringify({ enabled: !ai.data?.enabled, services: services || ai.data?.services || "" }) }), "ai")}
      />
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  section: { fontFamily: fonts.bodyStrong, fontSize: 18, marginTop: 8 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  note: { fontFamily: fonts.body, fontSize: 14 },
  card: { gap: 6 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  hindi: { fontFamily: fonts.hindi }
});

export default function ReviewsScreen() {
  return (
    <Screen topInset={true}><ReviewsScreenContent /></Screen>
  );
}

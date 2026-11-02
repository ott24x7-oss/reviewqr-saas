import { Screen } from "../../src/ui/screen";
import { FeatureGate } from "../../src/state/plan-lock";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Star, MessageSquareQuote, QrCode } from "lucide-react-native";
import { useState } from "react";
import { apiBaseUrl } from "../../src/api/instance";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, EmptyState, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { Field, PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";

type Review = { id: string; rating: number; customerName: string | null; staff: string; location: string; createdAt: string; redirected: boolean };
type Testimonial = { id: string; authorName: string; rating: number; message: string; isPublic: boolean };
type FeedbackRow = { id: string; message: string; status: string; review: { rating: number; customerName: string | null; customerPhone: string | null } };
type Analytics = {
  summary: { scans: number; avgRating: number | null };
  ratings: Record<string, number>;
};
type Hint = { id: string; content: string };
type TapPage = { publicPath?: string | null };

function ReviewsScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const id = business?.id ?? "";
  const userId = user?.id ?? "";
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [services, setServices] = useState("");
  const reviews = useQuery({
    queryKey: accountKey(userId, "reviews", id, ""),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Review[] }>("/api/v1/businesses/" + id + "/reviews")
  });
  const feedback = useQuery({
    queryKey: accountKey(userId, "feedback", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: FeedbackRow[] }>("/api/v1/feedback?limit=30&businessId=" + id)
  });
  const testimonials = useQuery({
    queryKey: accountKey(userId, "testimonials", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Testimonial[] }>("/api/v1/businesses/" + id + "/testimonials")
  });
  const hints = useQuery({
    queryKey: accountKey(userId, "hints", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Hint[] }>("/api/v1/businesses/" + id + "/hints")
  });
  const ai = useQuery({
    queryKey: accountKey(userId, "ai", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ enabled: boolean; services: string }>("/api/v1/businesses/" + id + "/ai")
  });
  const analytics = useQuery({
    queryKey: accountKey(userId, "analytics", id, range),
    enabled: !!user && !!id,
    queryFn: () => apiData<Analytics>("/api/v1/analytics?businessId=" + id + "&range=" + range, {}, { planSheet: false })
  });
  const tap = useQuery({
    queryKey: accountKey(userId, "tap", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<TapPage>("/api/v1/businesses/" + id + "/tap")
  });
  const waiting = (feedback.data?.items ?? []).filter((row) => row.status === "NEW" || row.status === "IN_PROGRESS");
  const ratings = Object.values(analytics.data?.ratings ?? {}).reduce((sum, count) => sum + count, 0);
  const average = analytics.data?.summary.avgRating ?? (
    (reviews.data?.items.length ?? 0) > 0
      ? reviews.data!.items.reduce((sum, row) => sum + row.rating, 0) / reviews.data!.items.length
      : null
  );
  const scans = analytics.data?.summary.scans ?? 0;
  const conversion = scans > 0 ? Math.round((ratings / scans) * 100) : 0;
  const reviewLink = business?.googleReviewUrl || (tap.data?.publicPath && apiBaseUrl() ? apiBaseUrl() + tap.data.publicPath : "");

  async function askOnWhatsApp() {
    if (!reviewLink) {
      router.push({ pathname: "/(app)/tap", params: { section: "link" } });
      return;
    }
    const message = t.askForReviews + ": " + reviewLink;
    await Linking.openURL("https://wa.me/?text=" + encodeURIComponent(message)).catch(() => Share.share({ message }).catch(() => undefined));
  }

  async function replyTo(row: FeedbackRow) {
    setError(null);
    try {
      const reply = await apiData<{ whatsappReply: string }>("/api/v1/feedback/" + row.id + "/reply-draft", { method: "POST" });
      const phone = (row.review.customerPhone || "").replace(/\D/g, "");
      if (phone.length >= 8) await Linking.openURL("https://wa.me/" + phone + "?text=" + encodeURIComponent(reply.whatsappReply));
      else await Share.share({ message: reply.whatsappReply });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not draft a reply");
    }
  }

  async function resolve(row: FeedbackRow) {
    setError(null);
    try {
      await apiData("/api/v1/feedback/" + row.id, { method: "PATCH", body: JSON.stringify({ status: "RESOLVED" }) });
      await client.invalidateQueries({ queryKey: accountKey(userId, "feedback", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  async function save(task: () => Promise<unknown>, key: string) {
    if (!id) return;
    setError(null);
    try {
      await task();
      await client.invalidateQueries({ queryKey: accountKey(userId, key, id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  return (
    <KeyboardAwareScrollView style={[styles.screen, { backgroundColor: palette.paper }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={12}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.reviews}</Text>
      <View style={[styles.summary, { backgroundColor: palette.card, borderColor: palette.line }]}>
        <View style={styles.ratingHead}>
          <Star color={palette.star} fill={palette.star} size={23} />
          <Text style={[styles.rating, { color: palette.ink }]}>{average == null ? "—" : average.toFixed(1)}</Text>
          <Text style={[styles.muted, { color: palette.muted }]}>{ratings} {t.reviews.toLowerCase()}</Text>
        </View>
        <Text style={[styles.muted, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.scansToReviews} · {scans} → {ratings} · {conversion}%</Text>
        <View style={styles.rangeRow}>
          {(["7d", "30d"] as const).map((item) => {
            const selected = range === item;
            const label = item === "7d" ? t.range7 : t.range30;
            return (
              <Pressable key={item} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => setRange(item)} style={[styles.rangeChip, { backgroundColor: selected ? palette.primary : palette.chip, borderColor: palette.line }]}>
                <Text style={[styles.rangeText, { color: selected ? palette.onPrimary : palette.ink }, lang === "hi" && styles.hindi]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.askCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
        <Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.askForReviews}</Text>
        <PillButton label={t.askForReviews} onPress={() => { void askOnWhatsApp(); }} tone="dark" />
        <PillButton label={t.showQr} onPress={() => router.push({ pathname: "/(app)/tap", params: { section: "qr" } })} tone="outline" />
      </View>

      <View style={styles.sectionHead}>
        <Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.feedbackTab}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t.seeAll} onPress={() => router.push("/(app)/feedback")} style={styles.seeAll}>
          <Text style={[styles.link, { color: palette.deep }, lang === "hi" && styles.hindi]}>{t.seeAll}</Text>
        </Pressable>
      </View>
      {feedback.isLoading ? <><Skeleton height={90} /><Skeleton height={90} /></> : null}
      {feedback.isError ? <LoadErrorCard onRetry={() => feedback.refetch().catch(() => undefined)} /> : null}
      {!feedback.isLoading && !feedback.isError && waiting.length === 0 ? (
        <EmptyState icon={QrCode} title={t.emptyFeedbackTitle} body={t.emptyFeedbackBody} action={t.showQr} onAction={() => router.push({ pathname: "/(app)/tap", params: { section: "qr" } })} />
      ) : null}
      {waiting.slice(0, 6).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.cardTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{row.review.customerName || t.feedback} · {row.review.rating}/5</Text>
          <Text style={[styles.muted, { color: palette.muted }]}>{row.message}</Text>
          <View style={styles.feedbackActions}>
            <PillButton label={t.reply} tone="outline" onPress={() => { void replyTo(row); }} />
            <PillButton label={t.resolved} tone="outline" onPress={() => { void resolve(row); }} />
          </View>
        </Card>
      ))}

      <Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.reviews}</Text>
      {reviews.isLoading ? <><Skeleton height={72} /><Skeleton height={72} /></> : null}
      {reviews.isError ? <LoadErrorCard onRetry={() => reviews.refetch().catch(() => undefined)} /> : null}
      {!reviews.isLoading && !reviews.isError && (reviews.data?.items ?? []).length === 0 ? (
        <EmptyState icon={Star} title={t.emptyReviewsTitle} body={t.emptyReviewsBody} action={t.shareWhatsapp} onAction={() => { void askOnWhatsApp(); }} />
      ) : null}
      {(reviews.data?.items ?? []).slice(0, 5).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.cardTitle, { color: palette.ink }]}>{row.rating} · {row.customerName || t.reviews}</Text>
          <Text style={[styles.muted, { color: palette.muted }]}>{[row.staff, row.location, row.createdAt.slice(0, 10)].filter(Boolean).join(" · ")}</Text>
        </Card>
      ))}

      <Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.testimonials}</Text>
      {testimonials.isLoading ? <><Skeleton height={72} /><Skeleton height={72} /></> : null}
      {testimonials.isError ? <LoadErrorCard onRetry={() => testimonials.refetch().catch(() => undefined)} /> : null}
      {(testimonials.data?.items ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.cardTitle, { color: palette.ink }]}>{row.authorName} · {row.rating}</Text>
          <Text style={[styles.muted, { color: palette.muted }]}>{row.message}</Text>
          <PillButton label={row.isPublic ? t.hidePublic : t.showPublic} tone="outline" onPress={() => save(() => apiData("/api/v1/businesses/" + id + "/testimonials", { method: "POST", body: JSON.stringify({ id: row.id, isPublic: !row.isPublic }) }), "testimonials")} />
        </Card>
      ))}
      {!testimonials.isLoading && !testimonials.isError && (testimonials.data?.items ?? []).length === 0 ? (
        <EmptyState icon={MessageSquareQuote} title={t.emptyTestimonialsTitle} body={t.emptyTestimonialsBody} action={t.showQr} onAction={() => router.push({ pathname: "/(app)/tap", params: { section: "qr" } })} />
      ) : null}

      <Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.topicHints}</Text>
      <Field label={t.topicHints} tone="paper" value={hint} onChangeText={setHint} />
      <PillButton label={t.addHint} tone="outline" disabled={hint.trim().length < 2} onPress={() => save(async () => {
        await apiData("/api/v1/businesses/" + id + "/hints", { method: "POST", body: JSON.stringify({ content: hint.trim() }) });
        setHint("");
      }, "hints")} />
      {hints.isLoading ? <Skeleton height={58} /> : null}
      {(hints.data?.items ?? []).map((row) => <Card key={row.id} style={styles.card}><Text style={[styles.muted, { color: palette.ink }]}>{row.content}</Text><PillButton label={t.removeItem} tone="outline" onPress={() => save(() => apiData("/api/v1/businesses/" + id + "/hints?hintId=" + row.id, { method: "DELETE" }), "hints")} /></Card>)}
      <Field label={t.servicesHint} tone="paper" value={services || ai.data?.services || ""} onChangeText={setServices} />
      <PillButton label={ai.data?.enabled ? t.hidePublic : t.aiReviews} tone="outline" onPress={() => save(() => apiData("/api/v1/businesses/" + id + "/ai", { method: "PUT", body: JSON.stringify({ enabled: !ai.data?.enabled, services: services || ai.data?.services || "" }) }), "ai")} />
      {error ? <Text style={[styles.muted, { color: palette.danger }]}>{error}</Text> : null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  summary: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 10 },
  ratingHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  rating: { fontFamily: fonts.title, fontSize: 25 },
  muted: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  rangeRow: { flexDirection: "row", gap: 8 },
  rangeChip: { minWidth: 64, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 999, paddingHorizontal: 12 },
  rangeText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  askCard: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 8 },
  section: { fontFamily: fonts.bodyStrong, fontSize: 18 },
  sectionHead: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seeAll: { minWidth: 48, minHeight: 44, justifyContent: "center", alignItems: "flex-end" },
  link: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  card: { gap: 6 },
  cardTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  feedbackActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  hindi: { fontFamily: fonts.hindi }
});

export default function ReviewsScreen() {
  return <FeatureGate id="reviews-log"><Screen topInset><ReviewsScreenContent /></Screen></FeatureGate>;
}

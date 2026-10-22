import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { hasModule, useEntitlement } from "../../src/state/entitlement";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";
import { LockedModuleCard } from "../../src/ui/locked-module";

type FeedbackRow = {
  id: string;
  message: string;
  review: { rating: number; customerName: string | null };
};

export default function FeedbackTab() {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { business } = useBusiness();
  const entitlement = useEntitlement();
  const modules = entitlement.data?.modules;
  const id = business?.id;
  const rows = useQuery({
    queryKey: accountKey(user?.id ?? "", "feedback", id),
    enabled: !!user && (!modules || hasModule(modules, "REVIEWS")),
    queryFn: () => apiData<{ items: FeedbackRow[] }>(`/api/v1/feedback?limit=30${id ? `&businessId=${id}` : ""}`)
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.feedbackTab}</Text>
      {modules && !hasModule(modules, "REVIEWS") ? <LockedModuleCard moduleId="REVIEWS" /> : null}
      {!modules || hasModule(modules, "REVIEWS")
        ? (rows.data?.items ?? []).map((row) => (
            <View key={row.id} style={styles.card}>
              <Text style={styles.title}>
                {row.review.customerName || t.feedback} · {row.review.rating}
              </Text>
              <Text style={styles.note}>{row.message}</Text>
            </View>
          ))
        : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 6 },
  title: { fontFamily: fonts.title, fontSize: 18, color: colors.ink },
  note: { fontFamily: fonts.body, color: colors.inkSoft },
  hindi: { fontFamily: fonts.hindi }
});

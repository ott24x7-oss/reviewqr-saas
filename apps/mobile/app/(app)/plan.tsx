import { useMemo } from "react";
import type { BillingSummary } from "@reviewqr/shared";
import { useQuery } from "@tanstack/react-query";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useEntitlement } from "../../src/state/entitlement";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { usePalette } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";

function rupees(paise: number) {
  return `₹${Math.round(paise / 100)}`;
}

export default function PlanScreen() {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { t, lang } = useI18n();
  const { user } = useSession();
  const plan = useEntitlement();
  const billing = useQuery({
    queryKey: accountKey(user?.id ?? "", "billing"),
    enabled: !!user,
    queryFn: () => apiData<BillingSummary>("/api/v1/billing/summary")
  });
  const name = lang === "hi" ? plan.data?.plan?.nameHi || plan.data?.plan?.nameEn : plan.data?.plan?.nameEn;
  const when = (plan.data?.endsAt || plan.data?.trialEndsAt || "").slice(0, 10);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={plan.isRefetching}
          onRefresh={() => {
            plan.refetch().catch(() => undefined);
            billing.refetch().catch(() => undefined);
          }}
        />
      }
    >
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.plans}</Text>
      <View style={styles.card}>
        <Text style={styles.title}>{name || plan.data?.tier || "…"}</Text>
        <Text style={styles.note}>{plan.data?.status}</Text>
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.plansWeb}</Text>
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>
          {t.included}: {(plan.data?.modules ?? []).join(", ") || "…"}
        </Text>
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>
          {t.expires}: {when || t.noExpiry}
        </Text>
      </View>
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.planHistory}</Text>
      {(billing.data?.history ?? []).map((row) => (
        <Text key={row.id} style={styles.note}>
          {row.createdAt.slice(0, 10)} · {row.tier} · {rupees(row.amountPaise)} · {row.status}
        </Text>
      ))}
    </ScrollView>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 6 },
  title: { fontFamily: fonts.title, fontSize: 22, color: colors.ink },
  note: { fontFamily: fonts.body, color: colors.inkSoft },
  hindi: { fontFamily: fonts.hindi }
});
}

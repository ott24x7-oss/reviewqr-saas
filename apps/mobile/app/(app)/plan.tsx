import type { BillingSummary } from "@reviewqr/shared";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Receipt } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useEntitlement } from "../../src/state/entitlement";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Group, GroupRow, SectionHeader } from "../../src/ui/rows";
import { usePalette } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";

function rupees(paise: number) {
  return `₹${Math.round(paise / 100)}`;
}

function expiryProgress(when: string, now: number) {
  const end = new Date(when).getTime();
  if (Number.isNaN(end)) return 0;
  const days = (end - now) / 86400000;
  return Math.max(0, Math.min(1, 1 - days / 30));
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
  const when = plan.data?.endsAt || plan.data?.trialEndsAt || "";
  const whenLabel = when.slice(0, 10);
  const [now, setNow] = useState<number | null>(null);
  // The purity lint rejects Date.now() during render. A timeout keeps the read outside render.
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, [when]);
  const days = when && now != null ? Math.max(0, Math.ceil((new Date(when).getTime() - now) / 86400000)) : null;
  const progress = when && now != null ? expiryProgress(when, now) : 0;
  const modules = plan.data?.modules ?? [];

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
      <View style={styles.plan}>
        <View style={styles.planHead}>
          <View style={styles.mark}>
            <CreditCard color="#0F7A37" size={22} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.planName, lang === "hi" && styles.hindi]}>{name || plan.data?.tier || "…"}</Text>
            <Text style={styles.note}>{plan.data?.status}</Text>
          </View>
        </View>
        <View style={styles.chips}>
          {modules.length === 0 ? <Text style={styles.note}>{t.included}</Text> : null}
          {modules.map((moduleId) => (
            <View key={moduleId} style={styles.chip}>
              <Text style={styles.chipText}>{moduleId}</Text>
            </View>
          ))}
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>
          {whenLabel
            ? `${t.expires}: ${whenLabel}${days != null ? ` · ${t.daysLeft.replace("{days}", String(days))}` : ""}`
            : t.noExpiry}
        </Text>
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.plansWeb}</Text>
      </View>

      <SectionHeader label={t.planHistory} />
      <Group>
        {(billing.data?.history ?? []).length === 0 ? (
          <GroupRow icon={Receipt} tint="ink" title={t.planHistory} hint={t.plansWeb} />
        ) : (
          (billing.data?.history ?? []).map((row) => (
            <GroupRow
              key={row.id}
              icon={Receipt}
              tint="blue"
              title={`${row.createdAt.slice(0, 10)} · ${row.tier}`}
              hint={`${rupees(row.amountPaise)} · ${row.status}`}
            />
          ))
        )}
      </Group>
    </ScrollView>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.paper },
    content: { padding: 16, gap: 12 },
    title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
    plan: { backgroundColor: colors.card, borderRadius: 20, padding: 16, gap: 12 },
    planHead: { flexDirection: "row", alignItems: "center", gap: 12 },
    mark: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" },
    planName: { fontFamily: fonts.title, fontSize: 22, color: colors.ink },
    note: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, lineHeight: 20 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { backgroundColor: "#DCFCE7", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    chipText: { fontFamily: fonts.bodyStrong, fontSize: 12, color: "#0F7A37" },
    track: { height: 8, borderRadius: 99, backgroundColor: colors.line, overflow: "hidden" },
    fill: { height: 8, borderRadius: 99, backgroundColor: colors.primary },
    hindi: { fontFamily: fonts.hindi }
  });
}

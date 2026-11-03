import { Screen, useOwnerTabContentInset } from "../../src/ui/screen";
import type { BillingSummary } from "@reviewqr/shared";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { CreditCard, Gift, IndianRupee } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useEntitlement } from "../../src/state/entitlement";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Group, GroupRow, SectionHeader } from "../../src/ui/rows";
import { EmptyState, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { usePalette } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";
import { buildReferralHeroText, normalizeReferralHome } from "../../src/referral/presentation";
import { isModuleList } from "../../src/state/plan-lock-logic";

function rupees(paise: number) {
  return `₹${Math.round(paise / 100)}`;
}

function expiryProgress(startsAt: string | null | undefined, when: string, now: number) {
  const start = startsAt ? new Date(startsAt).getTime() : Number.NaN;
  const end = new Date(when).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.max(0, Math.min(1, (now - start) / (end - start)));
}

function PlanScreenContent() {
  const palette = usePalette();
  const ownerTabContentInset = useOwnerTabContentInset();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { t, lang } = useI18n();
  const { user } = useSession();
  const plan = useEntitlement();
  const billing = useQuery({
    queryKey: accountKey(user?.id ?? "", "billing"),
    enabled: !!user,
    queryFn: () => apiData<BillingSummary>("/api/v1/billing/summary")
  });
  const referrals = useQuery({
    queryKey: accountKey(user?.id ?? "", "refer"),
    enabled: !!user,
    queryFn: () => apiData<unknown>("/api/v1/refer"),
    select: normalizeReferralHome
  });
  const name = lang === "hi" ? plan.data?.plan?.nameHi || plan.data?.plan?.nameEn : plan.data?.plan?.nameEn;
  const when = plan.data?.endsAt || plan.data?.trialEndsAt || "";
  const whenDate = when ? new Date(when) : null;
  const whenLabel = whenDate && !Number.isNaN(whenDate.getTime())
    ? t.activeTill.replace("{date}", new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }).format(whenDate))
    : "";
  const [now, setNow] = useState<number | null>(null);
  // The purity lint rejects Date.now() during render. A timeout keeps the read outside render.
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, [when]);
  const days = when && now != null ? Math.max(0, Math.ceil((new Date(when).getTime() - now) / 86400000)) : null;
  const startAt = plan.data?.startsAt;
  const startMs = startAt ? new Date(startAt).getTime() : Number.NaN;
  const endMs = when ? new Date(when).getTime() : Number.NaN;
  const hasPlanPeriod = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;
  const totalDays = hasPlanPeriod ? Math.max(1, Math.ceil((endMs - startMs) / 86400000)) : null;
  const daysUsed = hasPlanPeriod && now != null
    ? Math.max(0, Math.min(totalDays || 0, Math.floor((now - startMs) / 86400000)))
    : null;
  const progress = hasPlanPeriod && now != null ? expiryProgress(startAt, when, now) : null;
  const modules = isModuleList(plan.data?.modules) ? plan.data.modules : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, ownerTabContentInset]}
      refreshControl={
        <RefreshControl
          refreshing={plan.isRefetching}
          onRefresh={() => {
            plan.refetch().catch(() => undefined);
            billing.refetch().catch(() => undefined);
            referrals.refetch().catch(() => undefined);
          }}
        />
      }
    >
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.plans}</Text>
      <View style={styles.plan}>
        <View style={styles.planHead}>
          <View style={styles.mark}>
            <CreditCard color={palette.deep} size={22} strokeWidth={1.75} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.planName, lang === "hi" && styles.hindi]}>{name || plan.data?.tier || "…"}</Text>
            <Text style={styles.note}>{plan.data?.status}</Text>
          </View>
        </View>
        <View style={styles.chips}>
          {modules?.length === 0 ? <Text style={styles.note}>{t.included}</Text> : null}
          {(modules ?? []).map((moduleId) => (
            <View key={moduleId} style={styles.chip}>
              <Text style={styles.chipText}>{moduleId}</Text>
            </View>
          ))}
        </View>
        {progress != null && totalDays != null && daysUsed != null ? <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={[styles.note, lang === "hi" && styles.hindi]}>
            {t.planDaysUsed.replace("{used}", String(daysUsed)).replace("{total}", String(totalDays))}
          </Text>
        </> : null}
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>
          {whenLabel
            ? `${whenLabel}${days != null ? ` · ${t.daysLeft.replace("{days}", String(days))}` : ""}`
            : t.noExpiry}
        </Text>
        <Text style={[styles.note, lang === "hi" && styles.hindi]}>{t.plansWeb}</Text>
      </View>

      <Group>
        <GroupRow
          icon={Gift}
          tint="green"
          title={referrals.data?.hasYearlyCap
            ? t.referralPlanBonus.replace("{months}", String(referrals.data.monthsEarnedThisYear))
            : t.referEarn}
          hint={buildReferralHeroText(referrals.data?.bonusDaysForFriend, referrals.data?.monthsPerReferral, lang, {
            fallback: t.referralHeroFallback,
            withFriendBonus: t.referralHero,
            withoutFriendBonus: t.referralHeroNoFriendBonus
          })}
          onPress={() => router.push("/(app)/refer")}
        />
      </Group>

      <SectionHeader label={t.planHistory} />
      {billing.isLoading ? <><Skeleton height={72} /><Skeleton height={72} /></> : null}
      {billing.isError ? <LoadErrorCard onRetry={() => billing.refetch().catch(() => undefined)} /> : null}
      {!billing.isLoading && !billing.isError && (billing.data?.history ?? []).length === 0 ? (
        <EmptyState icon={IndianRupee} title={t.emptyBillingTitle} body={t.emptyBillingBody} action={t.helpCenter} onAction={() => router.push("/(app)/help")} />
      ) : null}
      {!billing.isLoading && !billing.isError && (billing.data?.history ?? []).length > 0 ? (
        <Group>
          {(billing.data?.history ?? []).map((row) => (
            <GroupRow
              key={row.id}
              icon={IndianRupee}
              tint="blue"
              title={`${row.createdAt.slice(0, 10)} · ${row.tier}`}
              hint={`${rupees(row.amountPaise)} · ${row.status}`}
            />
          ))}
        </Group>
      ) : null}
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
    mark: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
    planName: { fontFamily: fonts.title, fontSize: 22, color: colors.ink },
    note: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, lineHeight: 20 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    chipText: { fontFamily: fonts.bodyStrong, fontSize: 12, color: colors.deep },
    track: { height: 8, borderRadius: 99, backgroundColor: colors.line, overflow: "hidden" },
    fill: { height: 8, borderRadius: 99, backgroundColor: colors.primary },
    hindi: { fontFamily: fonts.hindi }
  });
}

export default function PlanScreen() {
  return (
    <Screen topInset={true}><PlanScreenContent /></Screen>
  );
}

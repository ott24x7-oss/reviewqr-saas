import { router } from "expo-router";
import { Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAgentBusinesses } from "./api";
import { AgentPage, AgentStatusChip } from "./components";
import { formatAgentDate } from "./format";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Card, Chip, EmptyState, LoadErrorCard, Skeleton } from "../ui/bits";
import { Field, PillButton } from "../ui/controls";
import { Screen } from "../ui/screen";
import { useTheme } from "../ui/theme";

const FILTERS = ["ALL", "ACTIVE", "TRIAL", "EXPIRED"] as const;

function AgentBusinessesContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const query = useAgentBusinesses();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (query.data ?? []).filter((row) => {
      const matchesSearch = !needle || row.name.toLowerCase().includes(needle) || row.planName.toLowerCase().includes(needle);
      const matchesFilter = filter === "ALL" || row.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, query.data, search]);

  return (
    <Screen>
      <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={12}>
        <AgentPage title={t.agentBusinessesTab} subtitle={t.onboardBusiness}>
          <PillButton label={t.onboardBusiness} tone="dark" onPress={() => router.push("/(app)/agent-onboard")} />
          <Field label={t.agentSearchBusinesses} value={search} onChangeText={setSearch} autoCapitalize="none" returnKeyType="search" />
          <View style={styles.filters}>
            {FILTERS.map((item) => (
              <Chip key={item} label={filterLabel(item, t)} selected={filter === item} onPress={() => setFilter(item)} />
            ))}
          </View>
          {query.isLoading ? <><Skeleton height={116} /><Skeleton height={116} /><Skeleton height={116} /></> : null}
          {query.isError ? <LoadErrorCard onRetry={() => query.refetch().catch(() => undefined)} /> : null}
          {!query.isLoading && !query.isError && rows.length === 0 ? (
            <EmptyState icon={Search} title={query.data?.length ? t.agentNoResultsTitle : t.agentNoBusinessesTitle} body={query.data?.length ? t.agentNoResultsBody : t.agentNoBusinesses} action={t.onboardBusiness} onAction={() => router.push("/(app)/agent-onboard")} />
          ) : null}
          {!query.isLoading && !query.isError ? rows.map((row) => (
            <Card key={row.id} style={styles.businessCard}>
              <View style={styles.businessTop}>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={[styles.businessName, { color: palette.ink }]} numberOfLines={1}>{row.name}</Text>
                  <View style={[styles.metaChip, { backgroundColor: palette.surface2, alignSelf: "flex-start" }]}><Text style={[styles.metaText, { color: palette.ink }]}>{row.planName}</Text></View>
                </View>
                <AgentStatusChip status={row.status} />
              </View>
              <View style={[styles.metaRow, { borderTopColor: palette.line }]}>
                <View style={[styles.metaChip, { backgroundColor: palette.surface2 }]}>
                  <Text style={[styles.metaText, { color: palette.ink }, lang === "hi" && styles.hindi]}>
                    {row.endsAt ? t.agentEndsOn.replace("{date}", formatAgentDate(row.endsAt, lang)) : t.noExpiry}
                  </Text>
                </View>
                {row.lastPaymentAt ? <Text style={[styles.metaText, { color: palette.muted }]}>{t.agentLastPayment.replace("{date}", formatAgentDate(row.lastPaymentAt, lang))}</Text> : null}
              </View>
            </Card>
          )) : null}
        </AgentPage>
      </KeyboardAwareScrollView>
    </Screen>
  );
}

function filterLabel(item: (typeof FILTERS)[number], t: Record<string, string>) {
  if (item === "ACTIVE") return t.agentFilterActive;
  if (item === "TRIAL") return t.agentFilterTrial;
  if (item === "EXPIRED") return t.agentFilterExpired;
  return t.agentFilterAll;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 100 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  businessCard: { gap: 12, padding: 15 },
  businessTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  businessName: { fontFamily: fonts.bodyStrong, fontSize: 17 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, borderTopWidth: 1, paddingTop: 10 },
  metaChip: { minHeight: 30, borderRadius: 999, justifyContent: "center", paddingHorizontal: 10 },
  metaText: { fontFamily: fonts.body, fontSize: 12 },
  hindi: { fontFamily: fonts.hindi }
});

export function AgentBusinessesScreen() {
  return <AgentBusinessesContent />;
}

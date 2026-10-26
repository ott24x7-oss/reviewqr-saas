import { router } from "expo-router";
import { WalletCards } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useAgentCommissions } from "./api";
import { AgentCommissionRow } from "./components";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Chip, EmptyState, LoadErrorCard, Skeleton } from "../ui/bits";
import { PillButton } from "../ui/controls";
import { Screen } from "../ui/screen";
import { useTheme } from "../ui/theme";

type EarningsFilter = "ALL" | "MINE" | "OVERRIDE";

function AgentEarningsContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const query = useAgentCommissions();
  const [filter, setFilter] = useState<EarningsFilter>("ALL");
  const rows = useMemo(() => {
    const all = query.data?.pages.flatMap((page) => page.items) ?? [];
    if (filter === "OVERRIDE") return all.filter((row) => row.kind === "TEAM_OVERRIDE");
    if (filter === "MINE") return all.filter((row) => row.kind !== "TEAM_OVERRIDE");
    return all;
  }, [filter, query.data]);

  const listHeader = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{t.agentEarningsTab}</Text>
      <View style={styles.filters}>
        <Chip label={t.agentAllEarnings} selected={filter === "ALL"} onPress={() => setFilter("ALL")} />
        <Chip label={t.agentMySales} selected={filter === "MINE"} onPress={() => setFilter("MINE")} />
        <Chip label={t.agentTeamOverrides} selected={filter === "OVERRIDE"} onPress={() => setFilter("OVERRIDE")} />
      </View>
      <PillButton label={t.agentPayoutStatement} tone="outline" onPress={() => router.push("/(app)/agent-payouts")} />
      {query.isError ? <LoadErrorCard onRetry={() => query.refetch().catch(() => undefined)} /> : null}
      {query.isLoading ? <><Skeleton height={88} /><Skeleton height={88} /></> : null}
    </View>
  );

  return (
    <Screen>
      <FlatList
        style={{ flex: 1, backgroundColor: palette.paper }}
        contentContainerStyle={styles.list}
        data={rows}
        keyExtractor={(row) => row.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={!query.isLoading && !query.isError ? <EmptyState icon={WalletCards} title={t.agentEarningsTab} body={t.agentNoCommissions} action={t.agentBusinessesTab} onAction={() => router.push("/(app)/agent-businesses")} /> : undefined}
        ListFooterComponent={query.isFetchingNextPage ? <Skeleton height={56} /> : undefined}
        renderItem={({ item }) => <AgentCommissionRow row={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 9 }} />}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage().catch(() => undefined);
        }}
        onEndReachedThreshold={0.45}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 112, gap: 10 },
  header: { gap: 12, marginBottom: 4 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  hindiStrong: { fontFamily: fonts.hindiStrong }
});

export function AgentEarningsScreen() {
  return <AgentEarningsContent />;
}

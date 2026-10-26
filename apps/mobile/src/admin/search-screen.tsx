import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Building2, CreditCard, Package, Search, UserRound, Users } from "lucide-react-native";
import type { AdminSearchResult } from "./types";
import { useAdminSearch } from "./api";
import { useAdminCopy } from "./copy";
import { AdminCard, AdminChip, AdminRow } from "./components";
import { AdminFrame, AdminLoadState } from "./screen-kit";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";

type SearchFilter = "all" | AdminSearchResult["type"];
const filters: SearchFilter[] = ["all", "user", "business", "payment", "agent", "order"];

export function AdminSearchScreen() {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [recent, setRecent] = useState<string[]>([]);
  const search = useAdminSearch(query);
  const results = useMemo(() => (search.data?.items ?? []).filter((item) => filter === "all" || item.type === filter), [filter, search.data]);
  function openResult(item: AdminSearchResult) {
    setRecent((current) => [item.title, ...current.filter((saved) => saved !== item.title)].slice(0, 5));
    if (item.type === "user" || item.type === "business") router.push({ pathname: "/(admin)/account", params: { kind: item.type, id: item.id } });
    else if (item.type === "payment") router.push("/(admin)/(tabs)/money?tab=payments");
    else if (item.type === "agent") router.push({ pathname: "/(admin)/team", params: { id: item.id } });
    else router.push("/(admin)/shop");
  }
  const icon = (item: AdminSearchResult) => item.type === "user" ? UserRound : item.type === "business" ? Building2 : item.type === "payment" ? CreditCard : item.type === "agent" ? Users : Package;
  const typeLabel: Record<AdminSearchResult["type"], string> = { user: t.users, business: t.businesses, payment: t.payments, agent: t.agents, order: t.orders };
  return (
    <AdminFrame title={t.search} subtitle={t.searchSubtitle} form refreshing={search.isRefetching} onRefresh={() => search.refetch()}>
      <AdminCard style={styles.searchCard}>
        <View style={[styles.searchField, { backgroundColor: palette.paper, borderColor: palette.line }]}><Search color={palette.muted} size={19} /><TextInput accessibilityLabel={t.searchHint} placeholder={t.searchHint} placeholderTextColor={palette.muted} value={query} onChangeText={setQuery} autoCapitalize="none" returnKeyType="search" style={[styles.input, { color: palette.ink }]} /></View>
      </AdminCard>
      <View style={styles.filters}>{filters.map((item) => <AdminChip key={item} label={item === "all" ? t.all : typeLabel[item]} selected={filter === item} onPress={() => setFilter(item)} />)}</View>
      {!query.trim() ? <>
        <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.recentSearches}</Text>
        {recent.length ? <AdminCard style={styles.recentCard}>{recent.map((item) => <Pressable key={item} onPress={() => setQuery(item)} style={[styles.recentRow, { borderBottomColor: palette.line }]}><Search size={16} color={palette.muted} /><Text style={[styles.recentText, { color: palette.ink }]}>{item}</Text></Pressable>)}</AdminCard> : <View style={[styles.tip, { backgroundColor: palette.card }]}><Text style={[styles.tipText, { color: palette.muted }]}>{t.searchTip}</Text></View>}
      </> : <AdminLoadState loading={search.isLoading} error={search.isError} retry={() => search.refetch()} empty={search.isSuccess && results.length === 0}>
        {results.map((item) => <AdminCard key={`${item.type}-${item.id}`} style={styles.resultCard}><AdminRow icon={icon(item)} title={item.title} subtitle={item.subtitle} onPress={() => openResult(item)} trailing={<Text style={[styles.type, { color: palette.primary }]}>{typeLabel[item.type]}</Text>} /></AdminCard>)}
      </AdminLoadState>}
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  searchCard: { padding: 9 }, searchField: { minHeight: 52, borderWidth: 1, borderRadius: 15, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 }, input: { flex: 1, minHeight: 48, fontFamily: fonts.body, fontSize: 15 }, filters: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, sectionTitle: { fontFamily: fonts.bodyStrong, fontSize: 15, marginTop: 4 }, recentCard: { gap: 0, paddingVertical: 2 }, recentRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth }, recentText: { fontFamily: fonts.body, fontSize: 14 }, tip: { padding: 16, borderRadius: 16 }, tipText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20 }, resultCard: { paddingVertical: 1 }, type: { fontFamily: fonts.bodyStrong, fontSize: 10, textTransform: "uppercase" }, hindi: { fontFamily: fonts.hindiStrong }
});

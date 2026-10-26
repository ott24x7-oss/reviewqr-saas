import { Screen } from "../../src/ui/screen";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Share, StyleSheet, Text } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, EmptyState, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { Gift } from "lucide-react-native";
import { PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";

type Reward = { id: string; months: number; at: string };

function ReferScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const home = useQuery({
    queryKey: accountKey(user?.id ?? "", "refer"),
    enabled: !!user,
    queryFn: () => apiData<{ code: string; link: string; rewards: Reward[] }>("/api/v1/refer")
  });
  const link = home.data?.link || "";
  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.referEarn}</Text>
      {home.isLoading ? <Skeleton height={72} /> : null}
      {home.isError ? <LoadErrorCard onRetry={() => home.refetch().catch(() => undefined)} /> : null}
      <Card style={styles.card}>
        <Text style={[styles.name, { color: palette.ink }]}>{home.data?.code || "…"}</Text>
        <Text style={[styles.note, { color: palette.muted }]}>{link}</Text>
      </Card>
      <PillButton label={t.shareLink} tone="dark" disabled={!link} onPress={() => Share.share({ message: link })} />
      {!home.isLoading && !home.isError && (home.data?.rewards ?? []).length === 0 ? <EmptyState icon={Gift} title={t.emptyReferralRewardsTitle} body={t.emptyReferralRewardsBody} action={t.shareLink} onAction={() => Share.share({ message: link })} /> : null}
      {(home.data?.rewards ?? []).map((row) => (
        <Text key={row.id} style={[styles.note, { color: palette.ink }]}>{row.months} · {row.at.slice(0, 10)}</Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 20 },
  note: { fontFamily: fonts.body, fontSize: 14 },
  card: { gap: 6 },
  hindi: { fontFamily: fonts.hindi }
});

export default function ReferScreen() {
  return (
    <Screen topInset={true}><ReferScreenContent /></Screen>
  );
}

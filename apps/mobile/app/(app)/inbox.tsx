import { Screen } from "../../src/ui/screen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react-native";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, EmptyState, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";

type Note = { id: string; title: string; message: string; isRead: boolean; createdAt: string };

function InboxScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const client = useQueryClient();
  const rows = useQuery({
    queryKey: accountKey(user?.id ?? "", "inbox"),
    enabled: !!user,
    queryFn: () => apiData<{ items: Note[]; unread: number }>("/api/v1/notifications")
  });

  async function readAll() {
    await apiData("/api/v1/notifications/read", { method: "POST", body: JSON.stringify({}) });
    await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "inbox") });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.inbox}</Text>
      <PillButton label={t.resolved} tone="outline" onPress={readAll} />
      {rows.isLoading ? <><Skeleton height={84} /><Skeleton height={84} /></> : null}
      {rows.isError ? <LoadErrorCard onRetry={() => rows.refetch().catch(() => undefined)} /> : null}
      {!rows.isLoading && !rows.isError && (rows.data?.items ?? []).length === 0 ? (
        <EmptyState icon={Bell} title={t.emptyInboxTitle} body={t.emptyInboxBody} action={t.home} onAction={() => router.replace("/(app)")} />
      ) : null}
      {!rows.isLoading && !rows.isError ? (rows.data?.items ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.name, { color: palette.ink }]}>{row.title}</Text>
          <Text style={[styles.note, { color: palette.muted }]}>{row.message}</Text>
          <Text style={[styles.note, { color: palette.inkSoft }]}>{String(row.createdAt).slice(0, 16).replace("T", " ")}{row.isRead ? "" : " · •"}</Text>
        </Card>
      )) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  note: { fontFamily: fonts.body, fontSize: 14 },
  card: { gap: 4 },
  hindi: { fontFamily: fonts.hindi }
});

export default function InboxScreen() {
  return (
    <Screen topInset={true}><InboxScreenContent /></Screen>
  );
}

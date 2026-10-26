import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import { Screen } from "../../src/ui/screen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Share, StyleSheet, Text } from "react-native";
import { BriefcaseBusiness, WalletCards } from "lucide-react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, EmptyState, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { Field, PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";

type Business = { id: string; name: string; owner: string; plan: string; status: string };
type Payout = { id: string; amountPaise: number; utr: string; paidAt: string };

function AgentScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const client = useQueryClient();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const home = useQuery({
    queryKey: accountKey(user?.id ?? "", "agent"),
    enabled: user?.role === "AGENT",
    queryFn: () => apiData<{ code: string; link: string; shareText: string; totals: Record<string, number>; businesses: Business[]; payouts: Payout[] }>("/api/v1/agent")
  });

  async function onboard() {
    setError(null);
    try {
      await apiData("/api/v1/agent/onboard", { method: "POST", body: JSON.stringify({ phone, businessName }) });
      setPhone("");
      setBusinessName("");
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "agent") });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start");
    }
  }

  const totals = home.data?.totals;
  return (
    <KeyboardAwareScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.agentHome}</Text>
      {home.isLoading ? <><Skeleton height={72} /><Skeleton height={72} /></> : null}
      {home.isError ? <LoadErrorCard onRetry={() => home.refetch().catch(() => undefined)} /> : null}
      <Text style={[styles.note, { color: palette.muted }]}>{home.data?.code}</Text>
      <PillButton label={t.shareLink} tone="dark" disabled={!home.data?.link} onPress={() => home.data && Share.share({ message: home.data.shareText })} />
      <Text style={[styles.section, { color: palette.ink }]}>{t.commissions}</Text>
      <Text style={[styles.note, { color: palette.ink }]}>
        {t.rupee}{Math.round((totals?.APPROVED || 0) / 100)} · {t.rupee}{Math.round((totals?.PAID || 0) / 100)}
      </Text>
      <Text style={[styles.section, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.onboardBusiness}</Text>
      <Field label={t.phone} tone="paper" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label={t.name} tone="paper" value={businessName} onChangeText={setBusinessName} />
      <PillButton label={t.addItem} tone="dark" disabled={phone.trim().length < 10 || businessName.trim().length < 2} onPress={onboard} />
      {!home.isLoading && !home.isError && (home.data?.businesses ?? []).length === 0 ? (
        <EmptyState icon={BriefcaseBusiness} title={t.emptyAgentBusinessesTitle} body={t.emptyAgentBusinessesBody} action={t.onboardBusiness} onAction={() => scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true })} />
      ) : null}
      {!home.isLoading && !home.isError ? (home.data?.businesses ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.name, { color: palette.ink }]}>{row.name}</Text>
          <Text style={[styles.note, { color: palette.muted }]}>{row.owner} · {row.plan} · {row.status}</Text>
        </Card>
      )) : null}
      <Text style={[styles.section, { color: palette.ink }]}>{t.payouts}</Text>
      {!home.isLoading && !home.isError && (home.data?.payouts ?? []).length === 0 ? (
        <EmptyState icon={WalletCards} title={t.emptyPayoutsTitle} body={t.emptyPayoutsBody} action={t.onboardBusiness} onAction={() => scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true })} />
      ) : null}
      {!home.isLoading && !home.isError ? (home.data?.payouts ?? []).map((row) => (
        <Text key={row.id} style={[styles.note, { color: palette.ink }]}>{t.rupee}{Math.round(row.amountPaise / 100)} · {row.utr} · {String(row.paidAt).slice(0, 10)}</Text>
      )) : null}
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  section: { fontFamily: fonts.bodyStrong, fontSize: 18, marginTop: 8 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  note: { fontFamily: fonts.body, fontSize: 14 },
  card: { gap: 4 },
  hindi: { fontFamily: fonts.hindi }
});

export default function AgentScreen() {
  return (
    <Screen topInset={true}><AgentScreenContent /></Screen>
  );
}

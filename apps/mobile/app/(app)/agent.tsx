import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Share, StyleSheet, Text } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card } from "../../src/ui/bits";
import { Field, PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";

type Business = { id: string; name: string; owner: string; plan: string; status: string };
type Payout = { id: string; amountPaise: number; utr: string; paidAt: string };

export default function AgentScreen() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const client = useQueryClient();
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
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.agentHome}</Text>
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
      {(home.data?.businesses ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.name, { color: palette.ink }]}>{row.name}</Text>
          <Text style={[styles.note, { color: palette.muted }]}>{row.owner} · {row.plan} · {row.status}</Text>
        </Card>
      ))}
      <Text style={[styles.section, { color: palette.ink }]}>{t.payouts}</Text>
      {(home.data?.payouts ?? []).map((row) => (
        <Text key={row.id} style={[styles.note, { color: palette.ink }]}>{t.rupee}{Math.round(row.amountPaise / 100)} · {row.utr} · {String(row.paidAt).slice(0, 10)}</Text>
      ))}
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </ScrollView>
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

import { Screen } from "../../src/ui/screen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card } from "../../src/ui/bits";
import { Field, PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";

type Campaign = { id: string; name: string; status: string; sent: number; whatsappTemplate: string | null };

function CampaignsScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const id = business?.id;
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("Hi {name}, we would love your feedback.");
  const [error, setError] = useState<string | null>(null);
  const rows = useQuery({
    queryKey: accountKey(user?.id ?? "", "campaigns", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Campaign[] }>(`/api/v1/businesses/${id}/campaigns`)
  });

  async function create() {
    if (!id) return;
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/campaigns`, { method: "POST", body: JSON.stringify({ name, template }) });
      setName("");
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "campaigns", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  async function send(campaignId: string) {
    if (!id) return;
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/campaigns/${campaignId}/send`, { method: "POST" });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "campaigns", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.campaigns}</Text>
      <Field label={t.name} tone="paper" value={name} onChangeText={setName} />
      <Field label={t.whatsAppCustomer} tone="paper" value={template} onChangeText={setTemplate} />
      <PillButton label={t.addItem} tone="dark" disabled={name.trim().length < 2} onPress={create} />
      {(rows.data?.items ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.name, { color: palette.ink }]}>{row.name}</Text>
          <Text style={[styles.note, { color: palette.muted }]}>{row.status} · {row.sent}</Text>
          <Text style={[styles.note, { color: palette.ink }]}>{row.whatsappTemplate}</Text>
          <PillButton label={t.sendCampaign} tone="dark" onPress={() => send(row.id)} />
        </Card>
      ))}
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  name: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  note: { fontFamily: fonts.body, fontSize: 14 },
  card: { gap: 6 },
  hindi: { fontFamily: fonts.hindi }
});

export default function CampaignsScreen() {
  return (
    <Screen topInset={true}><CampaignsScreenContent /></Screen>
  );
}

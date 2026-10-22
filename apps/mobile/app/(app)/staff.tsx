import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";
import { Field, PillButton } from "../../src/ui/controls";

type StaffRow = { id: string; name: string; role: string | null };

export default function StaffScreen() {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = business?.id;
  const rows = useQuery({
    queryKey: accountKey(user?.id ?? "", "staff", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: StaffRow[] }>(`/api/v1/businesses/${id}/staff`)
  });

  async function add() {
    if (!id || name.trim().length < 2) return;
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/staff`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim() })
      });
      setName("");
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "staff", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add staff");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.staff}</Text>
      <Field label={t.name} tone="paper" value={name} onChangeText={setName} />
      <PillButton label={t.addItem} onPress={add} disabled={name.trim().length < 2} tone="dark" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {(rows.data?.items ?? []).map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.title}>{row.name}</Text>
          {row.role ? <Text style={styles.note}>{row.role}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 4 },
  title: { fontFamily: fonts.title, fontSize: 20, color: colors.ink },
  note: { fontFamily: fonts.body, color: colors.inkSoft },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

import { Screen } from "../../src/ui/screen";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState , useMemo } from "react";
import { User } from "lucide-react-native";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { usePalette } from "../../src/ui/theme";
import type { Palette } from "../../src/ui/tokens";
import { FilledField, PillButton, StickyAction } from "../../src/ui/controls";
import { Group, GroupRow, SectionHeader } from "../../src/ui/rows";

type StaffRow = { id: string; name: string; role: string | null };

function StaffScreenContent() {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { t, lang } = useI18n();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = business?.id;
  const stats = useQuery({
    queryKey: accountKey(user?.id ?? "", "staff-stats", id, picked),
    enabled: !!user && !!id && !!picked,
    queryFn: () => apiData<{ reviews: number }>(`/api/v1/businesses/${id}/staff/${picked}/stats`)
  });
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
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.staff}</Text>
        <SectionHeader label={t.name} />
        <View style={styles.card}>
          <FilledField label={t.name} value={name} onChangeText={setName} />
        </View>
        {picked ? (
          <View style={styles.card}>
            <PillButton label={t.rename} tone="outline" onPress={() => id && apiData(`/api/v1/businesses/${id}/staff/${picked}`, { method: "PATCH", body: JSON.stringify({ name: name.trim() }) }).then(() => client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "staff", id) })).catch((err) => setError(err instanceof ApiError ? err.message : "Could not save"))} />
            <PillButton label={t.removeItem} tone="outline" onPress={() => id && apiData(`/api/v1/businesses/${id}/staff/${picked}`, { method: "DELETE" }).then(() => { setPicked(null); return client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "staff", id) }); }).catch((err) => setError(err instanceof ApiError ? err.message : "Could not remove"))} />
          </View>
        ) : null}
        <SectionHeader label={t.inviteStaff} />
        <View style={styles.card}>
          <FilledField label={t.hintEmail} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <PillButton label={t.inviteStaff} tone="dark" disabled={!email.includes("@")} onPress={() => id && apiData(`/api/v1/businesses/${id}/invites`, { method: "POST", body: JSON.stringify({ email: email.trim() }) }).then(() => setEmail("")).catch((err) => setError(err instanceof ApiError ? err.message : "Could not invite"))} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <SectionHeader label={t.sectionTeam} />
        <Group>
          {(rows.data?.items ?? []).length === 0 ? (
            <GroupRow icon={User} tint="blue" title={t.staff} hint={t.hintNoStaff} />
          ) : (
            (rows.data?.items ?? []).map((row) => (
              <GroupRow key={row.id} icon={User} tint="blue" title={row.name} hint={picked === row.id && stats.data ? `${stats.data.reviews}` : row.role || t.hintStaffRow} onPress={() => { setPicked(row.id); setName(row.name); }} />
            ))
          )}
        </Group>
      </ScrollView>
      <StickyAction>
        <PillButton label={t.addItem} onPress={add} disabled={name.trim().length < 2} hint={t.hintName} tone="dark" />
      </StickyAction>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 12 },
  title: { fontFamily: fonts.title, fontSize: 20, color: colors.ink },
  error: { color: colors.danger, fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});
}

export default function StaffScreen() {
  return (
    <Screen topInset={true}><StaffScreenContent /></Screen>
  );
}

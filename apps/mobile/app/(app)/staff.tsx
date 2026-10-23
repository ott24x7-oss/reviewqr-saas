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

export default function StaffScreen() {
  const palette = usePalette();
  const styles = useMemo(() => makeStyles(palette), [palette]);
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
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, lang === "hi" && styles.hindi]}>{t.staff}</Text>
        <SectionHeader label={t.name} />
        <View style={styles.card}>
          <FilledField label={t.name} value={name} onChangeText={setName} />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <SectionHeader label={t.sectionTeam} />
        <Group>
          {(rows.data?.items ?? []).length === 0 ? (
            <GroupRow icon={User} tint="blue" title={t.staff} hint={t.hintNoStaff} />
          ) : (
            (rows.data?.items ?? []).map((row) => (
              <GroupRow key={row.id} icon={User} tint="blue" title={row.name} hint={row.role || t.hintStaffRow} />
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

import { Screen } from "../../src/ui/screen";
import type { TapLink } from "@reviewqr/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QrCode } from "lucide-react-native";
import { useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { KeyboardAwareScrollView, type KeyboardAwareScrollViewRef } from "react-native-keyboard-controller";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Card, EmptyState, LoadErrorCard, Skeleton } from "../../src/ui/bits";
import { Field, PillButton } from "../../src/ui/controls";
import { useTheme } from "../../src/ui/theme";

type Qr = { id: string; shortCode: string; label: string; type: string; scans: number; opensEn: string; directMode: string; directTarget: string };

function QrCodesScreenContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user } = useSession();
  const { business } = useBusiness();
  const client = useQueryClient();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const id = business?.id;
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rows = useQuery({
    queryKey: accountKey(user?.id ?? "", "qrs", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: Qr[] }>(`/api/v1/businesses/${id}/qr-codes`)
  });
  const tap = useQuery({
    queryKey: accountKey(user?.id ?? "", "tap", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ links: TapLink[] }>(`/api/v1/businesses/${id}/tap`)
  });
  const targets = (tap.data?.links ?? []).filter((link) => link.enabled);

  async function create(type: "TABLE" | "COUNTER") {
    if (!id || label.trim().length < 1) return;
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/qr-codes`, { method: "POST", body: JSON.stringify({ type, label: label.trim() }) });
      setLabel("");
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "qrs", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create");
    }
  }

  async function patch(body: object) {
    if (!id) return;
    setError(null);
    try {
      await apiData(`/api/v1/businesses/${id}/qr-codes`, { method: "PATCH", body: JSON.stringify(body) });
      await client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "qrs", id) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    }
  }

  return (
    <KeyboardAwareScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.qrList}</Text>
      <Field label={t.qrLabel} tone="paper" value={label} onChangeText={setLabel} />
      <PillButton label={t.tableQr} tone="dark" disabled={!label.trim()} onPress={() => create("TABLE")} />
      <PillButton label={t.counterQr} tone="outline" disabled={!label.trim()} onPress={() => create("COUNTER")} />
      {rows.isLoading ? <><Skeleton height={96} /><Skeleton height={96} /></> : null}
      {rows.isError ? <LoadErrorCard onRetry={() => rows.refetch().catch(() => undefined)} /> : null}
      {!rows.isLoading && !rows.isError && (rows.data?.items ?? []).length === 0 ? (
        <EmptyState icon={QrCode} title={t.emptyQrTitle} body={t.emptyQrBody} action={t.tableQr} onAction={() => scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true })} />
      ) : null}
      {!rows.isLoading && !rows.isError ? (rows.data?.items ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={[styles.name, { color: palette.ink }]}>{row.label}</Text>
          <Text style={[styles.note, { color: palette.muted }]}>{row.type} · {row.scans} · {row.opensEn}</Text>
          {targets.map((link) => (
            <PillButton
              key={link.key}
              label={link.labelEn || link.type}
              tone={row.directMode === "DIRECT" && row.directTarget === link.key ? "dark" : "outline"}
              onPress={() => patch({ action: "direct", code: row.shortCode, mode: "DIRECT", target: link.key })}
            />
          ))}
        </Card>
      )) : null}
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </KeyboardAwareScrollView>
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

export default function QrCodesScreen() {
  return (
    <Screen topInset={true}><QrCodesScreenContent /></Screen>
  );
}

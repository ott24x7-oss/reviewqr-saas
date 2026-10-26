import { useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { ArrowLeft, CircleAlert, RefreshCw } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Screen } from "../ui/screen";
import { Field, PillButton } from "../ui/controls";
import { useTheme } from "../ui/theme";
import { apiBaseUrl } from "../api/instance";
import { AdminPage } from "./components";
import { useAdminCopy } from "./copy";
import { validateMoneyReason } from "./format";

export function AdminFrame({ title, subtitle, children, refreshing, onRefresh, form = false, right, scroll = true, back = false }: {
  title: string; subtitle?: string; children: ReactNode; refreshing?: boolean; onRefresh?: () => void; form?: boolean; right?: ReactNode; scroll?: boolean; back?: boolean;
}) {
  const { palette } = useTheme();
  const content = <AdminPage title={title} subtitle={subtitle} right={right ?? (back ? <AdminBackButton /> : undefined)}>{children}</AdminPage>;
  return (
    <Screen>
      {scroll ? form ? (
        <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" bottomOffset={22} refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={palette.primary} /> : undefined}>
          {content}
        </KeyboardAwareScrollView>
      ) : (
        <ScrollView style={{ flex: 1, backgroundColor: palette.bg }} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={palette.primary} /> : undefined}>
          {content}
        </ScrollView>
      ) : content}
    </Screen>
  );
}

export function AdminBackButton() {
  const { palette } = useTheme();
  const t = useAdminCopy();
  return <Pressable accessibilityRole="button" accessibilityLabel={t.back} onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.card, borderColor: palette.line }]}><ArrowLeft color={palette.ink} size={20} /></Pressable>;
}

export function AdminStatus({ label }: { label: string }) {
  const { palette } = useTheme();
  const t = useAdminCopy();
  const value = label.toLowerCase();
  const color = value.includes("paid") || value.includes("active") || value.includes("approved") || value.includes("connected") || value.includes("delivered") ? palette.success : value.includes("pending") || value.includes("waiting") || value.includes("proof") || value.includes("printing") ? palette.warning : value.includes("failed") || value.includes("reject") || value.includes("revok") || value.includes("suspend") ? palette.danger : palette.muted;
  const labels: Record<string, string> = { active: t.statusActive, pending: t.statusPending, approved: t.statusApproved, paid: t.statusPaid, failed: t.statusFailed, rejected: t.statusRejected, suspended: t.statusSuspended, paused: t.statusPaused, connected: t.statusConnected, disconnected: t.statusDisconnected, proof: t.statusProof, printing: t.statusPrinting, packed: t.statusPacked, shipped: t.statusShipped, delivered: t.statusDelivered, refunded: t.statusRefunded, trial: t.statusTrial, open: t.statusOpen, waiting: t.statusWaiting, revoked: t.statusRevoked };
  const display = labels[value] ?? label.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <View style={[styles.status, { backgroundColor: `${color}20` }]}><View style={[styles.statusDot, { backgroundColor: color }]} /><Text style={[styles.statusText, { color }]}>{display}</Text></View>;
}

export function AdminAction({ label, onPress, tone = "primary", disabled = false, icon }: { label: string; onPress: () => void; tone?: "primary" | "outline" | "danger"; disabled?: boolean; icon?: ReactNode }) {
  const { palette } = useTheme();
  const { lang } = useI18n();
  const backgroundColor = tone === "primary" ? palette.primary : tone === "danger" ? `${palette.danger}18` : palette.card;
  const color = tone === "primary" ? palette.onPrimary : tone === "danger" ? palette.danger : palette.ink;
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, { backgroundColor, borderColor: tone === "outline" ? palette.line : backgroundColor, opacity: disabled ? 0.45 : 1 }]}>{icon}{disabled ? <ActivityIndicator size="small" color={color} /> : <Text style={[styles.actionText, { color }, lang === "hi" && styles.hindi]}>{label}</Text>}</Pressable>;
}

export function AdminLoadState({ loading, error, retry, empty, children }: { loading?: boolean; error?: boolean; retry: () => void; empty?: boolean; children: ReactNode }) {
  const { palette } = useTheme();
  const t = useAdminCopy();
  if (loading) return <View style={{ gap: 12 }}><View style={[styles.skeleton, { backgroundColor: palette.surface2 }]} /><View style={[styles.skeleton, { height: 132, backgroundColor: palette.surface2 }]} /><View style={[styles.skeleton, { backgroundColor: palette.surface2 }]} /></View>;
  if (error) return <Pressable onPress={retry} style={[styles.error, { backgroundColor: palette.card, borderColor: palette.line }]}><CircleAlert color={palette.warning} size={20} /><Text style={[styles.errorText, { color: palette.ink }]}>{t.loadError}</Text><RefreshCw color={palette.primary} size={17} /><Text style={[styles.errorText, { color: palette.primary }]}>{t.retry}</Text></Pressable>;
  if (empty) return <View style={[styles.empty, { backgroundColor: palette.card, borderColor: palette.line }]}><Text style={[styles.emptyText, { color: palette.muted }]}>{t.empty}</Text></View>;
  return <>{children}</>;
}

export async function openAdminWeb(path: string) {
  const base = apiBaseUrl().replace(/\/$/, "");
  await WebBrowser.openBrowserAsync(`${base}/admin/${path.replace(/^\//, "")}`);
}

export type ConfirmDetails = { action: string; target: string; reason: string; utr?: string };
export function AdminConfirmSheet({ visible, title, body, needsUtr, saving, onClose, onConfirm }: {
  visible: boolean; title: string; body?: string; needsUtr?: boolean; saving?: boolean; onClose: () => void; onConfirm: (details: ConfirmDetails) => Promise<void> | void;
}) {
  const t = useAdminCopy();
  const { palette } = useTheme();
  const { lang } = useI18n();
  const [reason, setReason] = useState("");
  const [utr, setUtr] = useState("");
  const valid = validateMoneyReason(reason) && (!needsUtr || utr.trim().length >= 3);
  const close = () => { setReason(""); setUtr(""); onClose(); };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel={t.stepUpCancel} onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]} />
        <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" bottomOffset={20} contentContainerStyle={styles.sheetScroll}>
          <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.line }]}>
            <View style={[styles.grab, { backgroundColor: palette.line }]} />
            <Text style={[styles.sheetTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{title}</Text>
            {body ? <Text style={[styles.sheetBody, { color: palette.muted }, lang === "hi" && styles.hindi]}>{body}</Text> : null}
            {needsUtr ? <Field label={t.utr} value={utr} onChangeText={setUtr} autoCapitalize="characters" returnKeyType="done" /> : null}
            <Field label={t.moneyReason} value={reason} onChangeText={setReason} placeholder={t.reasonPlaceholder} multiline maxLength={300} returnKeyType="done" />
            {!valid && reason.length > 0 ? <Text style={[styles.validation, { color: palette.warning }]}>{t.reasonRequired}</Text> : null}
            <PillButton label={t.confirm} tone="dark" onPress={() => Promise.resolve(onConfirm({ action: title, target: "", reason: reason.trim(), utr: utr.trim() })).then(close).catch(() => undefined)} disabled={!valid || !!saving} />
            <PillButton label={t.stepUpCancel} tone="outline" onPress={close} />
          </View>
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 }, back: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 15, borderWidth: 1 },
  status: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }, statusDot: { width: 6, height: 6, borderRadius: 3 }, statusText: { fontFamily: fonts.bodyStrong, fontSize: 11 },
  action: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, actionText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  skeleton: { height: 82, borderRadius: 19 }, error: { minHeight: 64, borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "center", gap: 9 }, errorText: { fontFamily: fonts.body, fontSize: 14 }, empty: { minHeight: 130, borderRadius: 20, borderWidth: 1, padding: 22, alignItems: "center", justifyContent: "center" }, emptyText: { fontFamily: fonts.body, fontSize: 14, textAlign: "center" },
  modalRoot: { flex: 1, justifyContent: "flex-end" }, sheetScroll: { flexGrow: 1, justifyContent: "flex-end" }, sheet: { borderWidth: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 28, gap: 14 }, grab: { alignSelf: "center", width: 42, height: 5, borderRadius: 4, marginBottom: 3 }, sheetTitle: { fontFamily: fonts.title, fontSize: 21 }, sheetBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 }, validation: { fontFamily: fonts.bodyStrong, fontSize: 12 }, hindi: { fontFamily: fonts.hindi }
});

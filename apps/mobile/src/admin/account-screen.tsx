import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Building2, CreditCard, Eye, EyeOff, FileText, MessageCircle, Smartphone, UserRound, WalletCards } from "lucide-react-native";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { adminFetch, useAdminAccount } from "./api";
import { useAdminCopy } from "./copy";
import { AdminCard, AdminRow } from "./components";
import { AdminAction, AdminFrame, AdminLoadState, AdminStatus } from "./screen-kit";
import { formatAdminDate, formatAdminMoney } from "./format";
import { useAdminScreenCapture, useAdminSecurity } from "./security";
import { Field } from "../ui/controls";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";

type AccountAction = "change-plan" | "grant-days" | "cancel-at-end" | "suspend" | "unsuspend" | "resend-login" | "reset-onboarding" | "internal-note";

export function AdminAccountScreen() {
  useAdminScreenCapture("admin-account");
  const params = useLocalSearchParams<{ kind?: string; id?: string }>();
  const kind = params.kind === "business" ? "business" : "user";
  const id = params.id ?? "u-1";
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const query = useAdminAccount(kind, id);
  const { requestStepUpToken } = useAdminSecurity();
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [action, setAction] = useState<AccountAction | null>(null);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function sendAction(selected: AccountAction, extra: Record<string, unknown> = {}) {
    if (!query.data) return;
    setSaving(true); setError(false);
    try {
      let stepUp: string | null = null;
      if (selected === "grant-days" && Number(value) > 30) stepUp = await requestStepUpToken("grant_days_over_30", id);
      if (selected === "grant-days" && Number(value) > 30 && !stepUp) return;
      // A plan change can grant a year or a lifetime, so it is always confirmed.
      if (selected === "change-plan") stepUp = await requestStepUpToken("change_user_plan", id);
      if (selected === "change-plan" && !stepUp) return;
      const path = `/${kind === "user" ? "users" : "businesses"}/${encodeURIComponent(id)}/action`;
      await adminFetch(path, { method: "POST", headers: stepUp ? { "X-Step-Up": stepUp } : undefined, body: JSON.stringify({ action: selected, ...extra }) });
      setAction(null);
      await query.refetch();
    } catch { setError(true); }
    finally { setSaving(false); }
  }

  async function revealPhone() {
    setPhoneBusy(true);
    try {
      await adminFetch(`/${kind === "user" ? "users" : "businesses"}/${encodeURIComponent(id)}/action`, { method: "POST", body: JSON.stringify({ action: "view-phone" }) });
      setPhoneVisible(true);
    } catch { setError(true); }
    finally { setPhoneBusy(false); }
  }

  const actionLabel: Record<AccountAction, string> = { "change-plan": t.changePlan, "grant-days": t.grantDays, "cancel-at-end": t.cancelAtEnd, suspend: t.suspend, unsuspend: t.unsuspend, "resend-login": t.resendLogin, "reset-onboarding": t.resetOnboarding, "internal-note": t.internalNote };
  function begin(selected: AccountAction) { setAction(selected); setValue(selected === "change-plan" ? "Growth" : ""); setNote(""); setError(false); }
  async function confirm() {
    if (!action) return;
    if (action === "change-plan") await sendAction(action, { plan: value, reason: note.trim() });
    else if (action === "grant-days") await sendAction(action, { days: Number(value), reason: note.trim() });
    else if (action === "internal-note") await sendAction(action, { note: note.trim() });
    else await sendAction(action);
  }

  const detail = query.data;
  return (
    <AdminFrame title={detail?.name ?? t.account} subtitle={kind === "business" ? t.business : t.user} refreshing={query.isRefetching} onRefresh={() => query.refetch()} form back>
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()}>
        {detail ? <>
          <AdminCard style={styles.identityCard}>
            <View style={[styles.identityIcon, { backgroundColor: palette.accentSoft }]}>{kind === "business" ? <Building2 color={palette.primary} size={22} /> : <UserRound color={palette.primary} size={22} />}</View>
            <View style={{ flex: 1 }}><Text style={[styles.identityName, { color: palette.ink }]}>{detail.name}</Text><Text style={[styles.identityCity, { color: palette.muted }]}>{detail.city}</Text></View><AdminStatus label={detail.status} />
          </AdminCard>
          <AdminCard style={styles.contactCard}>
            <View style={styles.contactRow}><Smartphone color={palette.muted} size={17} /><Text style={[styles.contactText, { color: palette.ink }]}>{phoneVisible ? detail.phone : maskPhone(detail.phone)}</Text><Pressable accessibilityRole="button" accessibilityLabel={phoneVisible ? t.hidePhone : t.fullPhone} onPress={() => phoneVisible ? setPhoneVisible(false) : revealPhone().catch(() => undefined)} style={styles.eye}>{phoneBusy ? <ActivityIndicator size="small" color={palette.primary} /> : phoneVisible ? <EyeOff color={palette.primary} size={17} /> : <Eye color={palette.primary} size={17} />}</Pressable></View>
            <View style={styles.contactRow}><MessageCircle color={palette.muted} size={17} /><Text style={[styles.contactText, { color: palette.ink }]}>{detail.email}</Text></View>
          </AdminCard>
          <AdminCard style={styles.planCard}>
            <View style={styles.planHead}><View style={[styles.planIcon, { backgroundColor: palette.accentSoft }]}><WalletCards color={palette.primary} size={20} /></View><View style={{ flex: 1 }}><Text style={[styles.planName, { color: palette.ink }]}>{detail.plan}</Text><Text style={[styles.planMeta, { color: palette.muted }]}>{t.ends} {detail.endsAt}</Text></View><AdminStatus label={detail.status} /></View>
            <Text style={[styles.moduleLabel, { color: palette.muted }]}>{t.modules}</Text><View style={styles.modules}>{detail.modules.map((module) => <View key={module} style={[styles.modulePill, { backgroundColor: palette.paper }]}><Text style={[styles.moduleText, { color: palette.ink }]}>{module}</Text></View>)}</View>
          </AdminCard>
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.accountActions}</Text>
          <AdminCard style={styles.actionGrid}>
            <AdminAction label={t.changePlan} tone="outline" onPress={() => begin("change-plan")} />
            <AdminAction label={t.grantDays} tone="outline" onPress={() => begin("grant-days")} />
            <AdminAction label={t.cancelAtEnd} tone="outline" onPress={() => sendAction("cancel-at-end").catch(() => undefined)} />
            <AdminAction label={detail.status === "SUSPENDED" ? t.unsuspend : t.suspend} tone={detail.status === "SUSPENDED" ? "primary" : "danger"} onPress={() => sendAction(detail.status === "SUSPENDED" ? "unsuspend" : "suspend").catch(() => undefined)} />
            <AdminAction label={t.resendLogin} tone="outline" onPress={() => sendAction("resend-login").catch(() => undefined)} />
            <AdminAction label={t.resetOnboarding} tone="outline" onPress={() => sendAction("reset-onboarding").catch(() => undefined)} />
            <AdminAction label={t.internalNote} tone="outline" onPress={() => begin("internal-note")} />
          </AdminCard>
          {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
          {detail.businesses.length ? <><Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.businessesList}</Text><AdminCard style={styles.list}>{detail.businesses.map((business) => <AdminRow key={business.id} icon={Building2} title={business.name} trailing={<AdminStatus label={business.status} />} />)}</AdminCard></> : null}
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.paymentsList}</Text>
          <AdminCard style={styles.list}>{detail.payments.map((payment) => <AdminRow key={payment.id} icon={CreditCard} title={formatAdminMoney(payment.amountPaise, lang)} subtitle={formatAdminDate(payment.createdAt, lang)} trailing={<AdminStatus label={payment.status} />} />)}</AdminCard>
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.devices}</Text>
          <AdminCard style={styles.list}>{detail.devices.map((device) => <AdminRow key={device.id} icon={Smartphone} title={device.name} subtitle={`${device.lastSeenAt} · ${device.status}`} />)}</AdminCard>
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.timeline}</Text>
          <AdminCard style={styles.list}>{detail.audit.map((event) => <AdminRow key={event.id} icon={FileText} title={event.action} subtitle={`${event.actor} · ${event.createdAt}`} />)}</AdminCard>
        </> : null}
      </AdminLoadState>
      <Modal visible={!!action} transparent animationType="slide" onRequestClose={() => setAction(null)}>
        <View style={styles.modalRoot}><Pressable style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]} onPress={() => setAction(null)} />
          <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" bottomOffset={20} contentContainerStyle={styles.sheetScroll}>
            <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.line }]}>
              <Text style={[styles.sheetTitle, { color: palette.ink }]}>{action ? actionLabel[action] : t.accountActions}</Text>
              {action === "change-plan" ? <View style={styles.planChoices}>{["Starter", "Growth", "Pro"].map((plan) => <Pressable key={plan} onPress={() => setValue(plan)} style={[styles.choice, { backgroundColor: value === plan ? palette.accentSoft : palette.paper, borderColor: value === plan ? palette.primary : palette.line }]}><Text style={[styles.choiceText, { color: value === plan ? palette.primary : palette.ink }]}>{plan}</Text></Pressable>)}</View> : null}
              {action === "change-plan" ? <Field label={t.reason} value={note} onChangeText={setNote} placeholder={t.reasonPlaceholder} multiline returnKeyType="done" /> : null}
              {action === "grant-days" ? <><Field label={t.daysToGrant} value={value} onChangeText={setValue} keyboardType="number-pad" returnKeyType="done" /><Field label={t.reason} value={note} onChangeText={setNote} placeholder={t.reasonPlaceholder} multiline returnKeyType="done" /><Text style={[styles.sheetHint, { color: palette.muted }]}>{t.duration30}</Text></> : null}
              {action === "internal-note" ? <Field label={t.internalNote} value={note} onChangeText={setNote} placeholder={t.notePlaceholder} multiline returnKeyType="done" /> : null}
              {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
              <AdminAction label={saving ? t.loading : t.confirm} onPress={() => confirm().catch(() => undefined)} disabled={saving || (action === "grant-days" && (!Number(value) || !note.trim())) || (action === "change-plan" && !note.trim()) || (action === "internal-note" && !note.trim())} icon={saving ? <ActivityIndicator color={palette.onPrimary} /> : undefined} />
              <AdminAction label={t.stepUpCancel} tone="outline" onPress={() => setAction(null)} />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </AdminFrame>
  );
}

function maskPhone(value: string) { return value.replace(/\d(?=\d{4})/g, "•"); }

const styles = StyleSheet.create({
  identityCard: { flexDirection: "row", alignItems: "center", gap: 11 }, identityIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" }, identityName: { fontFamily: fonts.bodyStrong, fontSize: 16 }, identityCity: { fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  contactCard: { gap: 10 }, contactRow: { minHeight: 35, flexDirection: "row", alignItems: "center", gap: 10 }, contactText: { flex: 1, fontFamily: fonts.body, fontSize: 13 }, eye: { minWidth: 36, height: 36, alignItems: "center", justifyContent: "center" }, planCard: { gap: 11 }, planHead: { flexDirection: "row", alignItems: "center", gap: 9 }, planIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, planName: { fontFamily: fonts.bodyStrong, fontSize: 15 }, planMeta: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, moduleLabel: { fontFamily: fonts.bodyStrong, fontSize: 11, marginTop: 5 }, modules: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, modulePill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 }, moduleText: { fontFamily: fonts.body, fontSize: 11 }, sectionTitle: { fontFamily: fonts.bodyStrong, fontSize: 16, marginTop: 4 }, actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, list: { paddingVertical: 2 }, error: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  modalRoot: { flex: 1, justifyContent: "flex-end" }, sheetScroll: { flexGrow: 1, justifyContent: "flex-end" }, sheet: { borderWidth: 1, borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 22, paddingBottom: 28, gap: 13 }, sheetTitle: { fontFamily: fonts.title, fontSize: 21 }, sheetHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 }, planChoices: { flexDirection: "row", gap: 8 }, choice: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, choiceText: { fontFamily: fonts.bodyStrong, fontSize: 13 }
});

import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Building2, CreditCard, Eye, EyeOff, FileText, MessageCircle, Smartphone, UserRound, WalletCards } from "lucide-react-native";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { adminApi, useAdminBusiness, useAdminPlans, useAdminUser } from "./api";
import { useAdminCopy } from "./copy";
import { AdminCard, AdminRow } from "./components";
import { AdminAction, AdminFrame, AdminLoadState, AdminStatus } from "./screen-kit";
import { formatAdminDate, formatAdminMoney } from "./format";
import { useAdminScreenCapture, useAdminSecurity } from "./security";
import { planChangeIsLong } from "./view";
import type { AdminPlanDuration, AdminTimelineEntry } from "./types";
import { Field } from "../ui/controls";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";

type SheetAction = "plan" | "grant" | "note";

export function AdminAccountScreen() {
  useAdminScreenCapture("admin-account");
  const params = useLocalSearchParams<{ kind?: string; id?: string }>();
  const kind = params.kind === "business" ? "business" : "user";
  const id = params.id;
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const user = useAdminUser(id, kind === "user");
  const business = useAdminBusiness(id, kind === "business");
  const query = kind === "user" ? user : business;
  const plans = useAdminPlans();
  const { withStepUp } = useAdminSecurity();
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [sheet, setSheet] = useState<SheetAction | null>(null);
  const [planId, setPlanId] = useState("");
  const [duration, setDuration] = useState<AdminPlanDuration | undefined>(undefined);
  const [days, setDays] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const selectedPlan = plans.data?.find((plan) => plan.id === planId);

  async function run(work: () => Promise<unknown>) {
    if (!id) return;
    setSaving(true); setError(false);
    try {
      const done = await work();
      if (done === null) return;
      setSheet(null);
      await query.refetch();
    } catch { setError(true); }
    finally { setSaving(false); }
  }

  const simple = (action: "cancel" | "suspend" | "unsuspend" | "resend" | "reset-onboarding") =>
    run(() => kind === "user" ? adminApi.userAction(id!, { action }) : adminApi.businessAction(id!, { action: action === "unsuspend" ? "unsuspend" : "suspend" }));

  async function confirm() {
    if (!id || !sheet) return;
    if (sheet === "note") {
      await run(() => kind === "user" ? adminApi.userAction(id, { action: "note", note: note.trim() }) : adminApi.businessAction(id, { action: "note", note: note.trim() }));
    } else if (sheet === "grant") {
      const count = Number(days);
      // Over 30 days needs a reason and a grant_days_over_30 step-up.
      await run(() => withStepUp("grant_days_over_30", (stepUp) => adminApi.userAction(id, { action: "grant", days: count, ...(note.trim() ? { reason: note.trim() } : {}) }, stepUp), count > 30));
    } else {
      // A plan longer than a month needs a reason and a change_user_plan step-up.
      const long = planChangeIsLong(selectedPlan, duration);
      await run(() => withStepUp("change_user_plan", (stepUp) => adminApi.userAction(id, { action: "plan", planId, ...(duration ? { duration } : {}), ...(note.trim() ? { reason: note.trim() } : {}) }, stepUp), long));
    }
  }

  async function revealPhone() {
    if (!id) return;
    setPhoneBusy(true);
    try {
      const revealed = kind === "user" ? await adminApi.revealUserPhone(id) : await adminApi.revealBusinessPhone(id);
      setPhone(revealed.phone);
    } catch { setError(true); }
    finally { setPhoneBusy(false); }
  }

  function begin(next: SheetAction) {
    setSheet(next); setNote(""); setDays(""); setError(false);
    if (next === "plan") {
      const first = plans.data?.[0];
      setPlanId(first?.id ?? "");
      setDuration(first?.prices.find((price) => price.active)?.duration);
    }
  }

  const sheetTitle = sheet === "plan" ? t.changePlan : sheet === "grant" ? t.grantDays : t.internalNote;
  const reasonNeeded = (sheet === "grant" && Number(days) > 30) || (sheet === "plan" && planChangeIsLong(selectedPlan, duration));
  const sheetInvalid = (sheet === "grant" && !(Number.isInteger(Number(days)) && Number(days) >= 1)) || (sheet === "plan" && !planId) || (sheet === "note" && !note.trim()) || (reasonNeeded && !note.trim());

  const u = kind === "user" ? user.data : undefined;
  const b = kind === "business" ? business.data : undefined;
  const title = u ? u.name || u.email : b ? b.name : t.account;
  const timeline: AdminTimelineEntry[] = u?.timeline ?? b?.timeline ?? [];
  const suspended = u ? u.suspended : b ? !b.isActive : false;

  return (
    <AdminFrame title={title} subtitle={kind === "business" ? t.business : t.user} refreshing={query.isRefetching} onRefresh={() => query.refetch()} form back>
      <AdminLoadState loading={query.isLoading} error={query.isError} retry={() => query.refetch()}>
        {u || b ? <>
          <AdminCard style={styles.identityCard}>
            <View style={[styles.identityIcon, { backgroundColor: palette.accentSoft }]}>{kind === "business" ? <Building2 color={palette.primary} size={22} /> : <UserRound color={palette.primary} size={22} />}</View>
            <View style={{ flex: 1 }}><Text style={[styles.identityName, { color: palette.ink }]}>{title}</Text><Text style={[styles.identityCity, { color: palette.muted }]}>{u ? u.role : [b?.city, b?.slug].filter(Boolean).join(" · ")}</Text></View><AdminStatus label={suspended ? "SUSPENDED" : "ACTIVE"} />
          </AdminCard>
          <AdminCard style={styles.contactCard}>
            <View style={styles.contactRow}><Smartphone color={palette.muted} size={17} /><Text style={[styles.contactText, { color: palette.ink }]}>{phone ?? (u?.phone || b?.phone || "—")}</Text><Pressable accessibilityRole="button" accessibilityLabel={phone ? t.hidePhone : t.fullPhone} onPress={() => phone ? setPhone(null) : revealPhone().catch(() => undefined)} style={styles.eye}>{phoneBusy ? <ActivityIndicator size="small" color={palette.primary} /> : phone ? <EyeOff color={palette.primary} size={17} /> : <Eye color={palette.primary} size={17} />}</Pressable></View>
            <View style={styles.contactRow}><MessageCircle color={palette.muted} size={17} /><Text style={[styles.contactText, { color: palette.ink }]}>{u?.email ?? b?.email ?? "—"}</Text></View>
          </AdminCard>
          {u ? <AdminCard style={styles.planCard}>
            <View style={styles.planHead}><View style={[styles.planIcon, { backgroundColor: palette.accentSoft }]}><WalletCards color={palette.primary} size={20} /></View><View style={{ flex: 1 }}><Text style={[styles.planName, { color: palette.ink }]}>{u.subscription?.plan ?? u.tier}</Text><Text style={[styles.planMeta, { color: palette.muted }]}>{t.ends} {u.subscriptionEndsAt ? formatAdminDate(u.subscriptionEndsAt, lang) : "—"}</Text></View><AdminStatus label={u.subscriptionStatus} /></View>
            {u.subscription?.modules.length ? <><Text style={[styles.moduleLabel, { color: palette.muted }]}>{t.modules}</Text><View style={styles.modules}>{u.subscription.modules.map((module) => <View key={module} style={[styles.modulePill, { backgroundColor: palette.paper }]}><Text style={[styles.moduleText, { color: palette.ink }]}>{module}</Text></View>)}</View></> : null}
          </AdminCard> : null}
          {b ? <AdminCard style={styles.list}><AdminRow icon={UserRound} title={b.owner.name || b.owner.email} subtitle={`${b.owner.phone} · ${b.owner.tier} · ${b.owner.subscriptionStatus}`} onPress={() => router.push({ pathname: "/(admin)/account", params: { kind: "user", id: b.owner.id } })} /></AdminCard> : null}
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.accountActions}</Text>
          <AdminCard style={styles.actionGrid}>
            {u ? <AdminAction label={t.changePlan} tone="outline" onPress={() => begin("plan")} /> : null}
            {u ? <AdminAction label={t.grantDays} tone="outline" onPress={() => begin("grant")} /> : null}
            {u ? <AdminAction label={t.cancelAtEnd} tone="outline" onPress={() => simple("cancel").catch(() => undefined)} /> : null}
            <AdminAction label={suspended ? t.unsuspend : t.suspend} tone={suspended ? "primary" : "danger"} onPress={() => simple(suspended ? "unsuspend" : "suspend").catch(() => undefined)} />
            {u ? <AdminAction label={t.resendLogin} tone="outline" onPress={() => simple("resend").catch(() => undefined)} /> : null}
            {u ? <AdminAction label={t.resetOnboarding} tone="outline" onPress={() => simple("reset-onboarding").catch(() => undefined)} /> : null}
            <AdminAction label={t.internalNote} tone="outline" onPress={() => begin("note")} />
          </AdminCard>
          {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
          {u?.businesses.length ? <><Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.businessesList}</Text><AdminCard style={styles.list}>{u.businesses.map((row) => <AdminRow key={row.id} icon={Building2} title={row.name} subtitle={row.slug} onPress={() => router.push({ pathname: "/(admin)/account", params: { kind: "business", id: row.id } })} trailing={<AdminStatus label={row.isActive ? "ACTIVE" : "SUSPENDED"} />} />)}</AdminCard></> : null}
          {u ? <><Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.paymentsList}</Text>
            <AdminCard style={styles.list}>{u.payments.map((payment) => <AdminRow key={payment.id} icon={CreditCard} title={formatAdminMoney(payment.amount, lang)} subtitle={`${payment.provider} · ${formatAdminDate(payment.createdAt, lang)}`} trailing={<AdminStatus label={payment.status} />} />)}</AdminCard></> : null}
          <Text style={[styles.sectionTitle, { color: palette.ink }]}>{t.timeline}</Text>
          <AdminCard style={styles.list}>{timeline.map((event) => <AdminRow key={event.id} icon={FileText} title={event.action} subtitle={`${formatAdminDate(event.createdAt, lang)}${event.reason ? ` · ${event.reason}` : ""}`} />)}</AdminCard>
        </> : null}
      </AdminLoadState>
      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <View style={styles.modalRoot}><Pressable style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]} onPress={() => setSheet(null)} />
          <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" bottomOffset={20} contentContainerStyle={styles.sheetScroll}>
            <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.line }]}>
              <Text style={[styles.sheetTitle, { color: palette.ink }]}>{sheetTitle}</Text>
              {sheet === "plan" ? <View style={styles.planChoices}>{(plans.data ?? []).map((plan) => <Pressable key={plan.id} onPress={() => { setPlanId(plan.id); setDuration(plan.prices.find((price) => price.active)?.duration); }} style={[styles.choice, { backgroundColor: planId === plan.id ? palette.accentSoft : palette.paper, borderColor: planId === plan.id ? palette.primary : palette.line }]}><Text style={[styles.choiceText, { color: planId === plan.id ? palette.primary : palette.ink }]}>{lang === "hi" ? plan.nameHi : plan.nameEn}</Text></Pressable>)}</View> : null}
              {sheet === "plan" && selectedPlan ? <View style={styles.planChoices}>{selectedPlan.prices.filter((price) => price.active).map((price) => <Pressable key={price.duration} onPress={() => setDuration(price.duration)} style={[styles.choice, { backgroundColor: duration === price.duration ? palette.accentSoft : palette.paper, borderColor: duration === price.duration ? palette.primary : palette.line }]}><Text style={[styles.choiceText, { color: duration === price.duration ? palette.primary : palette.ink }]}>{price.duration.replace("_", " ")} · {formatAdminMoney(price.pricePaise, lang)}</Text></Pressable>)}</View> : null}
              {sheet === "grant" ? <><Field label={t.daysToGrant} value={days} onChangeText={setDays} keyboardType="number-pad" returnKeyType="done" /><Text style={[styles.sheetHint, { color: palette.muted }]}>{t.duration30}</Text></> : null}
              {sheet === "note" ? <Field label={t.internalNote} value={note} onChangeText={setNote} placeholder={t.notePlaceholder} multiline returnKeyType="done" /> : <Field label={t.reason} value={note} onChangeText={setNote} placeholder={t.reasonPlaceholder} multiline returnKeyType="done" />}
              {reasonNeeded ? <Text style={[styles.sheetHint, { color: palette.muted }]}>{t.stepUpRequired} {t.reasonRequired}</Text> : null}
              {error ? <Text style={[styles.error, { color: palette.danger }]}>{t.actionFailed}</Text> : null}
              <AdminAction label={saving ? t.loading : t.confirm} onPress={() => confirm().catch(() => undefined)} disabled={saving || sheetInvalid} icon={saving ? <ActivityIndicator color={palette.onPrimary} /> : undefined} />
              <AdminAction label={t.stepUpCancel} tone="outline" onPress={() => setSheet(null)} />
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  identityCard: { flexDirection: "row", alignItems: "center", gap: 11 }, identityIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" }, identityName: { fontFamily: fonts.bodyStrong, fontSize: 16 }, identityCity: { fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  contactCard: { gap: 10 }, contactRow: { minHeight: 35, flexDirection: "row", alignItems: "center", gap: 10 }, contactText: { flex: 1, fontFamily: fonts.body, fontSize: 13 }, eye: { minWidth: 36, height: 36, alignItems: "center", justifyContent: "center" }, planCard: { gap: 11 }, planHead: { flexDirection: "row", alignItems: "center", gap: 9 }, planIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, planName: { fontFamily: fonts.bodyStrong, fontSize: 15 }, planMeta: { fontFamily: fonts.body, fontSize: 11, marginTop: 3 }, moduleLabel: { fontFamily: fonts.bodyStrong, fontSize: 11, marginTop: 5 }, modules: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, modulePill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 }, moduleText: { fontFamily: fonts.body, fontSize: 11 }, sectionTitle: { fontFamily: fonts.bodyStrong, fontSize: 16, marginTop: 4 }, actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, list: { paddingVertical: 2 }, error: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  modalRoot: { flex: 1, justifyContent: "flex-end" }, sheetScroll: { flexGrow: 1, justifyContent: "flex-end" }, sheet: { borderWidth: 1, borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 22, paddingBottom: 28, gap: 13 }, sheetTitle: { fontFamily: fonts.title, fontSize: 21 }, sheetHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 }, planChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, choice: { flexGrow: 1, minHeight: 46, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, choiceText: { fontFamily: fonts.bodyStrong, fontSize: 13 }
});

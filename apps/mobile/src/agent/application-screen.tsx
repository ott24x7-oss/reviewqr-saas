import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { CheckCircle2, Clock3, XCircle } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { agentRequests } from "./api";
import { accountKey } from "../query/keys";
import { useI18n } from "../i18n";
import { useAgentMode } from "./mode-context";
import { resellerApplicationScreen, validateResellerApplication, type ResellerFormDraft, type ResellerHowSell } from "./reseller-flow";
import { useSession } from "../state/session";
import { fonts } from "../theme";
import { Card, LoadErrorCard } from "../ui/bits";
import { Field, PillButton } from "../ui/controls";
import { Screen } from "../ui/screen";
import { useTheme } from "../ui/theme";

const SELLING_METHODS: { value: ResellerHowSell; key: "resellerShopVisits" | "resellerExistingClients" | "resellerOnline" | "resellerOther" }[] = [
  { value: "SHOP_VISITS", key: "resellerShopVisits" },
  { value: "EXISTING_CLIENTS", key: "resellerExistingClients" },
  { value: "ONLINE", key: "resellerOnline" },
  { value: "OTHER", key: "resellerOther" }
];

function ApplicationContent() {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const { user, refreshUser } = useSession();
  const { setMode } = useAgentMode();
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: accountKey(user?.id ?? "", "agent-application"),
    enabled: !!user,
      queryFn: () => agentRequests.applicationStatus()
  });
  const [draft, setDraft] = useState<ResellerFormDraft>({
    name: user?.name || "",
    phone: user?.phone || "",
    city: "",
    state: "",
    howSell: "",
    experience: "",
    languages: "",
    referralOrTeamCode: ""
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validation = useMemo(() => validateResellerApplication(draft, termsAccepted), [draft, termsAccepted]);
  const screen = resellerApplicationScreen(status.data?.status);

  function change<K extends keyof ResellerFormDraft>(key: K, value: ResellerFormDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setShowErrors(true);
    setError(null);
    const howSell = draft.howSell;
    if (Object.keys(validation).length || !howSell) return;
    setSaving(true);
    try {
      await agentRequests.submitApplication({
          ...draft,
          howSell,
          languages: draft.languages.split(",").map((language) => language.trim()).filter(Boolean),
          termsAccepted: true
      });
      await queryClient.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "agent-application") });
      await status.refetch();
      setShowForm(false);
      } catch {
      setError(t.resellerErrorGeneric);
      await status.refetch().catch(() => undefined);
    } finally {
      setSaving(false);
    }
  }

  async function openAgent() {
    await refreshUser().catch(() => undefined);
    setMode("agent");
    router.replace("/(app)/agent-home");
  }

  function terms() {
    Linking.openURL("https://qr24x7.in/reseller-terms").catch(() => undefined);
  }

  function errorText(key: string | undefined) {
    if (!showErrors || !key) return null;
    const messages: Record<string, string> = {
      name: t.resellerErrorName,
      phone: t.resellerErrorPhone,
      city: t.resellerErrorCity,
      state: t.resellerErrorState,
      howSell: t.resellerErrorMethod,
      languages: t.resellerErrorLanguages,
      termsAccepted: t.resellerErrorTerms
    };
    return messages[key] || null;
  }

  function errorLine(key: string | undefined) {
    const message = errorText(key);
    return message ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.danger }, lang === "hi" && styles.hindi]}>{message}</Text> : null;
  }

  const reapplyDate = status.data?.reapplyAt
    ? new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(status.data.reapplyAt))
    : "";

  if (status.isLoading) return <Screen><View style={styles.center}><Text style={[styles.body, { color: palette.muted }]}>{t.resellerLoading}</Text></View></Screen>;
  if (status.isError || !status.data) return <Screen><View style={styles.content}><LoadErrorCard onRetry={() => status.refetch().catch(() => undefined)} /></View></Screen>;

  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.resellerApplicationTitle}</Text>
        {screen === "pending" ? <StatusCard icon={Clock3} title={t.resellerPendingTitle} body={t.resellerPendingBody} /> : null}
        {screen === "approved" ? <StatusCard icon={CheckCircle2} title={t.resellerApprovedTitle} body={t.resellerApprovedBody} /> : null}
        {screen === "rejected" && !showForm ? <Card style={styles.statusCard}>
          <XCircle color={palette.danger} size={28} />
          <Text style={[styles.statusTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.resellerRejectedTitle}</Text>
          {status.data.rejectionReason ? <Text style={[styles.body, { color: palette.muted }, lang === "hi" && styles.hindiBody]}>{status.data.rejectionReason}</Text> : null}
          {reapplyDate ? <Text style={[styles.body, { color: palette.ink }, lang === "hi" && styles.hindiBody]}>{t.resellerReapplyOn.replace("{date}", reapplyDate)}</Text> : null}
          {status.data.canReapply ? <PillButton label={t.resellerApply} tone="dark" onPress={() => setShowForm(true)} /> : null}
        </Card> : null}
        {screen === "approved" ? <PillButton label={t.resellerOpenAgent} tone="dark" onPress={() => openAgent().catch(() => undefined)} /> : null}
        {screen === "form" || (screen === "rejected" && showForm) ? (
          <Card style={styles.form}>
            <Field label={t.resellerName} value={draft.name} onChangeText={(value) => change("name", value)} autoCapitalize="words" />
            {errorLine(validation.name)}
            <Field label={t.resellerPhone} value={draft.phone} onChangeText={(value) => change("phone", value)} keyboardType="phone-pad" />
            {errorLine(validation.phone)}
            <Field label={t.resellerCity} value={draft.city} onChangeText={(value) => change("city", value)} autoCapitalize="words" />
            {errorLine(validation.city)}
            <Field label={t.resellerState} value={draft.state} onChangeText={(value) => change("state", value)} autoCapitalize="words" />
            {errorLine(validation.state)}
            <Text style={[styles.label, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.resellerSellingMethod}</Text>
            <View style={styles.methodGrid}>
              {SELLING_METHODS.map(({ value, key }) => {
                const selected = draft.howSell === value;
                return <Pressable key={value} accessibilityRole="button" accessibilityLabel={t[key]} accessibilityState={{ selected }} onPress={() => change("howSell", value)} style={[styles.method, { backgroundColor: selected ? palette.primary : palette.card, borderColor: selected ? palette.primary : palette.line }]}>
                  <Text style={[styles.methodText, { color: selected ? palette.onPrimary : palette.ink }, lang === "hi" && styles.hindi]}>{t[key]}</Text>
                </Pressable>;
              })}
            </View>
            {errorLine(validation.howSell)}
            <Field label={t.resellerExperience} value={draft.experience} onChangeText={(value) => change("experience", value)} multiline style={styles.multiline} />
            <Field label={t.resellerLanguages} value={draft.languages} onChangeText={(value) => change("languages", value)} placeholder={t.resellerLanguagesPlaceholder} />
            {errorLine(validation.languages)}
            <Field label={t.resellerReferralCode} value={draft.referralOrTeamCode} onChangeText={(value) => change("referralOrTeamCode", value)} autoCapitalize="characters" />
            <Pressable accessibilityRole="link" accessibilityLabel={t.resellerTermsLink} onPress={terms} style={styles.termsLink}>
              <Text style={[styles.linkText, { color: palette.deep }, lang === "hi" && styles.hindi]}>{t.resellerTermsLink}</Text>
            </Pressable>
            <Pressable accessibilityRole="checkbox" accessibilityLabel={t.resellerConsent} accessibilityState={{ checked: termsAccepted }} onPress={() => setTermsAccepted((value) => !value)} style={styles.consent}>
              <View style={[styles.checkbox, { borderColor: termsAccepted ? palette.primary : palette.line, backgroundColor: termsAccepted ? palette.primary : palette.card }]}>
                {termsAccepted ? <CheckCircle2 color={palette.onPrimary} size={18} /> : null}
              </View>
              <Text style={[styles.body, { color: palette.ink, flex: 1 }, lang === "hi" && styles.hindiBody]}>{t.resellerConsent}</Text>
            </Pressable>
            {errorLine(validation.termsAccepted)}
            {error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
            <PillButton label={t.resellerSubmit} tone="dark" disabled={saving} onPress={() => submit().catch(() => undefined)} />
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function StatusCard({ icon: Icon, title, body }: { icon: typeof Clock3; title: string; body: string }) {
  const { lang } = useI18n();
  const { palette } = useTheme();
  return <Card style={styles.statusCard}>
    <Icon color={palette.deep} size={28} />
    <Text style={[styles.statusTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{title}</Text>
    <Text style={[styles.body, { color: palette.muted }, lang === "hi" && styles.hindiBody]}>{body}</Text>
  </Card>;
}

export function AgentApplicationScreen() {
  return <ApplicationContent />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { flexGrow: 1, padding: 18, paddingBottom: 120, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 27 },
  form: { padding: 16, gap: 11 },
  statusCard: { padding: 22, gap: 12, alignItems: "center" },
  statusTitle: { fontFamily: fonts.title, fontSize: 21, textAlign: "center" },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.bodyStrong, fontSize: 14 },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  method: { minHeight: 48, minWidth: "47%", flexGrow: 1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 14, paddingHorizontal: 10 },
  methodText: { fontFamily: fonts.bodyStrong, fontSize: 14, textAlign: "center" },
  multiline: { minHeight: 84, textAlignVertical: "top", paddingTop: 13 },
  termsLink: { minHeight: 46, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 4 },
  linkText: { fontFamily: fonts.bodyStrong, fontSize: 15, textDecorationLine: "underline" },
  consent: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 11 },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  error: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  hindi: { fontFamily: fonts.hindiStrong },
  hindiBody: { fontFamily: fonts.hindi }
});

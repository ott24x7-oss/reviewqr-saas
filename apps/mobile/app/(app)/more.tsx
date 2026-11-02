import { Screen } from "../../src/ui/screen";
import type { FeatureId } from "@reviewqr/shared";
import { router, type Href } from "expo-router";
import {
  Bell, CalendarDays, Check, CircleHelp, CreditCard, Languages, LogOut, Megaphone, Nfc,
  Palette, QrCode, Scissors, Share2, ShoppingBag, Store, Trash2, Users
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { accountKey } from "../../src/query/keys";
import { useBusiness } from "../../src/state/business";
import { useEntitlement } from "../../src/state/entitlement";
import { openPlanLock, useFeatures } from "../../src/state/plan-lock";
import { useAgentMode } from "../../src/agent/mode-context";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Group, GroupRow, SectionHeader } from "../../src/ui/rows";
import { useTheme, type SchemeChoice } from "../../src/ui/theme";
import { useQuery } from "@tanstack/react-query";

type StoreSettings = { layout?: string };

function MeScreenContent() {
  const { t, lang, choose } = useI18n();
  const { palette, choice, setChoice } = useTheme();
  const { user, logout, refreshUser } = useSession();
  const { business } = useBusiness();
  const { setMode } = useAgentMode();
  const plan = useEntitlement();
  const { locked } = useFeatures();
  const [error, setError] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const id = business?.id ?? "";
  const settings = useQuery({
    queryKey: accountKey(user?.id ?? "", "store", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<StoreSettings>("/api/v1/businesses/" + id + "/store", {}, { planSheet: false }),
    staleTime: 60_000
  });
  const themes: SchemeChoice[] = ["system", "light", "dark"];
  const planName = lang === "hi" ? plan.data?.plan?.nameHi || plan.data?.plan?.nameEn : plan.data?.plan?.nameEn;
  const expiry = plan.data?.endsAt || plan.data?.trialEndsAt || "";
  const expiryLabel = useMemo(() => {
    if (!expiry) return t.noExpiry;
    const date = new Date(expiry);
    if (Number.isNaN(date.getTime())) return t.noExpiry;
    return t.activeTill.replace("{date}", new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date));
  }, [expiry, lang, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDaysLeft(expiry ? Math.max(0, Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000)) : null);
    }, 0);
    return () => clearTimeout(timer);
  }, [expiry]);

  function go(href: Href, feature?: FeatureId) {
    if (feature && locked(feature)) {
      openPlanLock(feature);
      return;
    }
    router.push(href);
  }

  async function togglePush() {
    if (!user) return;
    setError(null);
    try {
      await apiData("/api/v1/me", { method: "PATCH", body: JSON.stringify({ pushEnabled: !user.pushEnabled }) });
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update notifications");
    }
  }

  const serviceBusiness = settings.data?.layout === "SERVICES";
  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.meTab}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t.plans} onPress={() => router.push("/(app)/plan")} style={[styles.profile, { backgroundColor: palette.card, borderColor: palette.line }]}>
        <View style={[styles.profileIcon, { backgroundColor: palette.accentSoft }]}>
          <CreditCard color={palette.deep} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.profileName, { color: palette.ink }, lang === "hi" && styles.hindi]}>{planName || plan.data?.tier || t.plans}</Text>
          <Text style={[styles.profileHint, { color: palette.muted }, lang === "hi" && styles.hindi]}>
            {daysLeft == null ? expiryLabel : t.daysLeft.replace("{days}", String(daysLeft)) + " · " + expiryLabel}
          </Text>
        </View>
        <Check color={palette.deep} size={18} />
      </Pressable>

      <SectionHeader label={t.myPage} />
      <Group>
        <GroupRow icon={Store} tint="green" title={t.businessDetails} hint={t.hintBusinessRow} onPress={() => go("/(app)/business-edit")} />
        <GroupRow icon={QrCode} tint="ink" title={t.pageAndQr} hint={t.shareQr} onPress={() => go("/(app)/tap")} />
        {serviceBusiness
          ? <GroupRow icon={Scissors} tint="amber" title={t.services} hint={t.addService} onPress={() => go("/(app)/services", "services-booking")} />
          : <GroupRow icon={ShoppingBag} tint="amber" title={t.menuTab} hint={t.menuItems} onPress={() => go("/(app)/menu", "menu")} />}
        <GroupRow icon={QrCode} tint="blue" title={t.pageButtons} hint={t.pageButtonsHint} onPress={() => go({ pathname: "/(app)/tap", params: { section: "buttons" } })} />
        <GroupRow icon={Palette} tint="pink" title={t.pageTheme} hint={t.pageThemeHint} onPress={() => go({ pathname: "/(app)/tap", params: { section: "theme" } })} />
        <GroupRow icon={QrCode} tint="blue" title={t.qrList} hint={t.perQr} onPress={() => go("/(app)/qr-codes", "multiple-qrs")} />
        <GroupRow icon={Nfc} tint="green" title={t.nfcOne} hint={t.hintNfcRow} onPress={() => go("/(app)/nfc", "nfc")} />
      </Group>

      <SectionHeader label={t.sectionGrow} />
      <Group>
        <GroupRow icon={Share2} tint="green" title={t.referEarn} hint={t.shareLink} onPress={() => go("/(app)/refer")} />
        <GroupRow icon={Share2} tint="amber" title={t.offers} hint={t.couponCode} onPress={() => go("/(app)/offers", "offers")} />
        <GroupRow icon={Megaphone} tint="pink" title={t.campaigns} hint={t.sendCampaign} onPress={() => go("/(app)/campaigns", "campaigns")} />
        <GroupRow icon={Users} tint="blue" title={t.customers} hint={t.exportCsv} onPress={() => go("/(app)/customers", "customers")} />
      </Group>

      <SectionHeader label={t.sectionEarn} />
      <Group>
        {user?.role === "AGENT"
          ? <GroupRow icon={Users} tint="green" title={t.agentHomeTab} hint={t.agentMoreTab} onPress={() => { setMode("agent"); router.push("/(app)/agent-home"); }} />
          : <GroupRow icon={Users} tint="green" title={t.promoBecomeReseller} hint={t.agentJoinBody} onPress={() => go("/(app)/agent-join")} />}
      </Group>

      <SectionHeader label={t.sectionSettings} />
      <Group>
        <GroupRow icon={CalendarDays} tint="green" title={t.storeSettings} hint={t.bookingsToday} onPress={() => go("/(app)/store", "store")} />
        <GroupRow icon={Users} tint="blue" title={t.staff} hint={t.hintStaffRow} onPress={() => go("/(app)/staff", "staff")} />
        <GroupRow icon={Palette} tint="pink" title={t.appLook} hint={t.hintAppTheme} onPress={() => go("/(app)/theme")} />
        <View style={styles.settingBlock}>
          <Text style={[styles.settingTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.themeMode}</Text>
          <View style={styles.choiceRow}>
            {themes.map((item) => {
              const selected = choice === item;
              const label = item === "system" ? t.themeSystem : item === "light" ? t.themeLight : t.themeDark;
              return (
                <Pressable key={item} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => setChoice(item)} style={[styles.choice, { backgroundColor: selected ? palette.primary : palette.card, borderColor: palette.line }]}>
                  <Text style={[styles.choiceText, { color: selected ? palette.onPrimary : palette.ink }, lang === "hi" && styles.hindi]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <GroupRow icon={Languages} tint="blue" title={lang === "en" ? t.hindi : t.english} hint={t.hintLanguage} onPress={() => choose(lang === "en" ? "hi" : "en")} />
        <GroupRow icon={Bell} tint="amber" title={t.notifications} hint={user?.pushEnabled ? t.pushOn : t.pushOff} onPress={togglePush} />
      </Group>

      <SectionHeader label={t.sectionAccount} />
      <Group>
        <GroupRow icon={Bell} tint="amber" title={t.inbox} hint={t.recentActivity} onPress={() => go("/(app)/inbox")} />
        <GroupRow icon={CircleHelp} tint="green" title={t.help} hint={t.hintHelpRow} onPress={() => go("/(app)/help")} />
        <GroupRow icon={CreditCard} tint="green" title={t.planPayments} hint={t.plansWeb} onPress={() => go("/(app)/plan")} />
        <GroupRow icon={LogOut} tint="ink" title={t.signOut} hint={t.hintSignOut} onPress={() => logout()} />
        <GroupRow icon={Trash2} tint="pink" title={t.deleteAccount} hint={t.hintDeleteRow} danger onPress={() => go("/(app)/delete-account")} />
      </Group>
      {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  profile: { minHeight: 82, borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  profileIcon: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  profileName: { fontFamily: fonts.title, fontSize: 18 },
  profileHint: { fontFamily: fonts.body, fontSize: 13, marginTop: 3 },
  settingBlock: { paddingHorizontal: 14, paddingTop: 12, gap: 10 },
  settingTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { minHeight: 44, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center" },
  choiceText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  error: { fontFamily: fonts.body },
  hindi: { fontFamily: fonts.hindi }
});

export default function MoreScreen() {
  return <Screen topInset><MeScreenContent /></Screen>;
}

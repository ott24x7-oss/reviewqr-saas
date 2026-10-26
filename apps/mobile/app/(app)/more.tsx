import { Screen } from "../../src/ui/screen";
import type { FeatureId } from "@reviewqr/shared";
import { router, type Href } from "expo-router";
import {
  BarChart3,
  CircleHelp,
  CreditCard,
  Languages,
  LogOut,
  Bell,
  Megaphone,
  Nfc,
  Palette,
  QrCode,
  Share2,
  ShoppingBag,
  Star,
  Trash2,
  User,
  Users
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { ApiError } from "../../src/api/http";
import { useI18n } from "../../src/i18n";
import { businessDestinations } from "../../src/nav/business-destinations";
import { useEntitlement } from "../../src/state/entitlement";
import { openPlanLock, useFeatures } from "../../src/state/plan-lock";
import { useSession } from "../../src/state/session";
import { useAgentMode } from "../../src/agent/mode-context";
import { fonts } from "../../src/theme";
import { Group, GroupRow, SectionHeader } from "../../src/ui/rows";
import { useTheme, type SchemeChoice } from "../../src/ui/theme";

function MoreScreenContent() {
  const { t, lang, choose } = useI18n();
  const { palette, choice, setChoice } = useTheme();
  const { user, logout, refreshUser } = useSession();
  const { setMode } = useAgentMode();
  const plan = useEntitlement();
  const { locked } = useFeatures();
  const [error, setError] = useState<string | null>(null);
  function go(href: Href, feature?: FeatureId, keep?: boolean) {
    if (feature && locked(feature) && !keep) {
      openPlanLock(feature);
      return;
    }
    router.push(href);
  }
  const name = lang === "hi" ? plan.data?.plan?.nameHi || plan.data?.plan?.nameEn : plan.data?.plan?.nameEn;
  const themes: SchemeChoice[] = ["system", "light", "dark"];

  async function togglePush() {
    if (!user) return;
    setError(null);
    try {
      await apiData("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ pushEnabled: !user.pushEnabled })
      });
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update notifications");
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: palette.paper }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.more}</Text>

      <SectionHeader label={t.yourBusiness} />
      <Group>
        {businessDestinations(t).map((item) => (
          <GroupRow
            key={item.key}
            icon={item.icon}
            tint={item.tint}
            title={item.title}
            hint={item.hint}
            locked={!!item.feature && locked(item.feature)}
            onPress={() => go(item.href, item.feature)}
          />
        ))}
        <GroupRow icon={QrCode} tint="ink" title={t.qrList} hint={t.perQr} locked={locked("multiple-qrs")} onPress={() => go("/(app)/qr-codes", "multiple-qrs", true)} />
        <GroupRow icon={Users} tint="blue" title={t.staff} hint={t.hintStaffRow} locked={locked("staff")} onPress={() => go("/(app)/staff", "staff")} />
      </Group>

      <SectionHeader label={t.sectionGrow} />
      <Group>
        <GroupRow icon={Share2} tint="green" title={t.offers} hint={t.couponCode} locked={locked("offers")} onPress={() => go("/(app)/offers", "offers")} />
        <GroupRow icon={Megaphone} tint="pink" title={t.campaigns} hint={t.sendCampaign} locked={locked("campaigns")} onPress={() => go("/(app)/campaigns", "campaigns")} />
        <GroupRow icon={Share2} tint="amber" title={t.referEarn} hint={t.shareLink} onPress={() => router.push("/(app)/refer")} />
        <GroupRow icon={BarChart3} tint="blue" title={t.analytics} hint={t.hintAnalyticsRow} locked={locked("analytics")} onPress={() => go("/(app)/analytics", "analytics")} />
        <GroupRow icon={Star} tint="amber" title={t.reviews} hint={t.testimonials} locked={locked("reviews-log")} onPress={() => go("/(app)/reviews", "reviews-log")} />
        <GroupRow icon={Users} tint="blue" title={t.customers} hint={t.exportCsv} locked={locked("customers")} onPress={() => go("/(app)/customers", "customers")} />
      </Group>

      <SectionHeader label={t.sectionDevices} />
      <Group>
        <GroupRow icon={Nfc} tint="green" title={t.nfcOne} hint={t.hintNfcRow} locked={locked("nfc")} onPress={() => go("/(app)/nfc", "nfc")} />
        <GroupRow icon={ShoppingBag} tint="amber" title={t.orderStands} hint={t.hintShopRow} onPress={() => router.push("/(app)/shop")} />
      </Group>

      <SectionHeader label={t.sectionApp} />
      <Group>
        <View style={styles.themeBlock}>
          <Text style={[styles.themeLabel, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.themeMode}</Text>
          <View style={styles.themes}>
            {themes.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={item === "system" ? t.themeSystem : item === "light" ? t.themeLight : t.themeDark}
                accessibilityState={{ selected: choice === item }}
                onPress={() => setChoice(item)}
                style={[styles.theme, { borderColor: palette.line, backgroundColor: choice === item ? palette.primary : palette.card }]}
              >
                <Text style={{ color: choice === item ? palette.onPrimary : palette.ink, fontFamily: fonts.bodyStrong }}>
                  {item === "system" ? t.themeSystem : item === "light" ? t.themeLight : t.themeDark}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <GroupRow icon={Palette} tint="pink" title={t.theme} hint={t.hintAppTheme} onPress={() => router.push("/(app)/theme")} />
        <GroupRow
          icon={Languages}
          tint="blue"
          title={lang === "en" ? t.hindi : t.english}
          hint={t.hintLanguage}
          onPress={() => choose(lang === "en" ? "hi" : "en")}
        />
        <GroupRow
          icon={Bell}
          tint="amber"
          title={t.notifications}
          hint={user?.pushEnabled ? t.pushOn : t.pushOff}
          onPress={togglePush}
        />
      </Group>

      <SectionHeader label={t.sectionAccount} />
      <Group>
        <GroupRow
          icon={CreditCard}
          tint="green"
          title={name || plan.data?.tier || t.plans}
          hint={plan.data?.status ? `${plan.data.status} · ${t.plansWeb}` : t.hintPlanRow}
          onPress={() => router.push("/(app)/plan")}
        />
        <GroupRow icon={User} tint="ink" title={t.account} hint={t.hintAccountRow} onPress={() => router.push("/(app)/account")} />
        <GroupRow icon={Bell} tint="amber" title={t.inbox} hint={t.recentActivity} onPress={() => router.push("/(app)/inbox")} />
        {user?.role === "AGENT" ? <GroupRow icon={Users} tint="green" title={t.agentSwitchMode} hint={t.agentSwitchAgent} onPress={() => { setMode("agent"); router.replace("/(app)/agent-home"); }} /> : null}
        <GroupRow icon={CircleHelp} tint="green" title={t.help} hint={t.hintHelpRow} onPress={() => router.push("/(app)/help")} />
        <GroupRow icon={Trash2} tint="pink" title={t.deleteAccount} hint={t.hintDeleteRow} danger onPress={() => router.push("/(app)/delete-account")} />
        {user?.role === "USER" ? <GroupRow icon={Users} tint="green" title={t.agentJoin} hint={t.agentJoinBody} onPress={() => router.push("/(app)/agent-join")} /> : null}
        <GroupRow icon={LogOut} tint="ink" title={t.signOut} hint={t.hintSignOut} onPress={() => logout()} />
      </Group>
      {error ? <Text style={{ color: palette.danger, fontFamily: fonts.body }}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 28 },
  themeBlock: { paddingHorizontal: 14, paddingTop: 14, gap: 10 },
  themeLabel: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  themes: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  theme: { minHeight: 48, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  hindi: { fontFamily: fonts.hindi }
});

export default function MoreScreen() {
  return (
    <Screen topInset={true}><MoreScreenContent /></Screen>
  );
}

import { Screen } from "../../src/ui/screen";
import { router } from "expo-router";
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
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { Group, GroupRow, SectionHeader } from "../../src/ui/rows";
import { useTheme, type SchemeChoice } from "../../src/ui/theme";

function MoreScreenContent() {
  const { t, lang, choose } = useI18n();
  const { palette, choice, setChoice } = useTheme();
  const { user, logout, refreshUser } = useSession();
  const plan = useEntitlement();
  const [error, setError] = useState<string | null>(null);
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
          <GroupRow key={item.key} icon={item.icon} tint={item.tint} title={item.title} hint={item.hint} onPress={() => router.push(item.href)} />
        ))}
        <GroupRow icon={QrCode} tint="ink" title={t.qrList} hint={t.perQr} onPress={() => router.push("/(app)/qr-codes")} />
        <GroupRow icon={Users} tint="blue" title={t.staff} hint={t.hintStaffRow} onPress={() => router.push("/(app)/staff")} />
      </Group>

      <SectionHeader label={t.sectionGrow} />
      <Group>
        <GroupRow icon={Share2} tint="green" title={t.offers} hint={t.couponCode} onPress={() => router.push("/(app)/offers")} />
        <GroupRow icon={Megaphone} tint="pink" title={t.campaigns} hint={t.sendCampaign} onPress={() => router.push("/(app)/campaigns")} />
        <GroupRow icon={Share2} tint="amber" title={t.referEarn} hint={t.shareLink} onPress={() => router.push("/(app)/refer")} />
        <GroupRow icon={BarChart3} tint="blue" title={t.analytics} hint={t.hintAnalyticsRow} onPress={() => router.push("/(app)/analytics")} />
        <GroupRow icon={Star} tint="amber" title={t.reviews} hint={t.testimonials} onPress={() => router.push("/(app)/reviews")} />
        <GroupRow icon={Users} tint="blue" title={t.customers} hint={t.exportCsv} onPress={() => router.push("/(app)/customers")} />
      </Group>

      <SectionHeader label={t.sectionDevices} />
      <Group>
        <GroupRow icon={Nfc} tint="green" title={t.nfcOne} hint={t.hintNfcRow} onPress={() => router.push("/(app)/nfc")} />
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
        {user?.role === "AGENT" ? <GroupRow icon={Users} tint="green" title={t.agentHome} hint={t.onboardBusiness} onPress={() => router.push("/(app)/agent")} /> : null}
        <GroupRow icon={CircleHelp} tint="green" title={t.help} hint={t.hintHelpRow} onPress={() => router.push("/(app)/help")} />
        <GroupRow icon={Trash2} tint="pink" title={t.deleteAccount} hint={t.hintDeleteRow} danger onPress={() => router.push("/(app)/delete-account")} />
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

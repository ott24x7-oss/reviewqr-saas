import { router } from "expo-router";
import { ArrowRight, CircleHelp, Globe, Headphones, LogOut, MessageCircle, Package, ScrollText, Settings, ShieldCheck, Users, WalletCards } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AdminCard, AdminRow } from "./components";
import { useAdminSession } from "./session";
import { useAdminCopy } from "./copy";
import { AdminFrame, openAdminWeb } from "./screen-kit";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";
import { withOpacity } from "../ui/tokens";

export function AdminMoreScreen() {
  const t = useAdminCopy();
  const { lang, choose } = useI18n();
  const { palette, choice, setChoice, appTheme } = useTheme();
  const { admin, device, signOut } = useAdminSession();
  const routes = [
    { title: t.plans, icon: WalletCards, path: "/(admin)/plans" },
    { title: t.team, icon: Users, path: "/(admin)/team" },
    { title: t.shop, icon: Package, path: "/(admin)/shop" },
    { title: t.support, icon: Headphones, path: "/(admin)/support" },
    { title: t.whatsapp, icon: MessageCircle, path: "/(admin)/whatsapp" },
    { title: t.settings, icon: Settings, path: "/(admin)/settings" },
    { title: t.audit, icon: ScrollText, path: "/(admin)/audit" }
  ];
  const webLinks = [
    { title: t.openCms, path: "cms" }, { title: t.openBranding, path: "branding" }, { title: t.openTemplates, path: "templates" },
    { title: t.openEmail, path: "email-templates" }, { title: t.openAI, path: "ai" }, { title: t.openBulk, path: "bulk-tools" }
  ];
  return (
    <AdminFrame title={t.more} subtitle={t.moreSubtitle}>
      <AdminCard style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}><ShieldCheck color={palette.primary} size={21} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.profileName, { color: palette.ink }]}>{device?.name ?? t.admin}</Text><Text style={[styles.profilePhone, { color: palette.muted }]}>{admin?.phoneMasked ?? t.adminOnly}</Text></View>
        <View style={[styles.secure, { backgroundColor: `${palette.success}18` }]}><Text style={[styles.secureText, { color: palette.success }]}>{t.secure}</Text></View>
      </AdminCard>
      <Text style={[styles.label, { color: palette.muted }]}>{t.appearance}</Text>
      <AdminCard style={styles.preferenceCard}>
        <View style={styles.settingRow}><View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: palette.ink }]}>{t.theme}</Text><Text style={[styles.settingHint, { color: palette.muted }]}>{appTheme === "ocean" ? t.oceanTheme : appTheme}</Text></View><View style={[styles.segment, { backgroundColor: withOpacity(palette.muted, 0.1) }]}>
          {(["dark", "light"] as const).map((mode) => <Pressable key={mode} accessibilityRole="button" accessibilityState={{ selected: choice === mode }} onPress={() => setChoice(mode)} style={[styles.modeButton, { backgroundColor: choice === mode ? palette.primary : "transparent" }]}><Text style={[styles.modeText, { color: choice === mode ? palette.onPrimary : palette.muted }]}>{mode === "dark" ? t.dark : t.light}</Text></Pressable>)}
        </View></View>
        <View style={[styles.settingRow, { borderTopColor: palette.line }]}><Text style={[styles.settingTitle, { color: palette.ink }]}>{t.language}</Text><View style={[styles.segment, { backgroundColor: withOpacity(palette.muted, 0.1) }]}>{(["en", "hi"] as const).map((value) => <Pressable key={value} onPress={() => choose(value)} style={[styles.modeButton, { backgroundColor: lang === value ? palette.primary : "transparent" }]}><Text style={[styles.modeText, { color: lang === value ? palette.onPrimary : palette.muted }]}>{value === "en" ? "English" : "हिन्दी"}</Text></Pressable>)}</View></View>
      </AdminCard>
      <Text style={[styles.label, { color: palette.muted }]}>{t.adminTools}</Text>
      <AdminCard style={styles.listCard}>{routes.map((item) => <AdminRow key={item.path} icon={item.icon} title={item.title} onPress={() => router.push(item.path as never)} trailing={<ArrowRight color={palette.muted} size={17} />} />)}</AdminCard>
      <Text style={[styles.label, { color: palette.muted }]}>{t.webEditors}</Text>
      <AdminCard style={styles.listCard}>{webLinks.map((item) => <AdminRow key={item.path} icon={Globe} title={item.title} onPress={() => openAdminWeb(item.path)} trailing={<ArrowRight color={palette.muted} size={17} />} />)}</AdminCard>
      <View style={styles.footerActions}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/(admin)/settings")} style={[styles.footerButton, { borderColor: palette.line, backgroundColor: palette.card }]}><CircleHelp color={palette.primary} size={17} /><Text style={[styles.footerText, { color: palette.ink }]}>{t.helpAndSecurity}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => signOut().catch(() => undefined)} style={[styles.footerButton, { borderColor: palette.line, backgroundColor: palette.card }]}><LogOut color={palette.danger} size={17} /><Text style={[styles.footerText, { color: palette.danger }]}>{t.signOut}</Text></Pressable>
      </View>
      <Text style={[styles.version, { color: palette.muted }]}>QR24x7 Admin · {t.version} 1</Text>
    </AdminFrame>
  );
}

const styles = StyleSheet.create({
  profile: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 12 }, avatar: { width: 45, height: 45, borderRadius: 16, alignItems: "center", justifyContent: "center" }, profileName: { fontFamily: fonts.bodyStrong, fontSize: 15 }, profilePhone: { fontFamily: fonts.body, fontSize: 12, marginTop: 3 }, secure: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 }, secureText: { fontFamily: fonts.bodyStrong, fontSize: 10 },
  label: { fontFamily: fonts.bodyStrong, fontSize: 12, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }, preferenceCard: { gap: 0, paddingVertical: 0 }, settingRow: { minHeight: 66, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }, settingTitle: { fontFamily: fonts.bodyStrong, fontSize: 14 }, settingHint: { fontFamily: fonts.body, fontSize: 11, marginTop: 2 }, segment: { flexDirection: "row", borderRadius: 14, padding: 3 }, modeButton: { minHeight: 34, paddingHorizontal: 11, borderRadius: 11, justifyContent: "center" }, modeText: { fontFamily: fonts.bodyStrong, fontSize: 11 },
  listCard: { paddingVertical: 2 }, footerActions: { flexDirection: "row", gap: 8 }, footerButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, footerText: { fontFamily: fonts.bodyStrong, fontSize: 12 }, version: { textAlign: "center", fontFamily: fonts.body, fontSize: 11, paddingVertical: 5 }
});

import type { ComponentType, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { Home, Inbox, MoreHorizontal, Search, WalletCards } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AdminInboxItem } from "./types";
import { useAdminInbox } from "./api";
import { useAdminCopy } from "./copy";
import { fonts } from "../theme";
import { Screen } from "../ui/screen";
import { useI18n } from "../i18n";
import { useTheme } from "../ui/theme";
import { withOpacity } from "../ui/tokens";

export function AdminPage({ title, subtitle, children, right }: { title: string; subtitle?: string; children: ReactNode; right?: ReactNode }) {
  const { palette } = useTheme();
  const { lang } = useI18n();
  return (
    <View style={styles.page}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: palette.muted }, lang === "hi" && styles.hindi]}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function AdminCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { palette } = useTheme();
  return <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line }, style]}>{children}</View>;
}

export function AdminSection({ title, action }: { title: string; action?: ReactNode }) {
  const { palette } = useTheme();
  const { lang } = useI18n();
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{title}</Text>{action}</View>;
}

export function AdminChip({ label, selected, onPress, tone }: { label: string; selected?: boolean; onPress?: () => void; tone?: "success" | "warning" | "danger" }) {
  const { palette } = useTheme();
  const color = tone === "success" ? palette.success : tone === "warning" ? palette.warning : tone === "danger" ? palette.danger : palette.primary;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.chip, { borderColor: selected ? color : palette.line, backgroundColor: selected ? withOpacity(color, 0.14) : palette.card }]}>
      <Text style={[styles.chipText, { color: selected || tone ? color : palette.muted }]}>{label}</Text>
    </Pressable>
  );
}

export function AdminEmpty({ title, action }: { title: string; action?: ReactNode }) {
  const { palette } = useTheme();
  return <View style={[styles.empty, { borderColor: palette.line, backgroundColor: palette.card }]}><View style={[styles.emptyIcon, { backgroundColor: palette.accentSoft }]}><Inbox color={palette.primary} size={22} /></View><Text style={[styles.emptyText, { color: palette.muted }]}>{title}</Text>{action}</View>;
}

export function AdminSkeleton({ height = 88 }: { height?: number }) {
  const { palette } = useTheme();
  return <View accessibilityLabel="Loading" style={{ height, borderRadius: 20, backgroundColor: palette.surface2, opacity: 0.75 }} />;
}

export function AdminError({ onRetry }: { onRetry: () => void }) {
  const { palette } = useTheme();
  const t = useAdminCopy();
  return <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.error, { borderColor: palette.danger, backgroundColor: withOpacity(palette.danger, 0.08) }]}><Text style={[styles.errorText, { color: palette.danger }]}>{t.actionFailed}  ·  {t.retry}</Text></Pressable>;
}

export function AdminRow({ icon: Icon, title, subtitle, trailing, onPress }: { icon?: ComponentType<{ color?: string; size?: number }>; title: string; subtitle?: string; trailing?: ReactNode; onPress?: () => void }) {
  const { palette } = useTheme();
  const { lang } = useI18n();
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={[styles.row, { borderBottomColor: palette.line }]}>
      {Icon ? <View style={[styles.rowIcon, { backgroundColor: palette.accentSoft }]}><Icon color={palette.primary} size={20} /></View> : null}
      <View style={{ flex: 1, gap: 3 }}><Text style={[styles.rowTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]} numberOfLines={1}>{title}</Text>{subtitle ? <Text style={[styles.rowSubtitle, { color: palette.muted }, lang === "hi" && styles.hindi]} numberOfLines={2}>{subtitle}</Text> : null}</View>
      {trailing}
    </Pressable>
  );
}

const adminIcons: Record<string, ComponentType<{ color?: string; size?: number }>> = { home: Home, inbox: Inbox, search: Search, money: WalletCards, more: MoreHorizontal };

export function AdminTabBar({ state, descriptors }: { state: { index: number; routes: { key: string; name: string }[] }; descriptors: Record<string, { options?: { title?: string } }> }) {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  // Every inbox response carries the counts for all segments.
  const inbox = useAdminInbox("agents");
  const inboxBadge = Object.values(inbox.data?.counts ?? {}).reduce((sum, count) => sum + count, 0);
  const labels: Record<string, string> = { home: t.home, inbox: t.inbox, search: t.search, money: t.money, more: t.more };
  return (
    <View style={[styles.tabBar, { backgroundColor: palette.card, borderColor: palette.line, paddingBottom: Math.max(8, insets.bottom) }]}>
      {state.routes.filter((route) => route.name in adminIcons).map((route) => {
        const focused = state.routes[state.index]?.key === route.key;
        const Icon = adminIcons[route.name];
        const title = descriptors[route.key]?.options?.title ?? labels[route.name] ?? route.name;
        const badge = route.name === "inbox" ? inboxBadge : 0;
        return (
          <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} onPress={() => {
            if (!focused) router.navigate(`/(admin)/(tabs)/${route.name}` as never);
          }} style={styles.tabItem}>
            <View style={[styles.tabIcon, { backgroundColor: focused ? palette.accentSoft : "transparent" }]}>
              <Icon color={focused ? palette.primary : palette.muted} size={21} />
              {badge > 0 ? <View style={[styles.badge, { backgroundColor: palette.danger, borderColor: palette.card }]}><Text style={[styles.badgeText, { color: palette.onDanger }]}>{badge > 99 ? "99+" : badge}</Text></View> : null}
            </View>
            <Text style={[styles.tabLabel, { color: focused ? palette.ink : palette.muted }, lang === "hi" && styles.hindi]}>{title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AdminScreen({ children, safe = true }: { children: ReactNode; safe?: boolean }) {
  return <Screen topInset={safe}>{children}</Screen>;
}

export function adminItemStatus(item: AdminInboxItem) { return item.status.toLowerCase().replaceAll("_", " "); }

const styles = StyleSheet.create({
  page: { flex: 1, padding: 18, paddingBottom: 110, gap: 14 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  title: { fontFamily: fonts.display, fontSize: 27 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  card: { borderRadius: 20, borderWidth: 1, padding: 15, gap: 12 },
  section: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7, marginBottom: 2 },
  sectionTitle: { fontFamily: fonts.bodyStrong, fontSize: 17 },
  chip: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  chipText: { fontFamily: fonts.bodyStrong, fontSize: 12 },
  empty: { borderWidth: 1, borderRadius: 20, padding: 22, alignItems: "center", gap: 12 },
  emptyIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: fonts.body, fontSize: 14, textAlign: "center" },
  error: { minHeight: 54, borderWidth: 1, borderRadius: 16, padding: 14, justifyContent: "center" },
  errorText: { fontFamily: fonts.bodyStrong, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, paddingVertical: 10, borderBottomWidth: 1 },
  rowIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  rowSubtitle: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  tabBar: { minHeight: 68, borderTopWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: 6, paddingTop: 6 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, minHeight: 56 },
  tabIcon: { minWidth: 48, height: 34, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -2, right: 2, minWidth: 16, height: 16, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { fontFamily: fonts.bodyStrong, fontSize: 9 },
  tabLabel: { fontFamily: fonts.bodyStrong, fontSize: 10 },
  hindi: { fontFamily: fonts.hindi },
  hindiStrong: { fontFamily: fonts.hindiStrong }
});

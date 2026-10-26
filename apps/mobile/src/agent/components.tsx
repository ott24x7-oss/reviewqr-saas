import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import type { AgentCommission } from "./types";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Card, Chip } from "../ui/bits";
import { useTheme } from "../ui/theme";
import { withOpacity } from "../ui/tokens";
import { formatAgentDate, formatRupees, commissionKindLabel, agentStatusLabel, commissionStatusLabel } from "./format";

export function AgentPage({ title, subtitle, children, style }: { title: string; subtitle?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { lang } = useI18n();
  const { palette } = useTheme();
  return (
    <View style={[styles.page, { backgroundColor: palette.paper }, style]}>
      <Text style={[styles.pageTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: palette.muted }, lang === "hi" && styles.hindi]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function AgentAmount({ paise, style, animate = false }: { paise: number; style?: StyleProp<TextStyle>; animate?: boolean }) {
  const { lang } = useI18n();
  const { reduceMotion } = useTheme();
  const [shown, setShown] = useState(animate && !reduceMotion ? 0 : paise);
  useEffect(() => {
    if (!animate || reduceMotion) return;
    let started = 0;
    let frame = 0;
    const tick = (time: number) => {
      if (!started) started = time;
      const progress = Math.min(1, (time - started) / 700);
      setShown(Math.round(paise * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, paise, reduceMotion]);
  return <Text style={style}>{formatRupees(shown, lang)}</Text>;
}

export function AgentSection({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { lang } = useI18n();
  const { palette } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{title}</Text>
      {action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.sectionAction}><Text style={[styles.actionText, { color: palette.deep }]}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function AgentStatusChip({ status }: { status: string }) {
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const tone = status === "ACTIVE" ? palette.success : status === "PAUSED" || status === "EXPIRED" ? palette.danger : palette.warning;
  return (
    <View style={[styles.statusChip, { backgroundColor: withOpacity(tone, 0.12), borderColor: palette.line }]}>
      <Text style={[styles.statusText, { color: tone }, lang === "hi" && styles.hindi]}>{agentStatusLabel(status, t)}</Text>
    </View>
  );
}

export function AgentCommissionRow({ row, compact = false }: { row: AgentCommission; compact?: boolean }) {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  return (
    <Card style={styles.commissionCard}>
      <View style={styles.commissionTop}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.commissionName, { color: palette.ink }]} numberOfLines={1}>{row.businessName}</Text>
          {row.fromAgentName ? <Text style={[styles.commissionMeta, { color: palette.muted }, lang === "hi" && styles.hindi]} numberOfLines={1}>{row.fromAgentName}</Text> : null}
        </View>
        <Text style={[styles.commissionAmount, { color: palette.ink }]}>{formatRupees(row.amountPaise, lang)}</Text>
      </View>
      {!compact ? (
        <View style={styles.commissionBottom}>
          <Text style={[styles.commissionMeta, { color: palette.muted }]}>{formatAgentDate(row.createdAt, lang)}</Text>
          <View style={styles.commissionChips}>
            <View style={[styles.kindChip, { backgroundColor: palette.surface2 }]}><Text style={[styles.kindText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{commissionKindLabel(row.kind, t)}</Text></View>
            <Chip label={commissionStatusLabel(row.status, t)} selected={row.status === "PAID"} />
          </View>
        </View>
      ) : <View style={[styles.kindChip, { backgroundColor: palette.surface2, alignSelf: "flex-start" }]}><Text style={[styles.kindText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{commissionKindLabel(row.kind, t)}</Text></View>}
    </Card>
  );
}

export function AgentTapRow({ icon: Icon, title, hint, onPress }: { icon: ComponentType<{ color?: string; size?: number }>; title: string; hint?: string; onPress: () => void }) {
  const { palette } = useTheme();
  const { lang } = useI18n();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.tapRow, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Icon color={palette.deep} size={21} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.tapTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{title}</Text>
        {hint ? <Text style={[styles.tapHint, { color: palette.muted }, lang === "hi" && styles.hindi]}>{hint}</Text> : null}
      </View>
      <Text style={{ color: palette.muted, fontSize: 20 }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, gap: 12 },
  pageTitle: { fontFamily: fonts.display, fontSize: 28 },
  subtitle: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, marginTop: -6 },
  sectionRow: { minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionTitle: { fontFamily: fonts.bodyStrong, fontSize: 18 },
  sectionAction: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  actionText: { fontFamily: fonts.bodyStrong, fontSize: 14 },
  statusChip: { minHeight: 32, borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, alignItems: "center", justifyContent: "center" },
  statusText: { fontFamily: fonts.bodyStrong, fontSize: 12 },
  commissionCard: { gap: 10, padding: 13 },
  commissionTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  commissionName: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  commissionMeta: { fontFamily: fonts.body, fontSize: 13 },
  commissionAmount: { fontFamily: fonts.title, fontSize: 17 },
  commissionBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  commissionChips: { flexDirection: "row", alignItems: "center", gap: 6 },
  kindChip: { minHeight: 28, borderRadius: 999, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  kindText: { fontFamily: fonts.bodyStrong, fontSize: 11 },
  tapRow: { minHeight: 68, borderRadius: 18, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 13 },
  tapTitle: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  tapHint: { fontFamily: fonts.body, fontSize: 13 },
  hindi: { fontFamily: fonts.hindi },
  hindiStrong: { fontFamily: fonts.hindiStrong }
});

import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import type { AdminKpi, AdminKpiKey, AdminSeriesPoint } from "./types";
import { formatAdminCompact } from "./format";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useAdminCopy } from "./copy";
import { AdminCard } from "./components";
import { useTheme } from "../ui/theme";
import { withOpacity } from "../ui/tokens";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CountUp({ value, format, style }: { value: number; format: (value: number) => string; style?: StyleProp<TextStyle> }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const started = Date.now();
    let frame = 0;
    const tick = () => {
      const progress = Math.min(1, (Date.now() - started) / 620);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <Text style={style}>{format(shown)}</Text>;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const d = useMemo(() => {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(1, max - min);
    return values.map((value, index) => `${index === 0 ? "M" : "L"}${(index / Math.max(1, values.length - 1)) * 92},${28 - ((value - min) / span) * 25}`).join(" ");
  }, [values]);
  return <Svg width={60} height={25} viewBox="0 0 94 32"><Path d={d} fill="none" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function KpiValue({ kpi, style }: { kpi: AdminKpi; style: StyleProp<TextStyle> }) {
  const { lang } = useI18n();
  const monetary = kpi.key === "revenue" || kpi.key === "mrr";
  const format = (value: number) => monetary ? formatAdminCompact(value, lang) : new Intl.NumberFormat(lang === "hi" ? "hi-IN" : "en-IN", { maximumFractionDigits: 0 }).format(value);
  return <CountUp value={kpi.value} format={format} style={style} />;
}

export function AdminKpiGrid({ items }: { items: AdminKpi[] }) {
  const t = useAdminCopy();
  const { palette } = useTheme();
  const { lang } = useI18n();
  const labels: Record<AdminKpiKey, string> = { revenue: t.revenue, newPaid: t.newPaid, mrr: t.mrr, activeSubs: t.activeSubs, trials: t.trials, expiring: t.expiring, churned: t.churned, signups: t.signups, scans: t.scans, shopOrders: t.shopOrders };
  return (
    <View style={styles.kpiGrid}>
      {items.map((kpi) => (
        <AdminCard key={kpi.key} style={styles.kpiCard}>
          <View style={styles.kpiTop}><Text style={[styles.kpiLabel, { color: palette.muted }, lang === "hi" && styles.hindi]} numberOfLines={1}>{labels[kpi.key]}</Text>{kpi.series.length > 1 ? <Sparkline values={kpi.series} color={palette.primary} /> : null}</View>
          <View style={styles.kpiBottom}>
            <KpiValue kpi={kpi} style={[styles.kpiValue, { color: palette.ink }]} />
            {kpi.changePercent === null ? null : <Text style={[styles.kpiChange, { color: kpi.changePercent >= 0 ? palette.success : palette.danger }]}>{kpi.changePercent > 0 ? "+" : ""}{kpi.changePercent}%</Text>}
          </View>
        </AdminCard>
      ))}
    </View>
  );
}

function pathData(values: number[], width: number, height: number, max: number) {
  const points = values.map((value, index) => ({ x: index / Math.max(1, values.length - 1) * width, y: height - value / max * height }));
  const d = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  let length = 0;
  for (let i = 1; i < points.length; i += 1) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return { d, length };
}

function AnimatedLine({ d, length, color, dash = false }: { d: string; length: number; color: string; dash?: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => { progress.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }); }, [progress, d]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));
  return <AnimatedPath animatedProps={props} d={d} fill="none" stroke={color} strokeWidth={dash ? 2 : 2.5} strokeDasharray={dash ? `${length * 0.012} ${length * 0.01}` : `${length} ${length}`} strokeLinecap="round" strokeOpacity={dash ? 0.65 : 1} />;
}

function AnimatedBar({ value, max, color, index, width }: { value: number; max: number; color: string; index: number; width: number }) {
  const progress = useSharedValue(0);
  useEffect(() => { progress.value = withDelay(Math.min(index * 2.5, 230), withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })); }, [index, progress]);
  const height = Math.max(2, value / max * 106);
  const style = useAnimatedStyle(() => ({ height: Math.max(2, height * progress.value) }));
  return <View style={{ width, height: 110, alignItems: "center", justifyContent: "flex-end" }}><Animated.View style={[styles.bar, { backgroundColor: color }, style]} /></View>;
}

export function AdminRevenueChart({ points }: { points: AdminSeriesPoint[] }) {
  const t = useAdminCopy();
  const { palette } = useTheme();
  const { lang } = useI18n();
  const values = points.map((point) => point.value);
  const previous = points.map((point) => point.previousValue ?? 0);
  const max = Math.max(...values, ...previous, 1);
  const actualLine = useMemo(() => pathData(values, 340, 110, max), [values, max]);
  const previousLine = useMemo(() => pathData(previous, 340, 110, max), [previous, max]);
  const selectedLabels = points.filter((_, index) => index % Math.ceil(points.length / 6) === 0 || index === points.length - 1);
  return (
    <AdminCard style={styles.chartCard}>
      <View style={styles.chartHeader}><Text style={[styles.chartTitle, { color: palette.ink }, lang === "hi" && styles.hindiStrong]}>{t.revenueTrend}</Text><Text style={[styles.chartTotal, { color: palette.ink }]}>{formatAdminCompact(values.reduce((sum, value) => sum + value, 0), lang)}</Text></View>
      <View style={styles.chartPlot}>
        <View style={styles.barRow}>{values.map((value, index) => <AnimatedBar key={points[index].label} index={index} width={3.3} value={value} max={max} color={withOpacity(palette.primary, 0.58)} />)}</View>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 340 110" preserveAspectRatio="none">
          <AnimatedLine d={previousLine.d} length={previousLine.length} color={palette.muted} dash />
          <AnimatedLine d={actualLine.d} length={actualLine.length} color={palette.primary} />
        </Svg>
      </View>
      <View style={styles.xLabels}>{selectedLabels.map((point) => <Text key={point.label} style={[styles.axisLabel, { color: palette.muted }]}>{point.label}</Text>)}</View>
      <View style={styles.legend}><View style={[styles.legendDot, { backgroundColor: palette.primary }]} /><Text style={[styles.legendText, { color: palette.muted }]}>{t.revenue}</Text><View style={[styles.legendLine, { backgroundColor: palette.muted }]} /><Text style={[styles.legendText, { color: palette.muted }]}>{t.mtd}</Text></View>
    </AdminCard>
  );
}

function DonutSegment({ start, fraction, color, radius, circumference }: { start: number; fraction: number; color: string; radius: number; circumference: number }) {
  const progress = useSharedValue(0);
  useEffect(() => { progress.value = withDelay(start * 1.8, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })); }, [progress, start]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value) - circumference * start }));
  return <AnimatedCircle animatedProps={props} cx="74" cy="74" r={radius} fill="none" stroke={color} strokeWidth="18" strokeDasharray={`${circumference * fraction} ${circumference}`} strokeLinecap="butt" />;
}

export function AdminPlanDonut({ data }: { data: { name: string; value: number }[] }) {
  const t = useAdminCopy();
  const { palette } = useTheme();
  const colors = [palette.primary, palette.success, palette.warning, palette.danger];
  const total = Math.max(1, data.reduce((sum, item) => sum + item.value, 0));
  const circumference = 2 * Math.PI * 52;
  let start = 0;
  const segments = data.map((item, index) => { const fraction = item.value / total; const offset = start; start += fraction; return { ...item, fraction, offset, color: colors[index % colors.length] }; });
  return (
    <AdminCard style={styles.donutCard}>
      <Text style={[styles.chartTitle, { color: palette.ink }]}>{t.planMix}</Text>
      <View style={styles.donutLayout}>
        <Svg width={148} height={148} viewBox="0 0 148 148" style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx="74" cy="74" r="52" fill="none" stroke={palette.surface2} strokeWidth="18" />
          {segments.map((segment, index) => <DonutSegment key={segment.name} start={index * 90} fraction={segment.fraction} color={segment.color} radius={52} circumference={circumference} />)}
        </Svg>
        <View style={styles.donutLegend}>{segments.map((segment) => <View key={segment.name} style={styles.donutLegendRow}><View style={[styles.legendDot, { backgroundColor: segment.color }]} /><Text style={[styles.legendText, { color: palette.muted, flex: 1 }]}>{segment.name}</Text><Text style={[styles.donutPercent, { color: palette.ink }]}>{segment.value}%</Text></View>)}</View>
      </View>
    </AdminCard>
  );
}

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  kpiCard: { width: "48.7%", minHeight: 105, padding: 11, gap: 6 },
  kpiTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 4 },
  kpiLabel: { flex: 1, fontFamily: fonts.bodyStrong, fontSize: 11 },
  kpiBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 3 },
  kpiValue: { fontFamily: fonts.title, fontSize: 19 },
  kpiChange: { fontFamily: fonts.bodyStrong, fontSize: 10 },
  chartCard: { gap: 12, padding: 14 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chartTitle: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  chartTotal: { fontFamily: fonts.title, fontSize: 17 },
  chartPlot: { height: 112, overflow: "hidden", justifyContent: "flex-end" },
  barRow: { flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  bar: { width: 2.4, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  xLabels: { flexDirection: "row", justifyContent: "space-between" },
  axisLabel: { fontFamily: fonts.body, fontSize: 10 },
  legend: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLine: { width: 12, height: 2, marginLeft: 12 },
  legendText: { fontFamily: fonts.body, fontSize: 11 },
  donutCard: { gap: 12 },
  donutLayout: { flexDirection: "row", alignItems: "center", gap: 12 },
  donutLegend: { flex: 1, gap: 12 },
  donutLegendRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  donutPercent: { fontFamily: fonts.bodyStrong, fontSize: 12 },
  hindi: { fontFamily: fonts.hindi },
  hindiStrong: { fontFamily: fonts.hindiStrong }
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LucideIcon } from "lucide-react-native";
import { Check } from "lucide-react-native";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Polyline, Stop, Text as SvgText } from "react-native-svg";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { PrimaryButton } from "./buttons";
import { tapLight } from "./haptics";
import { useTheme } from "./theme";

export function Card({ children, raised, style }: { children: ReactNode; raised?: boolean; style?: StyleProp<ViewStyle> }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.line,
          borderWidth: palette.cinematic ? 1 : 0,
          borderRadius: palette.cinematic ? 24 : 20,
          shadowColor: palette.cinematic ? palette.primary : "#1C1813",
          shadowOpacity: palette.cinematic ? (raised ? 0.16 : 0.08) : raised ? 0.12 : 0.06,
          elevation: raised ? 8 : 2
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tone = "neutral"
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: "neutral" | "live" | "good" | "warn";
}) {
  const { lang } = useI18n();
  const { palette } = useTheme();
  const bg = selected || tone === "good" ? palette.primary : palette.card;
  const fg = selected || tone === "good" ? palette.onPrimary : palette.ink;
  const border = tone === "live" ? palette.primary : palette.line;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={() => {
        tapLight();
        onPress?.();
      }}
      style={[styles.chip, { backgroundColor: bg, borderColor: border }]}
    >
      {tone === "live" ? <View style={[styles.dot, { backgroundColor: palette.primary }]} /> : null}
      <Text style={[styles.chipText, { color: fg }, lang === "hi" && styles.hindi]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ count, label }: { count: number; label: string }) {
  const { palette, reduceMotion } = useTheme();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withSequence(withTiming(1.3, { duration: 120 }), withTiming(1, { duration: 140 }));
  }, [count, reduceMotion, scale]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  if (count <= 0) return null;
  return (
    <Animated.View
      accessibilityLabel={`${count} ${label}`}
      style={[styles.badge, { backgroundColor: palette.danger }, anim]}
    >
      <Text style={[styles.badgeText, { color: palette.onDanger }]}>{count > 9 ? "9+" : String(count)}</Text>
    </Animated.View>
  );
}

export function OptionTile({
  icon: Icon,
  title,
  hint,
  selected,
  onPress
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const { lang } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!selected || reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withSequence(withTiming(1.04, { duration: 140 }), withTiming(1, { duration: 140 }));
  }, [selected, reduceMotion, scale]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.tileWrap, anim]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !!selected }}
        accessibilityLabel={title}
        onPress={() => {
          tapLight();
          onPress();
        }}
        style={[
          styles.tile,
          {
            backgroundColor: palette.card,
            borderColor: selected ? palette.primary : palette.line
          }
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: selected ? palette.accentSoft : palette.paper }]}>
          <Icon color={selected ? palette.deep : palette.ink} size={22} strokeWidth={1.75} />
        </View>
        <Text style={[styles.tileTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{title}</Text>
        {hint ? <Text style={[styles.tileHint, { color: palette.muted }, lang === "hi" && styles.hindiBody]}>{hint}</Text> : null}
        {selected ? (
          <View style={[styles.check, { backgroundColor: palette.primary }]}>
            <Check color={palette.onPrimary} size={14} strokeWidth={2.4} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function Sparkline({ points, width = 88, height = 28 }: { points: number[]; width?: number; height?: number }) {
  const { palette, reduceMotion } = useTheme();
  const series = points.join(",");
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      draw.value = 1;
      return;
    }
    draw.value = 0;
    draw.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [series, reduceMotion, draw]);
  const anim = useAnimatedStyle(() => ({
    opacity: 0.35 + draw.value * 0.65,
    transform: [{ translateX: -((1 - draw.value) * width) / 2 }, { scaleX: Math.max(0.01, draw.value) }]
  }));
  const values = points.length ? points : [0, 0];
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const step = values.length === 1 ? 0 : width / (values.length - 1);
  const d = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <Animated.View style={anim}>
      <Svg width={width} height={height}>
        <Polyline points={d} fill="none" stroke={palette.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

function useCountUp(target: number | null, active: boolean) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (target == null || !active) return;
    const started = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - started) / 700);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active]);
  if (target == null || !active) return target;
  return shown;
}

export function KpiCard({
  label,
  value,
  trend,
  points,
  count,
  prefix,
  icon: Icon,
  trendLabel,
  fill
}: {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
  points?: number[];
  count?: number | null;
  prefix?: string;
  icon?: LucideIcon;
  trendLabel?: string;
  fill?: boolean;
}) {
  const { lang } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (count == null || reduceMotion) return;
    const day = new Date().toISOString().slice(0, 10);
    const key = "reviewqr.kpiDay";
    AsyncStorage.getItem(key)
      .then((saved) => {
        if (saved === day) return;
        setAnimate(true);
        AsyncStorage.setItem(key, day).catch(() => undefined);
      })
      .catch(() => undefined);
  }, [count, reduceMotion]);
  const counted = useCountUp(count ?? null, animate);
  const gradientId = useId().replace(/:/g, "");
  const arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "";
  const arrowColor = trend === "down" ? palette.danger : palette.deep;
  const shown = count == null || counted == null ? value : `${prefix ?? ""}${counted}`;
  return (
    <Card style={[styles.kpi, fill && styles.kpiFill]}>
      <View style={styles.kpiLabelRow}>
        <Text style={[styles.caption, { color: palette.muted, flex: 1 }, lang === "hi" && styles.hindiBody]}>{label}</Text>
        {Icon ? <Icon color={palette.muted} size={16} strokeWidth={1.75} /> : null}
      </View>
      <View style={styles.kpiRow}>
        {palette.cinematic ? (
          <View accessibilityLabel={shown} accessible>
            <Svg width={Math.max(52, Math.min(174, shown.length * 18))} height={36}>
              <Defs>
                <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={palette.buttonGradient[0]} />
                  <Stop offset="1" stopColor={palette.buttonGradient[1]} />
                </SvgLinearGradient>
              </Defs>
              <SvgText x={0} y={28} fill={`url(#${gradientId})`} fontFamily={fonts.display} fontSize={26}>{shown}</SvgText>
            </Svg>
          </View>
        ) : <Text style={[styles.kpiValue, { color: palette.ink }]}>{shown}</Text>}
        {!trendLabel && arrow ? (
          <Text accessibilityLabel={trend} style={[styles.arrow, { color: arrowColor }]}>
            {arrow}
          </Text>
        ) : null}
      </View>
      <Sparkline points={points && points.length ? points : [0, 0]} width={fill ? 120 : 88} />
      {trendLabel ? (
        <Text accessibilityLabel={trend} style={[styles.trend, { color: arrowColor }, lang === "hi" && styles.hindiBody]}>
          {trendLabel}
        </Text>
      ) : null}
    </Card>
  );
}

export function ProgressSteps({ labels, step }: { labels: string[]; step: number }) {
  const { lang } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const width = useSharedValue(0);
  const ratio = labels.length <= 1 ? 1 : (step - 1) / (labels.length - 1);
  useEffect(() => {
    width.value = reduceMotion ? ratio : withTiming(ratio, { duration: 280, easing: Easing.out(Easing.cubic) });
  }, [ratio, reduceMotion, width]);
  const bar = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, width.value)) * 100}%` }));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: labels.length, now: step }}>
      <View style={[styles.track, { backgroundColor: palette.line }]}>
        <Animated.View style={[styles.fill, { backgroundColor: palette.primary }, bar]} />
      </View>
      <View style={styles.stepRow}>
        {labels.map((label, index) => (
          <Text
            key={label}
            style={[
              styles.stepLabel,
              { color: index + 1 === step ? palette.ink : palette.muted },
              lang === "hi" && styles.hindiBody
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function Skeleton({ height = 18, width = "100%" }: { height?: number; width?: number | `${number}%` }) {
  const { palette, reduceMotion } = useTheme();
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.45, { duration: 700 })), -1);
  }, [opacity, reduceMotion]);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.skeleton, { height, width, backgroundColor: palette.line }, anim]} />;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  onAction
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  const { lang } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    y.value = withRepeat(withSequence(withTiming(-4, { duration: 1500 }), withTiming(4, { duration: 1500 })), -1);
  }, [reduceMotion, y]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={styles.empty}>
      <Animated.View style={anim}>
        <View style={[styles.emptyIcon, { backgroundColor: palette.card, borderColor: palette.line }]}>
          <Icon color={palette.deep} size={28} strokeWidth={1.75} />
        </View>
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: palette.muted }, lang === "hi" && styles.hindiBody]}>{body}</Text>
      {action && onAction ? <PrimaryButton label={action} onPress={onAction} /> : null}
    </View>
  );
}

export function BottomSheet({
  visible,
  title,
  onClose,
  children
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { lang } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const [shown, setShown] = useState(visible);
  if (visible && !shown) setShown(true);
  if (!visible && reduceMotion && shown) setShown(false);
  const y = useSharedValue(0);
  const drag = useSharedValue(0);
  const fade = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!shown) return;
    if (visible) {
      drag.value = 0;
      if (reduceMotion) {
        y.value = 0;
        fade.value = 1;
        return;
      }
      y.value = 360;
      fade.value = 0;
      y.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      fade.value = withTiming(1, { duration: 300 });
      return;
    }
    if (reduceMotion) return;
    y.value = y.value + drag.value;
    drag.value = 0;
    y.value = withTiming(420, { duration: 200 });
    fade.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(setShown)(false);
    });
  }, [drag, fade, reduceMotion, shown, visible, y]);
  const pan = Gesture.Pan()
    .onUpdate((event) => {
      drag.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 800) runOnJS(onClose)();
      else drag.value = withTiming(0, { duration: 200 });
    });
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.value + drag.value }] }));
  const scrim = useAnimatedStyle(() => ({ opacity: fade.value }));
  return (
    <Modal visible={shown} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Animated.View style={[styles.scrim, { backgroundColor: palette.scrim }, scrim]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.sheet, { backgroundColor: palette.card }, sheet]}>
            <View style={[styles.handle, { backgroundColor: palette.line }]} />
            <Text style={[styles.sheetTitle, { color: palette.ink }, lang === "hi" && styles.hindi]}>{title}</Text>
            <KeyboardAwareScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              bottomOffset={12}
            >
              {children}
            </KeyboardAwareScrollView>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, shadowColor: "#1C1813", shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  chip: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6
  },
  chipText: { fontFamily: fonts.bodyStrong, fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: "#FFFFFF", fontFamily: fonts.bodyStrong, fontSize: 11 },
  tileWrap: { width: "48%" },
  tile: { minHeight: 112, borderRadius: 16, borderWidth: 1.5, padding: 12, gap: 6 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  tileTitle: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  tileHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  check: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  kpi: { width: 148, gap: 6 },
  kpiFill: { width: "100%" },
  kpiLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  kpiRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  trend: { fontFamily: fonts.bodyStrong, fontSize: 11 },
  kpiValue: { fontFamily: fonts.display, fontSize: 26 },
  arrow: { fontFamily: fonts.bodyStrong, fontSize: 16, marginBottom: 4 },
  caption: { fontFamily: fonts.body, fontSize: 13 },
  track: { height: 6, borderRadius: 99, overflow: "hidden" },
  fill: { height: 6, borderRadius: 99 },
  stepRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  stepLabel: { fontFamily: fonts.bodyStrong, fontSize: 12 },
  skeleton: { borderRadius: 10 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 28, paddingHorizontal: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontFamily: fonts.title, fontSize: 20, textAlign: "center" },
  emptyBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, textAlign: "center" },
  sheetRoot: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill },
  sheet: { maxHeight: "92%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12, paddingBottom: 28 },
  sheetScroll: { flexShrink: 1 },
  sheetContent: { gap: 12, paddingBottom: 20 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontFamily: fonts.title, fontSize: 20 },
  hindi: { fontFamily: fonts.hindiStrong },
  hindiBody: { fontFamily: fonts.hindi }
});

import { Check, ChevronDown, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useEffect } from "react";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";
import type { SetupStepKey } from "./setup";

export type SetupGuideStep = {
  key: SetupStepKey;
  title: string;
  body: string;
  done: boolean;
};

export function SetupGuideCard({
  steps,
  expandedKey,
  onExpand,
  onStart
}: {
  steps: SetupGuideStep[];
  expandedKey: SetupStepKey | null;
  onExpand: (key: SetupStepKey) => void;
  onStart: (key: SetupStepKey) => void;
}) {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const done = steps.filter((step) => step.done).length;
  const progress = steps.length ? Math.round((done / steps.length) * 100) : 0;

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <View style={styles.heading}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.setupTitle}</Text>
          <Text style={[styles.progressText, { color: palette.muted }, lang === "hi" && styles.hindi]}>
            {t.setupProgress.replace("{done}", String(done)).replace("{total}", String(steps.length))}
          </Text>
        </View>
        <Text style={[styles.percent, { color: palette.deep }]}>{progress}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: palette.line }]}>
        <View style={[styles.fill, { width: `${progress}%`, backgroundColor: palette.primary }]} />
      </View>

      {steps.map((step) => {
        const expanded = expandedKey === step.key;
        const Chevron = expanded ? ChevronDown : ChevronRight;
        return (
          <View key={step.key} style={[styles.step, { borderTopColor: palette.line }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={step.title}
              accessibilityState={{ checked: step.done, expanded }}
              onPress={() => onExpand(step.key)}
              style={styles.stepButton}
            >
              <View style={[styles.mark, { borderColor: step.done ? palette.success : palette.line, backgroundColor: step.done ? palette.success : "transparent" }]}>
                {step.done ? <Check color={palette.onPrimary} size={14} strokeWidth={2.6} /> : null}
              </View>
              <Text style={[styles.stepTitle, { color: palette.ink, flex: 1 }, step.done && styles.doneTitle, lang === "hi" && styles.hindi]}>
                {step.title}
              </Text>
              <Chevron color={palette.muted} size={18} strokeWidth={2} />
            </Pressable>
            {expanded ? (
              <View style={styles.expanded}>
                <Text style={[styles.body, { color: palette.muted }, lang === "hi" && styles.hindi]}>{step.body}</Text>
                {step.done ? (
                  <Text style={[styles.completed, { color: palette.success }, lang === "hi" && styles.hindi]}>{t.setupStepDone}</Text>
                ) : (
                  <Pressable accessibilityRole="button" onPress={() => onStart(step.key)} style={[styles.start, { backgroundColor: palette.primary }]}>
                    <Text style={[styles.startText, { color: palette.onPrimary }, lang === "hi" && styles.hindi]}>{t.setupStart}</Text>
                  </Pressable>
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function SetupCompleteCard() {
  const { t, lang } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = reduceMotion ? 1 : withSequence(withTiming(0.76, { duration: 120 }), withSpring(1, { damping: 7, stiffness: 180 }));
  }, [reduceMotion, scale]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={[styles.completeCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
      <Animated.View style={[styles.completeIcon, { backgroundColor: palette.success }, iconStyle]}>
        <Check color={palette.onPrimary} size={22} strokeWidth={2.6} />
      </Animated.View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.setupComplete}</Text>
        <Text style={[styles.body, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.setupCompleteBody}</Text>
      </View>
      {!reduceMotion ? <>
        <View style={[styles.sparkle, styles.sparkleOne, { backgroundColor: palette.primary }]} />
        <View style={[styles.sparkle, styles.sparkleTwo, { backgroundColor: palette.warning }]} />
        <View style={[styles.sparkle, styles.sparkleThree, { backgroundColor: palette.success }]} />
      </> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 8 },
  heading: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontFamily: fonts.title, fontSize: 19 },
  progressText: { fontFamily: fonts.body, fontSize: 14 },
  percent: { fontFamily: fonts.title, fontSize: 18 },
  track: { height: 7, borderRadius: 999, overflow: "hidden", marginBottom: 2 },
  fill: { height: "100%", borderRadius: 999 },
  step: { borderTopWidth: StyleSheet.hairlineWidth },
  stepButton: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12 },
  mark: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontFamily: fonts.bodyStrong, fontSize: 15, lineHeight: 21 },
  doneTitle: { textDecorationLine: "line-through", opacity: 0.72 },
  expanded: { paddingLeft: 34, paddingRight: 4, paddingBottom: 14, gap: 10 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  start: { alignSelf: "flex-start", minHeight: 48, minWidth: 96, paddingHorizontal: 18, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  startText: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  completed: { fontFamily: fonts.bodyStrong, minHeight: 32, textAlignVertical: "center" },
  completeCard: { minHeight: 100, borderRadius: 22, borderWidth: 1, padding: 16, gap: 12, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  completeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  sparkle: { position: "absolute", top: 16, width: 8, height: 8, borderRadius: 4 },
  sparkleOne: { right: 24 },
  sparkleTwo: { right: 42, top: 30 },
  sparkleThree: { right: 14, top: 44 },
  hindi: { fontFamily: fonts.hindi }
});

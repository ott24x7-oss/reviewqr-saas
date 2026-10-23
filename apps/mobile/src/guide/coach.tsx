import { ArrowUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";
import {
  readCoachState,
  rememberTour,
  shouldShowTour,
  subscribeCoach,
  type CoachScreen
} from "./store";

export type CoachStep = { title: string; body: string; top: number };

export function CoachTour({ screen, steps, force }: { screen: CoachScreen; steps: CoachStep[]; force?: boolean }) {
  const { t, lang } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.96);

  useEffect(() => {
    let live = true;
    async function load() {
      const state = await readCoachState();
      if (!live) return;
      const show = force || shouldShowTour(state, screen);
      setOpen(show);
      setIndex(0);
      if (show && !reduceMotion) {
        scale.value = 0.96;
        scale.value = withTiming(1, { duration: 250 });
      }
    }
    load().catch(() => undefined);
    return subscribeCoach(() => {
      load().catch(() => undefined);
    });
  }, [force, screen, reduceMotion, scale]);

  async function close() {
    if (!force) await rememberTour(screen);
    setOpen(false);
  }

  const step = steps[Math.min(index, steps.length - 1)];
  const targetTop = step?.top ?? 80;
  const hole = useSharedValue(targetTop);
  useEffect(() => {
    if (!open) return;
    hole.value = reduceMotion ? targetTop : withTiming(targetTop, { duration: 250 });
  }, [hole, open, reduceMotion, targetTop]);
  const topScrim = useAnimatedStyle(() => ({ height: Math.max(0, hole.value) }));
  const band = useAnimatedStyle(() => ({ top: hole.value }));
  const below = useAnimatedStyle(() => ({ top: hole.value + 64 }));
  const tipPos = useAnimatedStyle(() => ({
    top: hole.value + 78,
    transform: [{ scale: scale.value }],
    opacity: scale.value
  }));

  if (!open || steps.length === 0 || !step) return null;
  const last = index >= steps.length - 1;

  return (
    <View style={styles.layer} pointerEvents="box-none" accessibilityViewIsModal>
      <Animated.View pointerEvents="auto" style={[styles.topScrim, { backgroundColor: palette.scrim }, topScrim]} />
      <Animated.View pointerEvents="none" style={[styles.band, band]}>
        <View style={[styles.side, { backgroundColor: palette.scrim }]} />
        <View style={styles.hole} />
        <View style={[styles.side, { backgroundColor: palette.scrim }]} />
      </Animated.View>
      <Animated.View pointerEvents="auto" style={[styles.below, { backgroundColor: palette.scrim }, below]} />
      <Animated.View style={[styles.tip, { backgroundColor: palette.deep }, tipPos]}>
        <ArrowUp color="#FFFFFF" size={20} strokeWidth={1.75} />
        <Text style={[styles.kicker, lang === "hi" && styles.hindi]}>
          {index + 1}/{steps.length}
        </Text>
        <Text style={[styles.title, lang === "hi" && styles.hindi]}>{step.title}</Text>
        <Text style={[styles.body, lang === "hi" && styles.hindi]}>{step.body}</Text>
        <View style={styles.row}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.coachSkip} onPress={close} style={styles.hit}>
            <Text style={[styles.skip, lang === "hi" && styles.hindi]}>{t.coachSkip}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={last ? t.coachGotIt : t.coachNext}
            onPress={() => {
              if (last) {
                close().catch(() => undefined);
                return;
              }
              setIndex((value) => value + 1);
              if (!reduceMotion) {
                scale.value = 0.96;
                scale.value = withTiming(1, { duration: 250 });
              }
            }}
            style={styles.hit}
          >
            <Text style={[styles.next, lang === "hi" && styles.hindi]}>{last ? t.coachGotIt : t.coachNext}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, zIndex: 20 },
  topScrim: { position: "absolute", top: 0, left: 0, right: 0 },
  band: { position: "absolute", left: 0, right: 0, height: 64, flexDirection: "row" },
  side: { width: 16 },
  hole: { flex: 1, borderRadius: 18 },
  below: { position: "absolute", left: 0, right: 0, bottom: 0 },
  tip: { position: "absolute", left: 20, right: 20, borderRadius: 18, padding: 16, gap: 6 },
  kicker: { color: "rgba(255,255,255,0.8)", fontFamily: fonts.bodyStrong, fontSize: 12 },
  title: { color: "#FFFFFF", fontFamily: fonts.title, fontSize: 18 },
  body: { color: "#FFFFFF", fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  hit: { minHeight: 48, justifyContent: "center", paddingHorizontal: 8 },
  skip: { color: "rgba(255,255,255,0.85)", fontFamily: fonts.bodyStrong },
  next: { color: "#FFFFFF", fontFamily: fonts.bodyStrong },
  hindi: { fontFamily: fonts.hindi }
});

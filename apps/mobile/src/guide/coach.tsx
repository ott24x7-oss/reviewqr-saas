import { ArrowUp } from "lucide-react-native";
import { useEffect, useRef, useState, type ElementRef, type RefObject } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "../ui/theme";
import { withOpacity } from "../ui/tokens";
import {
  readCoachState,
  rememberTour,
  shouldShowTour,
  subscribeCoach,
  type CoachScreen
} from "./store";

export type CoachStep = { title: string; body: string; top: number; target?: string };
type NativeView = ElementRef<typeof View>;

export function CoachTour({
  screen,
  steps,
  force,
  targets,
  lastLabel,
  onComplete,
  disabled
}: {
  screen: CoachScreen;
  steps: CoachStep[];
  force?: boolean;
  targets?: Record<string, RefObject<NativeView | null>>;
  lastLabel?: string;
  onComplete?: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const { t, lang } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const layerRef = useRef<NativeView>(null);
  const scale = useSharedValue(reduceMotion ? 1 : 0.96);

  useEffect(() => {
    let live = true;
    async function load() {
      const state = await readCoachState();
      if (!live) return;
      const show = !disabled && (force || shouldShowTour(state, screen));
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
  }, [disabled, force, screen, reduceMotion, scale]);

  async function close() {
    if (!force) await rememberTour(screen);
    setOpen(false);
  }

  const step = steps[Math.min(index, steps.length - 1)];
  const targetTop = step?.top ?? 80;
  const hole = useSharedValue(targetTop);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const target = step?.target ? targets?.[step.target]?.current : null;
    const moveHole = (nextTop: number) => {
      hole.value = reduceMotion ? nextTop : withTiming(nextTop, { duration: 250 });
    };
    moveHole(targetTop);
    if (target && layerRef.current) {
      const frame = requestAnimationFrame(() => {
        layerRef.current?.measureInWindow((_, layerTop) => {
          target.measureInWindow((_, targetY, __, targetHeight) => {
            if (active) moveHole(Math.max(12, targetY - layerTop + targetHeight / 2 - 32));
          });
        });
      });
      return () => {
        active = false;
        cancelAnimationFrame(frame);
      };
    }
    return () => {
      active = false;
    };
  }, [hole, index, open, reduceMotion, step?.target, targetTop, targets]);
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
    <View ref={layerRef} style={styles.layer} pointerEvents="box-none" accessibilityViewIsModal>
      <Animated.View pointerEvents="auto" style={[styles.topScrim, { backgroundColor: palette.scrim }, topScrim]} />
      <Animated.View pointerEvents="none" style={[styles.band, band]}>
        <View style={[styles.side, { backgroundColor: palette.scrim }]} />
        <View style={styles.hole} />
        <View style={[styles.side, { backgroundColor: palette.scrim }]} />
      </Animated.View>
      <Animated.View pointerEvents="auto" style={[styles.below, { backgroundColor: palette.scrim }, below]} />
      <Animated.View style={[styles.tip, { backgroundColor: palette.deep }, tipPos]}>
        <ArrowUp color={palette.headerInk} size={20} strokeWidth={1.75} />
        <Text style={[styles.kicker, { color: withOpacity(palette.headerInk, 0.8) }, lang === "hi" && styles.hindi]}>
          {index + 1}/{steps.length}
        </Text>
        <Text style={[styles.title, { color: palette.headerInk }, lang === "hi" && styles.hindi]}>{step.title}</Text>
        <Text style={[styles.body, { color: palette.headerInk }, lang === "hi" && styles.hindi]}>{step.body}</Text>
        <View style={styles.row}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.coachSkip} onPress={close} style={styles.hit}>
            <Text style={[styles.skip, { color: withOpacity(palette.headerInk, 0.85) }, lang === "hi" && styles.hindi]}>{t.coachSkip}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={last ? (lastLabel ?? t.coachGotIt) : t.coachNext}
            onPress={() => {
              if (last) {
                if (onComplete) {
                  setOpen(false);
                  Promise.resolve(onComplete()).catch(() => undefined);
                } else {
                  close().catch(() => undefined);
                }
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
            <Text style={[styles.next, { color: palette.headerInk }, lang === "hi" && styles.hindi]}>{last ? (lastLabel ?? t.coachGotIt) : t.coachNext}</Text>
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
  kicker: { fontFamily: fonts.bodyStrong, fontSize: 12 },
  title: { fontFamily: fonts.title, fontSize: 18 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  hit: { minHeight: 48, justifyContent: "center", paddingHorizontal: 8 },
  skip: { fontFamily: fonts.bodyStrong },
  next: { fontFamily: fonts.bodyStrong },
  hindi: { fontFamily: fonts.hindi }
});

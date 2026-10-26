import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import { Check, PartyPopper, UtensilsCrossed } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { LaunchOverlay } from "../src/ui/launch";
import { PrimaryButton } from "../src/ui/buttons";
import { Badge, BottomSheet, EmptyState, KpiCard, OptionTile, ProgressSteps, Skeleton, Sparkline } from "../src/ui/bits";
import { useTheme } from "../src/ui/theme";
import { withOpacity } from "../src/ui/tokens";

/** Dev-only stage so each catalogue animation can be recorded on its own. */
export default function MotionLab() {
  const { clip } = useLocalSearchParams<{ clip?: string }>();
  const id = clip || "1";
  const { palette, reduceMotion } = useTheme();
  const [sheet, setSheet] = useState(id === "12");
  const [kpiReady, setKpiReady] = useState(id !== "7");
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState(id !== "8");
  const [status, setStatus] = useState("New");
  const shift = useSharedValue(0);
  const rise = useSharedValue(reduceMotion ? 0 : 16);
  const fade = useSharedValue(reduceMotion ? 1 : 0);
  const pop = useSharedValue(reduceMotion ? 1 : 0.9);
  const shake = useSharedValue(0);
  const fill = useSharedValue(0);
  const pill = useSharedValue(0);
  const hole = useSharedValue(reduceMotion ? 180 : 40);
  const tip = useSharedValue(reduceMotion ? 1 : 0.96);
  const glow = useSharedValue(0.35);
  const drop = useSharedValue(reduceMotion ? 0 : -90);

  useEffect(() => {
    if (id === "4") {
      const timer = setTimeout(() => setStep(3), 400);
      return () => clearTimeout(timer);
    }
    if (id === "8") {
      const timer = setTimeout(() => setRows(true), 500);
      return () => clearTimeout(timer);
    }
    if (id === "10") {
      const timer = setTimeout(() => setStatus("Preparing"), 700);
      return () => clearTimeout(timer);
    }
    if (id === "7") {
      AsyncStorage.removeItem("reviewqr.kpiDay").finally(() => setKpiReady(true));
    }
    return undefined;
  }, [id]);

  useEffect(() => {
    if (reduceMotion) return;
    if (id === "2") {
      shift.value = withRepeat(withTiming(48, { duration: 700, easing: Easing.out(Easing.cubic) }), 2, true);
      rise.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
      fade.value = withDelay(60, withTiming(1, { duration: 250 }));
    }
    if (id === "3") {
      shake.value = withDelay(500, withSequence(withTiming(6, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(6, { duration: 50 }), withTiming(0, { duration: 50 })));
    }
    if (id === "5") {
      fade.value = withTiming(1, { duration: 200 });
    }
    if (id === "6" || id === "14") {
      pop.value = withSpring(1, { damping: 14 });
    }
    if (id === "9") {
      drop.value = withSpring(0, { damping: 14 });
    }
    if (id === "10") {
      fill.value = withTiming(0.45, { duration: 700 });
    }
    if (id === "11") {
      pill.value = withDelay(200, withSpring(1, { damping: 18, stiffness: 220 }));
    }
    if (id === "13") {
      hole.value = withTiming(180, { duration: 250 });
      tip.value = withTiming(1, { duration: 250 });
    }
    if (id === "14") {
      glow.value = withRepeat(withSequence(withTiming(0.85, { duration: 1200 }), withTiming(0.35, { duration: 1200 })), 3, false);
    }
    if (id === "16") {
      rise.value = withRepeat(withSequence(withTiming(-4, { duration: 1500 }), withTiming(4, { duration: 1500 })), -1, true);
    }
  }, [drop, fade, fill, glow, hole, id, pill, pop, reduceMotion, rise, shake, shift, tip]);

  const photo = useAnimatedStyle(() => ({ transform: [{ translateX: shift.value }] }));
  const textIn = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: rise.value }] }));
  const shaken = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const grown = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const dropped = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }] }));
  const swipe = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  const tabPill = useAnimatedStyle(() => ({ transform: [{ translateX: pill.value * 88 }] }));
  const spotlight = useAnimatedStyle(() => ({ top: hole.value }));
  const tooltip = useAnimatedStyle(() => ({ opacity: tip.value, transform: [{ scale: tip.value }] }));
  const breath = useAnimatedStyle(() => ({ opacity: glow.value }));
  const floatY = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value }] }));
  const cross = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <View style={[styles.screen, { backgroundColor: palette.paper }]} testID={`motion-${id}`}>
      <Text style={{ color: palette.ink, fontSize: 22 }}>Motion {id}</Text>
      {id === "1" ? <PrimaryButton label="Continue" onPress={() => undefined} /> : null}
      {id === "2" ? (
        <View>
          <Animated.View style={[styles.block, { backgroundColor: palette.deep }, photo]} />
          <Animated.Text style={[{ color: palette.ink, fontSize: 22, marginTop: 12 }, textIn]}>Scan. Tap. Grow.</Animated.Text>
        </View>
      ) : null}
      {id === "3" ? (
        <Animated.View style={[styles.row, shaken]}>
          {Array.from({ length: 6 }, (_, index) => (
            <OtpBox key={index} index={index} reduceMotion={reduceMotion} color={palette.card} line={palette.line} ink={palette.ink} successColor={palette.accentSoft} />
          ))}
          <Check color={palette.deep} size={22} strokeWidth={2} />
        </Animated.View>
      ) : null}
      {id === "4" ? (
        <View style={styles.stack}>
          <ProgressSteps labels={["Business", "Look", "Link", "Menu"]} step={step} />
          <OptionTile icon={UtensilsCrossed} title="Cafe" selected onPress={() => undefined} />
        </View>
      ) : null}
      {id === "5" ? (
        <View>
          <View style={[styles.block, { backgroundColor: palette.card }]} />
          <Animated.View style={[styles.block, styles.overlay, { backgroundColor: palette.deep }, cross]} />
        </View>
      ) : null}
      {id === "6" ? (
        <View>
          {reduceMotion ? null : <LottieView source={require("../assets/lottie/confetti.json")} autoPlay loop={false} style={styles.lottie} />}
          <Animated.View style={[styles.block, { backgroundColor: palette.card }, grown]} />
        </View>
      ) : null}
      {id === "7" && kpiReady ? (
        <View style={styles.stack}>
          <KpiCard label="Scans" value="128" count={128} trend="up" points={[4, 8, 6, 12, 9, 16]} />
          <Sparkline points={[4, 8, 6, 12, 9, 16]} />
        </View>
      ) : null}
      {id === "8" ? (
        rows ? (
          <View style={styles.stack}>
            {[0, 1, 2].map((index) => (
              <EnterRow key={index} index={index} reduceMotion={reduceMotion} color={palette.card} />
            ))}
          </View>
        ) : (
          <View style={styles.stack}>
            <Skeleton height={56} />
            <Skeleton height={56} />
          </View>
        )
      ) : null}
      {id === "9" ? (
        <Animated.View style={[styles.card, { backgroundColor: palette.card }, dropped]}>
          <Text style={{ color: palette.ink }}>New order</Text>
          <Badge count={1} label="Orders" />
        </Animated.View>
      ) : null}
      {id === "10" ? (
        <View style={[styles.card, { backgroundColor: palette.card, overflow: "hidden" }]}>
          <Animated.View style={[styles.fill, { backgroundColor: palette.primary }, swipe]} />
          <Text style={{ color: palette.ink }}>{status}</Text>
        </View>
      ) : null}
      {id === "11" ? (
        <View style={[styles.tabs, { backgroundColor: palette.card }]}>
          <Animated.View style={[styles.pill, { backgroundColor: withOpacity(palette.primary, 0.16) }, tabPill]} />
          <Text style={[styles.tab, { color: palette.muted }]}>Home</Text>
          <Text style={[styles.tab, { color: palette.ink }]}>Orders</Text>
        </View>
      ) : null}
      {id === "12" ? <BottomSheet visible={sheet} title="Guide" onClose={() => setSheet(false)}><Text style={{ color: palette.ink }}>Drag down to close.</Text></BottomSheet> : null}
      {id === "13" ? (
        <View style={styles.coach}>
          <View style={[styles.scrim, { backgroundColor: palette.scrim }]} />
          <Animated.View style={[styles.hole, { backgroundColor: palette.paper }, spotlight]} />
          <Animated.View style={[styles.tip, { backgroundColor: palette.card }, tooltip]}>
            <Text style={{ color: palette.ink }}>Show your QR</Text>
          </Animated.View>
        </View>
      ) : null}
      {id === "14" ? (
        <View style={styles.qrFrame}>
          <Animated.View style={[styles.glow, { backgroundColor: palette.primary }, breath]} />
          <Animated.View style={[styles.qr, { backgroundColor: palette.card }, grown]}>
            {Array.from({ length: 36 }, (_, index) => (
              <QrTile key={index} index={index} reduceMotion={reduceMotion} color={palette.ink} />
            ))}
          </Animated.View>
        </View>
      ) : null}
      {id === "15" && !reduceMotion ? <LottieView source={require("../assets/lottie/nfc.json")} autoPlay loop style={styles.lottie} /> : null}
      {id === "15" && reduceMotion ? <Text style={{ color: palette.ink }}>Hold the phone near the tag</Text> : null}
      {id === "16" ? (
        <Animated.View style={floatY}>
          <EmptyState icon={PartyPopper} title="Nothing here yet" body="Add something to fill this list." />
        </Animated.View>
      ) : null}
      {id === "splash" ? <LaunchOverlay fontsReady sessionReady demo /> : null}
    </View>
  );
}

function OtpBox({ index, reduceMotion, color, line, ink, successColor }: { index: number; reduceMotion: boolean; color: string; line: string; ink: string; successColor: string }) {
  const scale = useSharedValue(reduceMotion ? 1 : 0.82);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    scale.value = reduceMotion ? 1 : withDelay(index * 40, withSpring(1, { damping: 14 }));
    const timer = setTimeout(() => setOk(true), 900);
    return () => clearTimeout(timer);
  }, [index, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.box, { backgroundColor: ok ? successColor : color, borderColor: line }, style]}><Text style={{ color: ink }}>{index + 1}</Text></Animated.View>;
}

function EnterRow({ index, reduceMotion, color }: { index: number; reduceMotion: boolean; color: string }) {
  const y = useSharedValue(reduceMotion ? 0 : 12);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    y.value = reduceMotion ? 0 : withDelay(index * 30, withTiming(0, { duration: 220 }));
    opacity.value = reduceMotion ? 1 : withDelay(index * 30, withTiming(1, { duration: 220 }));
  }, [index, opacity, reduceMotion, y]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }] }));
  return <Animated.View style={[styles.card, { backgroundColor: color }, style]} />;
}

function QrTile({ index, reduceMotion, color }: { index: number; reduceMotion: boolean; color: string }) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    opacity.value = reduceMotion ? 1 : withDelay(index * 16, withTiming(1, { duration: 180 }));
  }, [index, opacity, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: 0.92 + opacity.value * 0.08 }] }));
  return <Animated.View style={[styles.module, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 16 },
  stack: { gap: 12 },
  block: { width: 180, height: 120, borderRadius: 20 },
  overlay: { position: "absolute", left: 0, top: 0 },
  row: { flexDirection: "row", gap: 6, alignItems: "center" },
  box: { width: 36, height: 48, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  card: { minHeight: 64, borderRadius: 16, padding: 12, justifyContent: "center" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, width: "100%" },
  tabs: { height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  tab: { width: 88, textAlign: "center" },
  pill: { position: "absolute", left: 8, top: 8, bottom: 8, width: 80, borderRadius: 12 },
  coach: { height: 280 },
  scrim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 16 },
  hole: { position: "absolute", left: 24, width: 120, height: 48, borderRadius: 12 },
  tip: { position: "absolute", left: 24, top: 80, borderRadius: 16, padding: 12 },
  qrFrame: { width: 180, height: 180, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 170, height: 170, borderRadius: 24 },
  qr: { width: 144, height: 144, borderRadius: 12, flexDirection: "row", flexWrap: "wrap", padding: 8, gap: 3 },
  module: { width: 16, height: 16, borderRadius: 2 },
  lottie: { width: 200, height: 160 }
});

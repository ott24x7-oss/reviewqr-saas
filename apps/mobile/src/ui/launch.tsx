import { useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";
import Svg, { Path, Rect } from "react-native-svg";
import { Star } from "lucide-react-native";
import * as SplashScreen from "expo-splash-screen";
import { tapLight } from "./haptics";
import { useTheme } from "./theme";
import { fonts } from "../theme";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const GREEN = "#16A34A";

function Finder({ delay, x, y, skip }: { delay: number; x: number; y: number; skip: boolean }) {
  const offset = useSharedValue(skip ? 0 : 170);
  useEffect(() => {
    if (skip) {
      offset.value = 0;
      return;
    }
    offset.value = withDelay(delay, withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) }));
  }, [delay, offset, skip]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <AnimatedRect
      animatedProps={props}
      x={x}
      y={y}
      width={46}
      height={46}
      rx={8}
      stroke="#FFFFFF"
      strokeWidth={5}
      fill="none"
      strokeDasharray="170 170"
    />
  );
}

/** Cold-start launch. A warm resume does not remount the root, so it skips this. */
export function LaunchOverlay({
  fontsReady,
  sessionReady,
  demo
}: {
  fontsReady: boolean;
  sessionReady: boolean;
  demo?: boolean;
}) {
  const { reduceMotion, lowRam } = useTheme();
  const { width, height } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const started = useRef(0);
  useEffect(() => {
    if (started.current === 0) started.current = Date.now();
  }, []);
  const star = useSharedValue(reduceMotion ? 1 : 0);
  const spin = useSharedValue(reduceMotion ? 0 : -20);
  const word = useSharedValue(reduceMotion ? 1 : 0);
  const tag = useSharedValue(reduceMotion ? 0.7 : 0);
  const cover = useSharedValue(1);
  const hole = useSharedValue(0);
  const pulse = useSharedValue(1);
  const spark = useSharedValue(0);
  const skipDraw = reduceMotion || lowRam;

  useEffect(() => {
    if (!fontsReady) return;
    SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  useEffect(() => {
    if (!fontsReady) return;
    if (reduceMotion || lowRam || Date.now() - started.current > 1300) {
      star.value = 1;
      spin.value = 0;
      word.value = 1;
      tag.value = 0.7;
      return;
    }
    star.value = withDelay(350, withSequence(withSpring(1.15, { damping: 12 }), withTiming(1, { duration: 150 })));
    spin.value = withDelay(350, withTiming(0, { duration: 280 }));
    word.value = withDelay(550, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
    tag.value = withDelay(700, withTiming(0.7, { duration: 200 }));
    spark.value = withDelay(420, withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 260 })));
  }, [fontsReady, lowRam, reduceMotion, spark, spin, star, tag, word]);

  useEffect(() => {
    if (!fontsReady || sessionReady || reduceMotion) return;
    const timer = setTimeout(() => {
      pulse.value = withRepeat(withSequence(withTiming(1.04, { duration: 500 }), withTiming(1, { duration: 500 })), -1, true);
    }, 1300);
    return () => clearTimeout(timer);
  }, [fontsReady, pulse, reduceMotion, sessionReady]);

  useEffect(() => {
    if (!fontsReady || !sessionReady || gone) return;
    const elapsed = Date.now() - started.current;
    const wait = reduceMotion ? 200 : demo ? 1100 : Math.max(0, 980 - elapsed);
    const finish = () => setGone(true);
    const timer = setTimeout(() => {
      tapLight();
      pulse.value = 1;
      if (reduceMotion || lowRam) {
        cover.value = withTiming(0, { duration: reduceMotion ? 200 : 280 }, (finished) => {
          if (finished) runOnJS(finish)();
        });
        return;
      }
      hole.value = withTiming(Math.hypot(width, height), { duration: 380, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(finish)();
      });
    }, wait);
    const safety = setTimeout(finish, wait + 700);
    return () => {
      clearTimeout(timer);
      clearTimeout(safety);
    };
  }, [cover, demo, fontsReady, gone, hole, lowRam, pulse, reduceMotion, sessionReady, width, height]);

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 12 }, { scale: pulse.value }]
  }));
  const starStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }, { scale: star.value }]
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: cover.value }));
  const sparkStyle = useAnimatedStyle(() => ({ opacity: spark.value }));
  const holeProps = useAnimatedProps(() => {
    const r = Math.max(0, hole.value);
    const cx = width / 2;
    const cy = height / 2;
    const d = `M0 0 H${width} V${height} H0 Z M ${cx} ${cy} m ${-r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
    return { d };
  });

  if (!fontsReady || gone) return null;

  return (
    <View style={styles.layer} pointerEvents="auto" testID="launch-overlay" accessibilityElementsHidden>
      {reduceMotion || lowRam ? <Animated.View style={[styles.fill, fadeStyle]} /> : null}
      {reduceMotion || lowRam ? null : (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <AnimatedPath animatedProps={holeProps} fill={GREEN} fillRule="evenodd" />
        </Svg>
      )}
      <View style={styles.center} pointerEvents="none">
        <View>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Finder delay={0} x={8} y={8} skip={skipDraw} />
            <Finder delay={150} x={66} y={8} skip={skipDraw} />
            <Finder delay={300} x={8} y={66} skip={skipDraw} />
          </Svg>
          <Animated.View style={[styles.star, starStyle]}>
            <Star color="#FFFFFF" size={34} fill="#FFFFFF" strokeWidth={1.5} />
          </Animated.View>
          {lowRam || reduceMotion ? null : (
            <Animated.View style={[styles.spark, sparkStyle]} />
          )}
        </View>
        <Animated.Text style={[styles.word, wordStyle]}>QR24x7</Animated.Text>
        <Animated.Text style={[styles.tag, tagStyle]}>Scan. Tap. Grow.</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, zIndex: 50 },
  fill: { ...StyleSheet.absoluteFill, backgroundColor: GREEN },
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 8 },
  star: { position: "absolute", right: 14, bottom: 16 },
  spark: { position: "absolute", right: 8, top: 18, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  word: { color: "#FFFFFF", fontFamily: fonts.display, fontSize: 28 },
  tag: { color: "#FFFFFF", fontFamily: fonts.body, fontSize: 15 }
});

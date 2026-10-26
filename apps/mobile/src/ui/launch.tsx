import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, StyleSheet, useWindowDimensions, View, type AppStateStatus } from "react-native";
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
  withTiming,
  type SharedValue
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { Star } from "lucide-react-native";
import * as SplashScreen from "expo-splash-screen";
import { tapLight } from "./haptics";
import { useTheme } from "./theme";
import { fonts } from "../theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const GREEN = "#16A34A";
const FINDER = 170;

let leftForeground = false;
if (typeof AppState.addEventListener === "function") {
  AppState.addEventListener("change", (state: AppStateStatus) => {
    if (state === "background") leftForeground = true;
  });
}

function finderPath(x: number, y: number) {
  const size = 46;
  const radius = 8;
  const right = x + size;
  const bottom = y + size;
  return `M ${x + radius} ${y} H ${right - radius} A ${radius} ${radius} 0 0 1 ${right} ${y + radius} V ${bottom - radius} A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom} H ${x + radius} A ${radius} ${radius} 0 0 1 ${x} ${bottom - radius} V ${y + radius} A ${radius} ${radius} 0 0 1 ${x + radius} ${y} Z`;
}

function Finder({ delay, x, y, skip }: { delay: number; x: number; y: number; skip: boolean }) {
  const offset = useSharedValue(skip ? 0 : FINDER);
  useEffect(() => {
    if (skip) {
      offset.value = 0;
      return;
    }
    offset.value = withDelay(delay, withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) }));
  }, [delay, offset, skip]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <AnimatedPath
      animatedProps={props}
      d={finderPath(x, y)}
      stroke="#FFFFFF"
      strokeWidth={5}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={`${FINDER} ${FINDER}`}
    />
  );
}

function Spark({ delay, right, bottom, size }: { delay: number; right: number; bottom: number; size: number }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 240 }))
    );
  }, [delay, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.spark, { right, bottom, width: size, height: size, borderRadius: size / 2 }, style]} />;
}

/** Cold-start launch. A resume from the background skips it. */
export function LaunchOverlay({
  fontsReady,
  sessionReady,
  demo,
  warm = false,
  content
}: {
  fontsReady: boolean;
  sessionReady: boolean;
  demo?: boolean;
  warm?: boolean;
  content?: SharedValue<number>;
}) {
  const { reduceMotion, lowRam } = useTheme();
  const { width, height } = useWindowDimensions();
  const [gone, setGone] = useState(warm && !demo);
  const started = useRef(0);
  const revealing = useRef(false);
  useEffect(() => {
    if (started.current === 0) started.current = Date.now();
  }, []);
  const localContent = useSharedValue(1);
  const screen = content ?? localContent;
  const star = useSharedValue(reduceMotion ? 1 : 0);
  const spin = useSharedValue(reduceMotion ? 0 : -20);
  const word = useSharedValue(reduceMotion ? 1 : 0);
  const tag = useSharedValue(reduceMotion ? 0.7 : 0);
  const cover = useSharedValue(1);
  const reveal = useSharedValue(0);
  const pulse = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const fadeMode = reduceMotion || lowRam;
  const skipDraw = reduceMotion;

  useEffect(() => {
    if (!fontsReady) return;
    if ((warm && !demo) || sessionReady) {
      SplashScreen.hideAsync().catch(() => undefined);
      return;
    }
    const wait = Math.max(0, 1300 - (Date.now() - started.current));
    const timer = setTimeout(() => SplashScreen.hideAsync().catch(() => undefined), wait);
    return () => clearTimeout(timer);
  }, [demo, fontsReady, sessionReady, warm]);

  useEffect(() => {
    if (!fontsReady || (warm && !demo)) return;
    if (reduceMotion || Date.now() - started.current > 1300) {
      star.value = 1;
      spin.value = 0;
      word.value = 1;
      tag.value = 0.7;
      return;
    }
    star.value = withDelay(350, withSequence(withSpring(1.15, { damping: 12, stiffness: 180 }), withTiming(1, { duration: 120 })));
    spin.value = withDelay(350, withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }));
    word.value = withDelay(550, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }));
    tag.value = withDelay(700, withTiming(0.7, { duration: 200 }));
  }, [demo, fontsReady, reduceMotion, spin, star, tag, warm, word]);

  useEffect(() => {
    if (!fontsReady || sessionReady || reduceMotion || (warm && !demo)) return;
    const wait = Math.max(0, 1300 - (Date.now() - started.current));
    const timer = setTimeout(() => {
      pulse.value = withRepeat(withSequence(withTiming(1.04, { duration: 500 }), withTiming(1, { duration: 500 })), -1, true);
    }, wait);
    return () => clearTimeout(timer);
  }, [demo, fontsReady, pulse, reduceMotion, sessionReady, warm]);

  useEffect(() => {
    if (!fontsReady || !sessionReady || gone || (warm && !demo) || revealing.current) return;
    revealing.current = true;
    const elapsed = Date.now() - started.current;
    const wait = Math.max(0, (reduceMotion ? 0 : 900) - elapsed);
    let fired = false;
    const finish = () => {
      screen.value = 1;
      setGone(true);
    };
    const timer = setTimeout(() => {
      fired = true;
      tapLight();
      pulse.value = 1;
      if (fadeMode) {
        const duration = reduceMotion ? 200 : 280;
        screen.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
        cover.value = withTiming(0, { duration, easing: Easing.out(Easing.cubic) }, (done) => {
          if (done) runOnJS(finish)();
        });
        return;
      }
      logoOpacity.value = withTiming(0, { duration: 180 });
      screen.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
      reveal.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }, (done) => {
        if (done) runOnJS(finish)();
      });
    }, wait);
    const safety = setTimeout(finish, wait + 700);
    return () => {
      clearTimeout(timer);
      clearTimeout(safety);
      if (!fired) revealing.current = false;
    };
  }, [cover, demo, fadeMode, fontsReady, gone, logoOpacity, pulse, reduceMotion, reveal, screen, sessionReady, warm]);

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 12 }]
  }));
  const starStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }, { scale: star.value }]
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: cover.value }));
  const holdStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value * cover.value,
    transform: [{ scale: pulse.value }]
  }));
  const holeProps = useAnimatedProps(() => {
    const radius = Math.max(0, reveal.value * Math.hypot(width, height) * 0.5);
    const cx = width / 2;
    const cy = height / 2;
    const d = `M0 0 H${width} V${height} H0 Z M ${cx} ${cy} m ${-radius} 0 a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`;
    return { d };
  });

  if ((warm && !demo) || !fontsReady || gone) return null;

  return (
    <View style={styles.layer} pointerEvents="auto" testID="launch-overlay" accessibilityElementsHidden>
      {fadeMode ? <Animated.View style={[styles.fill, fadeStyle]} /> : null}
      {fadeMode ? null : (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <AnimatedPath animatedProps={holeProps} fill={GREEN} fillRule="evenodd" />
        </Svg>
      )}
      <Animated.View style={[styles.center, holdStyle]} pointerEvents="none">
        <View>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Finder delay={0} x={8} y={8} skip={skipDraw} />
            <Finder delay={150} x={66} y={8} skip={skipDraw} />
            <Finder delay={300} x={8} y={66} skip={skipDraw} />
          </Svg>
          <Animated.View style={[styles.star, starStyle]}>
            <Star color="#FFFFFF" size={34} fill="#FFFFFF" strokeWidth={1.5} />
          </Animated.View>
          {reduceMotion || lowRam ? null : (
            <>
              <Spark delay={420} right={4} bottom={52} size={5} />
              <Spark delay={500} right={36} bottom={6} size={4} />
              <Spark delay={560} right={-2} bottom={24} size={3} />
            </>
          )}
        </View>
        <Animated.Text style={[styles.word, wordStyle]}>QR24x7</Animated.Text>
        <Animated.Text style={[styles.tag, tagStyle]}>Scan. Tap. Grow.</Animated.Text>
      </Animated.View>
    </View>
  );
}

export function LaunchFrame({
  fontsReady,
  sessionReady,
  skip,
  children
}: {
  fontsReady: boolean;
  sessionReady: boolean;
  skip?: boolean;
  children: ReactNode;
}) {
  const [warm] = useState(leftForeground);
  const opacity = useSharedValue(warm || skip ? 1 : 0);
  const style = useAnimatedStyle(() => ({ flex: 1, opacity: opacity.value }));
  return (
    <View style={styles.frame}>
      <Animated.View style={style}>{children}</Animated.View>
      {skip ? null : (
        <LaunchOverlay fontsReady={fontsReady} sessionReady={sessionReady} warm={warm} content={opacity} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: GREEN },
  layer: { ...StyleSheet.absoluteFill, zIndex: 50 },
  fill: { ...StyleSheet.absoluteFill, backgroundColor: GREEN },
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 8 },
  star: { position: "absolute", right: 14, bottom: 16 },
  spark: { position: "absolute", backgroundColor: "#FFFFFF" },
  word: { color: "#FFFFFF", fontFamily: fonts.display, fontSize: 28 },
  tag: { color: "#FFFFFF", fontFamily: fonts.body, fontSize: 15 }
});

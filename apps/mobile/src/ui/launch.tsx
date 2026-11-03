import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Image, StyleSheet, useWindowDimensions, View, type AppStateStatus } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import * as SplashScreen from "expo-splash-screen";
import { tapLight } from "./haptics";
import { useTheme } from "./theme";
import { fonts } from "../theme";

const AnimatedPath = Animated.createAnimatedComponent(Path);

let leftForeground = false;
if (typeof AppState.addEventListener === "function") {
  AppState.addEventListener("change", (state: AppStateStatus) => {
    if (state === "background") leftForeground = true;
  });
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
  const { reduceMotion, lowRam, palette } = useTheme();
  const { width, height } = useWindowDimensions();
  const [gone, setGone] = useState(warm && !demo);
  const started = useRef(0);
  const revealing = useRef(false);
  useEffect(() => {
    if (started.current === 0) started.current = Date.now();
  }, []);
  const localContent = useSharedValue(1);
  const screen = content ?? localContent;
  const word = useSharedValue(reduceMotion ? 1 : 0);
  const tag = useSharedValue(reduceMotion ? 0.7 : 0);
  const cover = useSharedValue(1);
  const reveal = useSharedValue(0);
  const pulse = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const fadeMode = reduceMotion || lowRam;

  useEffect(() => {
    if (!fontsReady) return;
    if ((warm && !demo) || sessionReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [demo, fontsReady, sessionReady, warm]);

  useEffect(() => {
    if (!fontsReady || (warm && !demo)) return;
    if (reduceMotion || Date.now() - started.current > 1300) {
      word.value = 1;
      tag.value = 0.7;
      return;
    }
    word.value = withDelay(550, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }));
    tag.value = withDelay(700, withTiming(0.7, { duration: 200 }));
  }, [demo, fontsReady, reduceMotion, tag, warm, word]);

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
      {fadeMode ? <Animated.View style={[styles.fill, { backgroundColor: palette.primary }, fadeStyle]} /> : null}
      {fadeMode ? null : (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <AnimatedPath animatedProps={holeProps} fill={palette.primary} fillRule="evenodd" />
        </Svg>
      )}
      <Animated.View style={[styles.center, holdStyle]} pointerEvents="none">
        <Image source={require("../../assets/splash-mark.png")} resizeMode="contain" tintColor={palette.headerInk} style={styles.logo} />
        <Animated.Text style={[styles.word, { color: palette.headerInk }, wordStyle]}>QR24x7</Animated.Text>
        <Animated.Text style={[styles.tag, { color: palette.headerInk }, tagStyle]}>Scan. Tap. Grow.</Animated.Text>
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
  const { palette } = useTheme();
  return (
    <View style={[styles.frame, { backgroundColor: palette.primary }]}>
      <Animated.View style={style}>{children}</Animated.View>
      {skip ? null : (
        <LaunchOverlay fontsReady={fontsReady} sessionReady={sessionReady} warm={warm} content={opacity} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  layer: { ...StyleSheet.absoluteFill, zIndex: 50 },
  fill: StyleSheet.absoluteFill,
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 8 },
  logo: { width: 120, height: 120 },
  word: { fontFamily: fonts.display, fontSize: 28 },
  tag: { fontFamily: fonts.body, fontSize: 15 }
});

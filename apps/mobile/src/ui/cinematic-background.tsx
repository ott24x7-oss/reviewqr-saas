import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { CINEMATIC_AURORA, type CinematicAccent } from "./tokens";

function rgba(hex: string, alpha: number) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}

export function CinematicBackground({
  accent,
  reduceMotion,
  lowRam
}: {
  accent: CinematicAccent;
  reduceMotion: boolean;
  lowRam: boolean;
}) {
  const phase = useSharedValue(0);
  const colors = CINEMATIC_AURORA[accent];
  const still = reduceMotion || lowRam;

  useEffect(() => {
    if (still) {
      phase.value = 0;
      return;
    }
    phase.value = withRepeat(withTiming(1, { duration: 20_000, easing: Easing.linear }), -1, true);
    return () => cancelAnimation(phase);
  }, [phase, still]);

  const first = useAnimatedStyle(() => ({
    transform: [
      { translateX: still ? 0 : -48 + phase.value * 96 },
      { translateY: still ? 0 : 20 - phase.value * 40 },
      { rotate: `${still ? -14 : -14 + phase.value * 28}deg` },
      { scale: still ? 1 : 1 + phase.value * 0.12 }
    ]
  }));
  const second = useAnimatedStyle(() => ({
    transform: [
      { translateX: still ? 0 : 50 - phase.value * 100 },
      { translateY: still ? 0 : -18 + phase.value * 36 },
      { rotate: `${still ? 18 : 18 - phase.value * 36}deg` },
      { scale: still ? 1 : 1.08 - phase.value * 0.12 }
    ]
  }));

  return (
    <View pointerEvents="none" style={styles.root}>
      <View style={styles.base} />
      <Animated.View style={[styles.aurora, first]}>
        <LinearGradient
          colors={[rgba(colors[0], 0.1), rgba(colors[1], 0.055), "rgba(5,5,7,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glowOne}
        />
      </Animated.View>
      <Animated.View style={[styles.aurora, second]}>
        <LinearGradient
          colors={[rgba(colors[1], 0.085), rgba(colors[2], 0.05), "rgba(5,5,7,0)"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.glowTwo}
        />
      </Animated.View>
      <LinearGradient
        colors={["rgba(0,0,0,0.48)", "rgba(0,0,0,0)", "rgba(0,0,0,0.42)"]}
        locations={[0, 0.46, 1]}
        style={styles.vignette}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#050507", overflow: "hidden" },
  base: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "#050507" },
  aurora: { position: "absolute", width: "145%", height: "64%", left: "-22%", top: "6%" },
  glowOne: { flex: 1, borderRadius: 999 },
  glowTwo: { flex: 1, borderRadius: 999 },
  vignette: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }
});

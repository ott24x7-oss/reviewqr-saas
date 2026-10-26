import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CinematicBackground } from "./cinematic-background";
import { useTheme } from "./theme";

export function Screen({
  children,
  topInset = true,
  statusBarColor,
  style
}: {
  children: ReactNode;
  /** Reserve the status-bar area before placing screen content. */
  topInset?: boolean;
  /** Paint the status-bar area with a solid theme color. */
  statusBarColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const { palette, appTheme, cinematicAccent, scheme, reduceMotion, lowRam } = useTheme();
  const statusColor = statusBarColor ?? palette.paper;
  const enteringCinematic = palette.cinematic && !reduceMotion && !lowRam;
  const opacity = useSharedValue(enteringCinematic ? 0 : 1);
  const scale = useSharedValue(enteringCinematic ? 0.98 : 1);
  const appliedTheme = useRef(`${appTheme}:${cinematicAccent}:${scheme}`);
  const mounted = useRef(false);

  useEffect(() => {
    const next = `${appTheme}:${cinematicAccent}:${scheme}`;
    if (!mounted.current) {
      mounted.current = true;
      if (enteringCinematic) {
        opacity.value = withTiming(1, { duration: 240 });
        scale.value = withTiming(1, { duration: 240 });
      }
      return;
    }
    if (appliedTheme.current === next) return;
    appliedTheme.current = next;
    if (reduceMotion || lowRam) {
      opacity.value = 1;
      scale.value = 1;
      return;
    }
    opacity.value = 0.86;
    scale.value = 0.985;
    opacity.value = withTiming(1, { duration: 220 });
    scale.value = withTiming(1, { duration: 220 });
  }, [appTheme, cinematicAccent, enteringCinematic, lowRam, opacity, reduceMotion, scale, scheme]);

  const transition = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));
  return (
    <View style={[styles.root, { backgroundColor: statusColor }, style]}>
      <View pointerEvents="none" style={{ height: topInset ? insets.top : 0, backgroundColor: statusColor, zIndex: 1 }} />
      {palette.cinematic ? (
        <CinematicBackground accent={cinematicAccent} reduceMotion={reduceMotion} lowRam={lowRam} />
      ) : null}
      <Animated.View style={[transition, { backgroundColor: palette.bg }]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }
});

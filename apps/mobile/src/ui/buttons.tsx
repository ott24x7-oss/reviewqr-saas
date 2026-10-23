import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { tapLight } from "./haptics";
import { useTheme } from "./theme";

type PressProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function PrimaryButton({ label, onPress, disabled, icon: Icon, testID, style, accessibilityLabel }: PressProps) {
  const { lang } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const scale = useSharedValue(1);
  const sheen = useSharedValue(-1.2);

  useEffect(() => {
    if (reduceMotion) return;
    sheen.value = -1.2;
    sheen.value = withTiming(1.4, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [reduceMotion, sheen]);

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sheen.value * 220 }, { rotate: "18deg" }]
  }));

  return (
    <Animated.View style={[scaleStyle, disabled && styles.dim, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        testID={testID}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 320 });
          if (!disabled) tapLight();
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 320 });
        }}
        style={styles.hit}
      >
        <LinearGradient
          colors={[palette.bright, palette.deep, palette.deep]}
          locations={[0, 0.42, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primary}
        >
          <View style={styles.highlight} />
          {reduceMotion ? null : (
            <Animated.View pointerEvents="none" style={[styles.sheen, sheenStyle]} />
          )}
          <View style={styles.row}>
            {Icon ? <Icon color={palette.onPrimary} size={20} strokeWidth={1.75} /> : null}
            <Text style={[styles.primaryText, lang === "hi" && styles.hindi]}>{label}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export function SecondaryButton({ label, onPress, disabled, icon: Icon, testID, style, accessibilityLabel }: PressProps) {
  const { lang } = useI18n();
  const { palette } = useTheme();
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[scaleStyle, disabled && styles.dim, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        testID={testID}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 320 });
          if (!disabled) tapLight();
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 320 });
        }}
        style={[styles.secondary, { backgroundColor: palette.card, borderColor: palette.line }]}
      >
        {Icon ? <Icon color={palette.ink} size={20} strokeWidth={1.75} /> : null}
        <Text style={[styles.secondaryText, { color: palette.ink }, lang === "hi" && styles.hindi]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function TextButton({ label, onPress, disabled, testID, accessibilityLabel }: Omit<PressProps, "icon" | "style">) {
  const { lang } = useI18n();
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      testID={testID}
      onPress={() => {
        tapLight();
        onPress();
      }}
      style={styles.textHit}
    >
      <Text style={[styles.textLabel, { color: palette.muted }, lang === "hi" && styles.hindi]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { minHeight: 56, borderRadius: 16 },
  primary: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 18,
    shadowColor: "#16A34A",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  highlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)"
  },
  sheen: {
    position: "absolute",
    top: -20,
    width: 48,
    height: 120,
    backgroundColor: "rgba(255,255,255,0.35)"
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  primaryText: { color: "#FFFFFF", fontFamily: fonts.bodyStrong, fontSize: 16 },
  secondary: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  secondaryText: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  textHit: { minHeight: 48, justifyContent: "center", alignItems: "center", paddingHorizontal: 12 },
  textLabel: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  dim: { opacity: 0.5 },
  hindi: { fontFamily: fonts.hindiStrong }
});

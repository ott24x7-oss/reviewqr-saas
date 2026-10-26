import { LinearGradient } from "expo-linear-gradient";
import type { LucideIcon } from "lucide-react-native";
import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
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
import { withOpacity } from "./tokens";

type PressProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Shown under the button only while it is disabled. */
  hint?: string;
  icon?: LucideIcon;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function PrimaryButton({ label, onPress, disabled, hint, icon: Icon, testID, style, accessibilityLabel }: PressProps) {
  const { lang } = useI18n();
  const { palette, reduceMotion, lowRam } = useTheme();
  const off = !!disabled;
  const limitedMotion = reduceMotion || (palette.cinematic && lowRam);
  const scale = useSharedValue(1);
  const sheen = useSharedValue(-1.2);

  useEffect(() => {
    if (limitedMotion || off) return;
    sheen.value = -1.2;
    sheen.value = withTiming(1.4, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [limitedMotion, sheen, off]);

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle: ViewStyle = Platform.OS === "web"
    ? { boxShadow: `0 10px 24px ${withOpacity(palette.primary, 0.35)}` } as ViewStyle
    : { shadowColor: palette.primary, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8 };
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sheen.value * 280 }, { rotate: "18deg" }]
  }));

  const face = (
    <View style={styles.row}>
      {Icon ? <Icon color={off ? palette.muted : palette.onPrimary} size={20} strokeWidth={1.75} /> : null}
      <Text style={[off ? [styles.disabledText, { color: palette.muted }] : [styles.primaryText, { color: palette.onPrimary }], lang === "hi" && styles.hindi]}>{label}</Text>
    </View>
  );

  return (
    <Animated.View style={[scaleStyle, style]}>
      <View style={off ? undefined : [styles.glow, glowStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={off ? hint : undefined}
          accessibilityState={{ disabled: off }}
          disabled={off}
          testID={testID}
          onPress={onPress}
          onPressIn={() => {
            if (off) return;
            scale.value = withSpring(0.97, { damping: 15, stiffness: 320 });
            tapLight();
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 15, stiffness: 320 });
          }}
          style={styles.hit}
        >
          {off ? (
            <View style={[styles.primary, styles.disabledFill, { backgroundColor: palette.line }]}>{face}</View>
          ) : (
            <LinearGradient
              colors={[...palette.buttonGradient]}
              locations={[0, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primary}
            >
              <View style={[styles.highlight, { backgroundColor: withOpacity(palette.headerInk, 0.35) }]} />
              {limitedMotion ? null : <Animated.View pointerEvents="none" style={[styles.sheen, { backgroundColor: withOpacity(palette.headerInk, 0.28) }, sheenStyle]} />}
              {face}
            </LinearGradient>
          )}
        </Pressable>
      </View>
      {off && hint ? <Text style={[styles.hint, { color: palette.muted }, lang === "hi" && styles.hindiHint]}>{hint}</Text> : null}
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
      <Text style={[styles.textLabel, { color: palette.muted }, disabled && styles.dimText, lang === "hi" && styles.hindi]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { minHeight: 56, borderRadius: 16 },
  glow: { borderRadius: 16 },
  primary: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 18
  },
  disabledFill: {
    opacity: 0.45
  },
  highlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  sheen: {
    position: "absolute",
    top: -28,
    left: -80,
    width: 36,
    height: 140,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  primaryText: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  disabledText: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  hint: { marginTop: 8, textAlign: "center", fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
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
  dimText: { opacity: 0.45 },
  hindi: { fontFamily: fonts.hindiStrong },
  hindiHint: { fontFamily: fonts.hindi }
});

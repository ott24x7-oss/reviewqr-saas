import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { PrimaryButton, SecondaryButton, TextButton } from "./buttons";
import { usePalette, useTheme } from "./theme";

export function Field({ label, tone = "paper", ...props }: TextInputProps & { label: string; tone?: "dark" | "paper" }) {
  const { lang } = useI18n();
  const palette = usePalette();
  const paper = tone !== "dark";
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: paper ? palette.muted : palette.headerInk }, lang === "hi" && styles.hindi]}>{label}</Text>
      <TextInput
        placeholderTextColor={palette.muted}
        accessibilityLabel={label}
        style={[
          styles.input,
          {
            borderColor: palette.line,
            backgroundColor: paper ? palette.card : "rgba(255,255,255,0.06)",
            color: paper ? palette.ink : palette.headerInk
          }
        ]}
        {...props}
      />
    </View>
  );
}

export function FilledField({ label, value, onFocus, onBlur, style, ...props }: TextInputProps & { label: string }) {
  const { lang } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const [focused, setFocused] = useState(false);
  const lifted = focused || String(value ?? "").length > 0;
  const rise = useSharedValue(lifted ? 1 : 0);
  useEffect(() => {
    rise.value = withTiming(lifted ? 1 : 0, { duration: reduceMotion ? 0 : 160 });
  }, [lifted, reduceMotion, rise]);
  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - rise.value) * 14 }]
  }));
  return (
    <View style={[styles.filled, { backgroundColor: palette.paper, borderColor: focused ? palette.primary : "transparent" }]}>
      <Animated.Text
        style={[
          styles.floatLabel,
          { color: focused ? palette.deep : palette.muted, fontSize: lifted ? 11 : 16 },
          labelStyle,
          lang === "hi" && styles.hindi
        ]}
      >
        {label}
      </Animated.Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        value={value}
        placeholder=""
        placeholderTextColor="transparent"
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.filledInput, { color: palette.ink }, lang === "hi" && styles.hindi, style]}
      />
    </View>
  );
}

export function StickyAction({ children }: { children: ReactNode }) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.sticky,
        {
          backgroundColor: palette.paper,
          borderTopColor: palette.line,
          paddingBottom: Math.max(12, insets.bottom)
        }
      ]}
    >
      {children}
    </View>
  );
}

export function PillButton({
  label,
  onPress,
  disabled,
  hint,
  tone = "primary"
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  hint?: string;
  tone?: "primary" | "ghost" | "dark" | "outline";
}) {
  if (tone === "ghost") return <TextButton label={label} onPress={onPress} disabled={disabled} />;
  if (tone === "outline") return <SecondaryButton label={label} onPress={onPress} disabled={disabled} />;
  return <PrimaryButton label={label} onPress={onPress} disabled={disabled} hint={hint} />;
}

export function Muted({ children }: { children: string }) {
  const { lang } = useI18n();
  const palette = usePalette();
  return <Text style={[styles.muted, { color: palette.muted }, lang === "hi" && styles.hindi]}>{children}</Text>;
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontFamily: fonts.bodyStrong, fontSize: 14 },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: fonts.body
  },
  muted: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  filled: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    justifyContent: "flex-end",
    paddingBottom: 8
  },
  floatLabel: { position: "absolute", left: 14, top: 8, fontFamily: fonts.bodyStrong },
  filledInput: { minHeight: 26, fontSize: 16, fontFamily: fonts.body, padding: 0 },
  sticky: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  hindi: { fontFamily: fonts.hindi }
});

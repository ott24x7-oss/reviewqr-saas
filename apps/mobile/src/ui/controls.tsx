import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { fonts, colors } from "../theme";
import { useI18n } from "../i18n";

export function Field({ label, tone = "dark", ...props }: TextInputProps & { label: string; tone?: "dark" | "paper" }) {
  const { lang } = useI18n();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, tone === "paper" && styles.paperLabel, lang === "hi" && styles.hindi]}>{label}</Text>
      <TextInput
        placeholderTextColor={tone === "paper" ? colors.inkSoft : colors.muted}
        style={[styles.input, tone === "paper" && styles.paperInput]}
        {...props}
      />
    </View>
  );
}

export function PillButton({
  label,
  onPress,
  disabled,
  tone = "primary"
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "ghost" | "dark" | "outline";
}) {
  const { lang } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, tone === "ghost" && styles.ghost, tone === "dark" && styles.dark, tone === "outline" && styles.outline, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, tone === "ghost" && styles.ghostText, tone === "dark" && styles.darkText, tone === "outline" && styles.outlineText, lang === "hi" && styles.hindiStrong]}>{label}</Text>
    </Pressable>
  );
}

export function Muted({ children }: { children: string }) {
  const { lang } = useI18n();
  return <Text style={[styles.muted, lang === "hi" && styles.hindi]}>{children}</Text>;
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { color: colors.muted, fontFamily: fonts.bodyStrong, fontSize: 14 },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.04)",
    color: colors.white,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: fonts.body
  },
  paperInput: {
    borderColor: "#DDD6C8",
    backgroundColor: colors.white,
    color: colors.ink
  },
  paperLabel: { color: colors.inkSoft },
  button: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cyan,
    paddingHorizontal: 18
  },
  dark: { backgroundColor: colors.ink },
  ghost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
  outline: { backgroundColor: colors.card, borderWidth: 1, borderColor: "#DDD6C8" },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.navy, fontFamily: fonts.bodyStrong, fontSize: 16 },
  darkText: { color: colors.white },
  ghostText: { color: colors.cyanSoft },
  outlineText: { color: colors.ink },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  hindi: { fontFamily: fonts.hindi },
  hindiStrong: { fontFamily: fonts.hindiStrong }
});

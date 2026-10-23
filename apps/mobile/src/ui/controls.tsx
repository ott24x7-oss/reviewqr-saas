import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { PrimaryButton, SecondaryButton, TextButton } from "./buttons";
import { usePalette } from "./theme";

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
  hindi: { fontFamily: fonts.hindi }
});

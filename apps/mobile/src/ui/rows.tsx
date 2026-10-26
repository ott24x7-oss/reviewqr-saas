import type { LucideIcon } from "lucide-react-native";
import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { useTheme } from "./theme";

export const rowTint = {
  green: { bg: "#DCFCE7", fg: "#0F7A37" },
  amber: { bg: "#FEF3C7", fg: "#92400E" },
  blue: { bg: "#DBEAFE", fg: "#1E40AF" },
  pink: { bg: "#FCE7F3", fg: "#9D174D" },
  ink: { bg: "#E7E0D4", fg: "#1C1813" }
} as const;

export type RowTint = keyof typeof rowTint;

export function SectionHeader({ label }: { label: string }) {
  const { lang } = useI18n();
  const { palette } = useTheme();
  return <Text style={[styles.section, { color: palette.muted }, lang === "hi" && styles.hindi]}>{label}</Text>;
}

export function Group({ children }: { children: ReactNode }) {
  const { palette } = useTheme();
  return <View style={[styles.group, { backgroundColor: palette.card }]}>{children}</View>;
}

export function GroupRow({
  icon: Icon,
  tint = "green",
  title,
  hint,
  onPress,
  danger,
  selected
}: {
  icon: LucideIcon;
  tint?: RowTint;
  title: string;
  hint?: string;
  onPress?: () => void;
  danger?: boolean;
  selected?: boolean;
}) {
  const { lang } = useI18n();
  const { palette } = useTheme();
  const colors = tint === "green" ? { bg: palette.accentSoft, fg: palette.deep } : rowTint[tint];
  const body = (
    <>
      <View style={[styles.ico, { backgroundColor: colors.bg }]}>
        <Icon color={danger ? palette.danger : colors.fg} size={20} strokeWidth={1.75} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: danger ? palette.danger : palette.ink }, lang === "hi" && styles.hindiStrong]} numberOfLines={1}>
          {title}
        </Text>
        {hint ? (
          <Text style={[styles.hint, { color: palette.muted }, lang === "hi" && styles.hindi]} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      <ChevronRight color={selected ? palette.deep : palette.muted} size={18} strokeWidth={2} />
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${title}. ${hint}` : title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.row}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    fontFamily: fonts.bodyStrong,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 6,
    marginLeft: 4
  },
  group: { borderRadius: 20, overflow: "hidden" },
  row: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  ico: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  hint: { fontFamily: fonts.body, fontSize: 13 },
  hindi: { fontFamily: fonts.hindi },
  hindiStrong: { fontFamily: fonts.hindiStrong }
});

import { CircleHelp } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { BottomSheet } from "../ui/bits";
import { useTheme } from "../ui/theme";

export function HelpButton({ title, body }: { title: string; body: string }) {
  const { lang } = useI18n();
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={() => setOpen(true)}
        style={styles.hit}
      >
        <CircleHelp color={palette.ink} size={22} strokeWidth={1.75} />
      </Pressable>
      <BottomSheet visible={open} title={title} onClose={() => setOpen(false)}>
        <Text style={[styles.body, { color: palette.ink }, lang === "hi" && styles.hindi]}>{body}</Text>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  hit: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  hindi: { fontFamily: fonts.hindi }
});

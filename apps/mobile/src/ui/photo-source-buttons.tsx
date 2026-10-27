import { Camera, Image as ImageIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts } from "../theme";
import type { Palette } from "./tokens";

const PHOTO_ACTIONS = {
  camera: { en: "Take photo", hi: "फ़ोटो लें" },
  gallery: { en: "Choose from gallery", hi: "गैलरी से चुनें" }
} as const;

export function PhotoSourceButtons({
  lang,
  palette,
  onCamera,
  onGallery,
  disabled = false
}: {
  lang: string;
  palette: Palette;
  onCamera: () => void;
  onGallery: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${PHOTO_ACTIONS.camera.en} · ${PHOTO_ACTIONS.camera.hi}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onCamera}
        style={[styles.button, { borderColor: palette.line, backgroundColor: palette.paper }]}
      >
        <Camera color={palette.deep} size={24} strokeWidth={1.75} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        <Text style={[styles.primary, { color: palette.ink }, lang === "hi" && styles.hindi]}>
          {lang === "hi" ? PHOTO_ACTIONS.camera.hi : PHOTO_ACTIONS.camera.en}
        </Text>
        <Text style={[styles.secondary, { color: palette.deep }, lang === "hi" ? null : styles.hindi]}>
          {lang === "hi" ? PHOTO_ACTIONS.camera.en : PHOTO_ACTIONS.camera.hi}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${PHOTO_ACTIONS.gallery.en} · ${PHOTO_ACTIONS.gallery.hi}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onGallery}
        style={[styles.button, { borderColor: palette.line, backgroundColor: palette.paper }]}
      >
        <ImageIcon color={palette.deep} size={24} strokeWidth={1.75} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        <Text style={[styles.primary, { color: palette.ink }, lang === "hi" && styles.hindi]}>
          {lang === "hi" ? PHOTO_ACTIONS.gallery.hi : PHOTO_ACTIONS.gallery.en}
        </Text>
        <Text style={[styles.secondary, { color: palette.deep }, lang === "hi" ? null : styles.hindi]}>
          {lang === "hi" ? PHOTO_ACTIONS.gallery.en : PHOTO_ACTIONS.gallery.hi}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  button: {
    flex: 1,
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  primary: { fontFamily: fonts.bodyStrong, fontSize: 14, textAlign: "center" },
  secondary: { fontFamily: fonts.hindi, fontSize: 13, textAlign: "center" },
  hindi: { fontFamily: fonts.hindi }
});

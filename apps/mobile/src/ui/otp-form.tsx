import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { channelLabel, digitsFrom } from "../auth/otp";
import { useI18n } from "../i18n";
import { colors, fonts } from "../theme";
import { PillButton } from "./controls";

export function OtpCodeForm({
  channel,
  devCode,
  code,
  onCode,
  secondsLeft,
  onResend,
  onChangeNumber,
  onSubmit,
  submitting,
  error
}: {
  channel?: string;
  devCode?: string | null;
  code: string;
  onCode: (value: string) => void;
  secondsLeft: number;
  onResend: () => void;
  onChangeNumber: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  error?: string | null;
}) {
  const { lang, t } = useI18n();
  const ready = secondsLeft === 0;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.sent, lang === "hi" && styles.hindi]}>{channelLabel(channel, lang)}</Text>
      <TextInput
        accessibilityLabel={t.codeTitle}
        value={code}
        onChangeText={(value) => onCode(digitsFrom(value))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        maxLength={6}
        style={styles.code}
      />
      {devCode ? (
        <Text style={styles.dev}>
          {t.devHint}: {devCode}
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PillButton label={t.verify} onPress={onSubmit} disabled={submitting || code.length !== 6} />
      <Pressable accessibilityRole="button" disabled={!ready || submitting} onPress={onResend}>
        <Text style={[styles.link, !ready && styles.wait, lang === "hi" && styles.hindi]}>
          {ready ? t.resend : `${t.resendIn} ${secondsLeft}s`}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onChangeNumber}>
        <Text style={[styles.link, lang === "hi" && styles.hindi]}>{t.changeNumber}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  sent: { color: colors.white, fontFamily: fonts.bodyStrong, fontSize: 16 },
  code: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cyan,
    color: colors.white,
    fontSize: 32,
    letterSpacing: 8,
    textAlign: "center",
    fontFamily: fonts.title
  },
  dev: { color: colors.cyanSoft, fontFamily: fonts.bodyStrong, fontSize: 16 },
  error: { color: "#FFB4B4", fontFamily: fonts.body },
  link: { color: colors.cyanSoft, fontFamily: fonts.bodyStrong, fontSize: 16, minHeight: 44, textAlignVertical: "center" },
  wait: { color: colors.muted },
  hindi: { fontFamily: fonts.hindi }
});

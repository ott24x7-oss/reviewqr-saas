import { Check } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { devSurfaceAllowed } from "../auth/dev-surface";
import { channelLabel, digitsFrom } from "../auth/otp";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { PrimaryButton } from "./buttons";
import { tapError, tapSuccess } from "./haptics";
import { useTheme } from "./theme";

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const last = digits.slice(-4);
  return last ? `+91 •••• ${last}` : phone;
}

export function OtpCodeForm({
  channel,
  devCode,
  code,
  onCode,
  secondsLeft,
  resendAfterSec = 30,
  phone,
  onResend,
  onChangeNumber,
  onSubmit,
  submitting,
  error,
  success
}: {
  channel?: string;
  devCode?: string | null;
  code: string;
  onCode: (value: string) => void;
  secondsLeft: number;
  resendAfterSec?: number;
  phone?: string;
  onResend: () => void;
  onChangeNumber: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  error?: string | null;
  success?: boolean;
}) {
  const { lang, t } = useI18n();
  const { palette, reduceMotion } = useTheme();
  const input = useRef<TextInputInstance>(null);
  const [callNote, setCallNote] = useState(false);
  const ready = secondsLeft === 0;
  const sent = useRef("");
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (code.length === 6 && sent.current !== code && !submitting) {
      sent.current = code;
      onSubmit();
    }
    if (code.length < 6) sent.current = "";
  }, [code, onSubmit, submitting]);

  useEffect(() => {
    if (!error) return;
    tapError();
    if (reduceMotion) return;
    shake.value = withSequence(
      withTiming(6, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [error, reduceMotion, shake]);

  useEffect(() => {
    if (success) tapSuccess();
  }, [success]);

  const total = Math.max(1, resendAfterSec);
  const remain = Math.max(0, Math.min(1, secondsLeft / total));
  const ring = 2 * Math.PI * 12;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sent, { color: palette.ink }, lang === "hi" && styles.hindi]}>{channelLabel(channel, lang)}</Text>
      {phone ? (
        <Text style={[styles.phone, { color: palette.ink }, lang === "hi" && styles.hindi]}>{maskPhone(phone)}</Text>
      ) : null}
      <Pressable accessible={false} onPress={() => input.current?.focus()}>
        <Animated.View style={[styles.boxes, shakeStyle]}>
          {Array.from({ length: 6 }, (_, index) => (
            <OtpCell
              key={index}
              index={index}
              digit={code[index] ?? ""}
              active={index === code.length}
              success={Boolean(success)}
              reduceMotion={reduceMotion}
            />
          ))}
        </Animated.View>
      </Pressable>
      <TextInput
        ref={input}
        accessibilityLabel={t.codeTitle}
        value={code}
        onChangeText={(value) => onCode(digitsFrom(value))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        maxLength={6}
        style={styles.hidden}
      />
      {devSurfaceAllowed() && devCode ? (
        <Text style={[styles.dev, { color: palette.deep }]}>
          {t.devHint}: {devCode}
        </Text>
      ) : null}
      {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
      <View style={styles.timerRow}>
        <View accessibilityElementsHidden style={{ transform: [{ rotate: "-90deg" }] }}>
          <Svg width={28} height={28}>
            <Circle cx={14} cy={14} r={12} stroke={palette.line} strokeWidth={3} fill="none" />
            <Circle
              cx={14}
              cy={14}
              r={12}
              stroke={palette.primary}
              strokeWidth={3}
              fill="none"
              strokeDasharray={`${ring} ${ring}`}
              strokeDashoffset={ring * remain}
              strokeLinecap="round"
            />
          </Svg>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={ready ? t.resend : `${t.resendIn} ${secondsLeft}`} accessibilityState={{ disabled: !ready || submitting }} disabled={!ready || submitting} onPress={onResend} style={styles.linkHit}>
          <Text style={[styles.link, { color: ready ? palette.deep : palette.muted }, lang === "hi" && styles.hindi]}>
            {ready ? t.resend : `${t.resendIn} ${secondsLeft}s`}
          </Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t.otpCall} onPress={() => setCallNote(true)} style={styles.linkHit}>
        <Text style={[styles.link, { color: palette.deep }, lang === "hi" && styles.hindi]}>{t.otpCall}</Text>
      </Pressable>
      {callNote ? <Text style={[styles.note, { color: palette.muted }]}>{t.otpCallUnavailable}</Text> : null}
      <PrimaryButton
        label={t.verify}
        onPress={onSubmit}
        disabled={submitting || code.length !== 6}
        hint={code.length !== 6 ? t.hintCode : t.hintWait}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={t.changeNumber} onPress={onChangeNumber} style={styles.linkHit}>
        <Text style={[styles.link, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.changeNumber}</Text>
      </Pressable>
    </View>
  );
}

function OtpCell({
  index,
  digit,
  active,
  success,
  reduceMotion
}: {
  index: number;
  digit: string;
  active: boolean;
  success: boolean;
  reduceMotion: boolean;
}) {
  const { palette } = useTheme();
  const scale = useSharedValue(reduceMotion ? 1 : 0.82);
  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      return;
    }
    scale.value = withDelay(index * 40, withTiming(1, { duration: 220 }));
  }, [index, reduceMotion, scale]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.slot}>
      {index === 3 ? <Text style={[styles.dash, { color: palette.muted }]}>—</Text> : null}
      <Animated.View
        style={[
          styles.box,
          {
            backgroundColor: success ? palette.accentSoft : palette.card,
            borderColor: success ? palette.primary : active ? palette.primary : palette.line
          },
          anim
        ]}
      >
        <Text style={[styles.digit, { color: success ? palette.deep : palette.ink }]}>{digit}</Text>
        {success && index === 5 ? <Check color={palette.deep} size={16} strokeWidth={2.4} /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  sent: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  phone: { fontFamily: fonts.title, fontSize: 20 },
  boxes: { flexDirection: "row", alignItems: "center", gap: 6 },
  slot: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  dash: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  box: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center"
  },
  digit: { fontFamily: fonts.title, fontSize: 22 },
  hidden: { position: "absolute", opacity: 0.02, height: 48, width: 120 },
  dev: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  error: { fontFamily: fonts.body, fontSize: 14 },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  linkHit: { minHeight: 48, justifyContent: "center" },
  link: { fontFamily: fonts.bodyStrong, fontSize: 16 },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  hindi: { fontFamily: fonts.hindi }
});

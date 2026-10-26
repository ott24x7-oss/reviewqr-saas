import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import { adminAuth } from "./api";
import { useAdminCopy } from "./copy";
import { fonts } from "../theme";
import { Card, LoadErrorCard } from "../ui/bits";
import { Field, PillButton } from "../ui/controls";
import { useI18n } from "../i18n";
import { useTheme } from "../ui/theme";
import type { AdminStepUpAction } from "./types";

// The action is sent with the code, and the token that comes back works for that action once.
type PendingStepUp = { action: AdminStepUpAction; target?: string; challengeId: string; resolve: (token: string | null) => void };
type SecurityValue = { requestStepUpToken: (action: AdminStepUpAction, target?: string) => Promise<string | null> };
const SecurityContext = createContext<SecurityValue | null>(null);

export function AdminSecurityProvider({ children }: { children: ReactNode }) {
  const t = useAdminCopy();
  const { lang } = useI18n();
  const { palette } = useTheme();
  const [pending, setPending] = useState<PendingStepUp | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const requestStepUpToken = useCallback(async (action: AdminStepUpAction, target?: string) => {
    const challenge = await adminAuth.requestStepUp(action, target);
    setError(false);
    setCode("");
    return new Promise<string | null>((resolve) => setPending({ action, target, challengeId: challenge.challengeId, resolve }));
  }, []);

  const cancel = useCallback(() => {
    pending?.resolve(null);
    setPending(null);
  }, [pending]);

  const confirm = useCallback(async () => {
    if (!pending || code.trim().length < 4) return;
    setError(false);
    try {
      const verified = await adminAuth.verifyStepUp(pending.action, pending.challengeId, code.trim());
      pending.resolve(verified.stepUpToken);
      setPending(null);
      setCode("");
    } catch {
      setError(true);
    }
  }, [code, pending]);

  const value = useMemo(() => ({ requestStepUpToken }), [requestStepUpToken]);
  return (
    <SecurityContext.Provider value={value}>
      {children}
      <Modal visible={!!pending} transparent animationType="slide" onRequestClose={cancel}>
        <View style={styles.modalRoot}>
          <Pressable style={[styles.scrim, { backgroundColor: palette.scrim }]} onPress={cancel} accessibilityLabel={t.stepUpCancel} />
          <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" bottomOffset={12} contentContainerStyle={styles.sheetWrap}>
            <Card style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.line }]}>
              <View style={[styles.grab, { backgroundColor: palette.line }]} />
              <Text style={[styles.title, { color: palette.ink }, lang === "hi" && styles.hindi]}>{t.stepUpTitle}</Text>
              <Text style={[styles.body, { color: palette.muted }, lang === "hi" && styles.hindiBody]}>{t.stepUpBody}</Text>
              {pending?.action ? <Text style={[styles.action, { color: palette.primary }]}>{pending.action}</Text> : null}
              <Field label={t.stepUpCode} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8} returnKeyType="done" />
              {error ? <LoadErrorCard onRetry={() => confirm().catch(() => undefined)} /> : null}
              <PillButton label={t.stepUpConfirm} tone="dark" onPress={() => confirm().catch(() => undefined)} disabled={code.trim().length < 4} />
              <PillButton label={t.stepUpCancel} tone="outline" onPress={cancel} />
            </Card>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </SecurityContext.Provider>
  );
}

export function useAdminSecurity() {
  const value = useContext(SecurityContext);
  if (!value) throw new Error("useAdminSecurity outside AdminSecurityProvider");
  return value;
}

export function useAdminScreenCapture(key: string) {
  useEffect(() => {
    if (Platform.OS === "web") return;
    ScreenCapture.preventScreenCaptureAsync(key).catch(() => undefined);
    return () => { ScreenCapture.allowScreenCaptureAsync(key).catch(() => undefined); };
  }, [key]);
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill },
  sheetWrap: { justifyContent: "flex-end" },
  sheet: { borderWidth: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: 14, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 28 },
  grab: { alignSelf: "center", width: 42, height: 5, borderRadius: 999, marginBottom: 4 },
  title: { fontFamily: fonts.title, fontSize: 22 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  action: { fontFamily: fonts.bodyStrong, fontSize: 15 },
  hindi: { fontFamily: fonts.hindiStrong },
  hindiBody: { fontFamily: fonts.hindi }
});

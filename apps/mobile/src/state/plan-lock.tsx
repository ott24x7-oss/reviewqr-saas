import { featureById, isFeatureId, type FeatureId } from "@reviewqr/shared";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { BottomSheet } from "../ui/bits";
import { useTheme } from "../ui/theme";
import { hasModule, useEntitlement } from "./entitlement";
import { emitPlanRequired, onPlanRequired } from "./plan-signal";

let afterClose: (() => void) | null = null;

/** Opens the lock sheet. Pass onClose only when leaving the screen is right. */
export function openPlanLock(featureId: string, onClose?: () => void) {
  afterClose = onClose ?? null;
  emitPlanRequired(featureId);
}

export function useFeature(id: FeatureId) {
  const { locked } = useFeatures();
  return { locked: locked(id), feature: featureById(id) };
}

export function useFeatures() {
  const query = useEntitlement();
  const loading = query.isLoading && !query.data;
  function locked(id: FeatureId) {
    const feature = featureById(id);
    if (!feature || loading) return false;
    return !hasModule(query.data?.modules, feature.module);
  }
  return { locked, loading };
}

export function PlanLockSheet({
  featureId,
  visible,
  onClose
}: {
  featureId: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const { palette } = useTheme();
  const feature = featureId && isFeatureId(featureId) ? featureById(featureId) : null;
  if (!feature) return null;
  const name = lang === "hi" ? feature.labelHi : feature.labelEn;
  const lines = lang === "hi" ? feature.doesHi : feature.doesEn;
  return (
    <BottomSheet visible={visible} title={t.planNotInPlan.replace("{name}", name)} onClose={onClose}>
      <View style={styles.body}>
        {lines.map((line) => (
          <Text key={line} style={[styles.line, { color: palette.ink }, lang === "hi" && styles.hindi]}>
            {line}
          </Text>
        ))}
        <Text style={[styles.managed, { color: palette.muted }, lang === "hi" && styles.hindi]}>{t.planManaged}</Text>
      </View>
    </BottomSheet>
  );
}

export function PlanLockHost() {
  const [featureId, setFeatureId] = useState<string | null>(null);
  useEffect(() => onPlanRequired(setFeatureId), []);
  return (
    <PlanLockSheet
      featureId={featureId}
      visible={!!featureId}
      onClose={() => {
        const extra = afterClose;
        afterClose = null;
        setFeatureId(null);
        extra?.();
      }}
    />
  );
}

export function FeatureGate({ id, children }: { id: FeatureId; children: ReactNode }) {
  const { locked } = useFeature(id);
  const { palette } = useTheme();
  useEffect(() => {
    if (!locked) return;
    openPlanLock(id, () => {
      if (router.canGoBack()) router.back();
    });
  }, [id, locked]);
  if (!locked) return children;
  return <Pressable accessibilityRole="button" onPress={() => openPlanLock(id)} style={[styles.fill, { backgroundColor: palette.paper }]} />;
}

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 28 },
  line: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  managed: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 6 },
  hindi: { fontFamily: fonts.hindi },
  fill: { flex: 1 }
});

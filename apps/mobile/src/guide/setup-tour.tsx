import { router, useLocalSearchParams } from "expo-router";
import type { ElementRef, RefObject } from "react";
import { View } from "react-native";
import { useI18n } from "../i18n";
import type { CoachStep } from "./coach";
import { CoachTour } from "./coach";
import type { CoachScreen } from "./store";
import { nextSetupStep, queueSetupStep, type SetupStepKey } from "./setup";

type NativeView = ElementRef<typeof View>;

export function SetupWalkthrough({
  step,
  screen,
  steps,
  targets
}: {
  step: SetupStepKey;
  screen: CoachScreen;
  steps: CoachStep[];
  targets: Record<string, RefObject<NativeView | null>>;
}) {
  const params = useLocalSearchParams<{ setupGuide?: string }>();
  const { t } = useI18n();
  const active = params.setupGuide === step;
  if (!active) return null;

  async function finish() {
    await queueSetupStep(nextSetupStep(step));
    router.back();
  }

  return (
    <CoachTour
      screen={screen}
      steps={steps}
      force
      targets={targets}
      lastLabel={t.setupDoneNext}
      onComplete={finish}
    />
  );
}

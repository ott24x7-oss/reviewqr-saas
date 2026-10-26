import AsyncStorage from "@react-native-async-storage/async-storage";

export const SETUP_STEP_KEYS = ["details", "link", "menu", "buttons", "store", "print"] as const;
export type SetupStepKey = (typeof SETUP_STEP_KEYS)[number];

const NEXT_SETUP_STEP_KEY = "reviewqr.setup-guide-next";

export function nextSetupStep(key: SetupStepKey): SetupStepKey | null {
  const index = SETUP_STEP_KEYS.indexOf(key);
  return SETUP_STEP_KEYS[index + 1] ?? null;
}

export async function queueSetupStep(key: SetupStepKey | "first" | null) {
  if (key) await AsyncStorage.setItem(NEXT_SETUP_STEP_KEY, key);
  else await AsyncStorage.removeItem(NEXT_SETUP_STEP_KEY);
}

export async function consumeSetupStep(): Promise<SetupStepKey | "first" | null> {
  const stored = await AsyncStorage.getItem(NEXT_SETUP_STEP_KEY).catch(() => null);
  await AsyncStorage.removeItem(NEXT_SETUP_STEP_KEY).catch(() => undefined);
  return stored === "first" || SETUP_STEP_KEYS.includes(stored as SetupStepKey)
    ? (stored as SetupStepKey | "first")
    : null;
}

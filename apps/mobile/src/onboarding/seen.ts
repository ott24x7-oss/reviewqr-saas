import AsyncStorage from "@react-native-async-storage/async-storage";

export const INTRO_SEEN_KEY = "reviewqr.introSeen";
export const WIZARD_LOCAL_KEY = "reviewqr.wizard";

export async function readIntroSeen() {
  const value = await AsyncStorage.getItem(INTRO_SEEN_KEY).catch(() => null);
  return value === "1";
}

export async function markIntroSeen() {
  await AsyncStorage.setItem(INTRO_SEEN_KEY, "1");
}

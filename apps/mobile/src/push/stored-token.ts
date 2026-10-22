import AsyncStorage from "@react-native-async-storage/async-storage";

export const PUSH_TOKEN_KEY = "reviewqr.pushToken";

let memory: string | null = null;

export async function rememberPushToken(token: string) {
  memory = token;
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
}

export async function readPushToken() {
  if (memory) return memory;
  try {
    memory = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    memory = null;
  }
  return memory;
}

export async function forgetPushToken() {
  memory = null;
  try {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch {
    // The in-memory copy is already gone. Logout still continues.
  }
}

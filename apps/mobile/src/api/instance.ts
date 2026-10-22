import * as SecureStore from "expo-secure-store";
import { createMobileApi, type TokenStore } from "./session";

export function apiBaseUrl() {
  return (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
}

const secureStore: TokenStore = {
  get: (key) => SecureStore.getItemAsync(key),
  set: (key, value) => SecureStore.setItemAsync(key, value),
  remove: (key) => SecureStore.deleteItemAsync(key)
};

export const mobileApi = createMobileApi({
  baseUrl: apiBaseUrl(),
  store: secureStore,
  deviceName: "Android"
});

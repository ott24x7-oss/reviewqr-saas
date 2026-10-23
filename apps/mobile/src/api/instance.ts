import * as SecureStore from "expo-secure-store";
import { createMobileApi, type TokenStore } from "./session";

export function apiBaseUrl() {
  return (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
}

const webStore: TokenStore = {
  async get(key) {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
  async remove(key) {
    localStorage.removeItem(key);
  }
};

let preferWeb: Promise<boolean> | null = null;

function webStorePreferred() {
  if (!preferWeb) {
    preferWeb = SecureStore.isAvailableAsync()
      .then((available) => !available)
      .catch(() => true);
  }
  return preferWeb;
}

const secureStore: TokenStore = {
  async get(key) {
    if (await webStorePreferred()) return webStore.get(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key, value) {
    if (await webStorePreferred()) return webStore.set(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key) {
    if (await webStorePreferred()) return webStore.remove(key);
    return SecureStore.deleteItemAsync(key);
  }
};

export const mobileApi = createMobileApi({
  baseUrl: apiBaseUrl(),
  store: secureStore,
  deviceName: "Android"
});

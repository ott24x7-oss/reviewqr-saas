export function adminMockEnabled() {
  return typeof __DEV__ !== "undefined" && __DEV__ && process.env.EXPO_PUBLIC_ADMIN_MOCK === "1";
}

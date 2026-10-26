export function agentMockEnabled() {
  return typeof __DEV__ !== "undefined" && __DEV__ && process.env.EXPO_PUBLIC_AGENT_MOCK === "1";
}

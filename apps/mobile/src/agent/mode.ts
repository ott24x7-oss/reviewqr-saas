export type AppMode = "owner" | "agent";

export function resolveAppMode(role: string | null | undefined, savedMode: AppMode | null, ownsBusiness: boolean): AppMode {
  if (role !== "AGENT") return "owner";
  if (savedMode === "owner" && ownsBusiness) return "owner";
  return "agent";
}

export function switchAppMode(current: AppMode, role: string | null | undefined, ownsBusiness: boolean): AppMode {
  if (role !== "AGENT" || !ownsBusiness) return current;
  return current === "agent" ? "owner" : "agent";
}

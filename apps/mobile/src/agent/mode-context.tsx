import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useBusiness } from "../state/business";
import { useSession } from "../state/session";
import { resolveAppMode, type AppMode } from "./mode";

const MODE_KEY = "reviewqr.agentMode";

type ModeValue = {
  mode: AppMode;
  ready: boolean;
  canSwitch: boolean;
  setMode: (next: AppMode) => void;
};

const ModeContext = createContext<ModeValue | null>(null);

export function AgentModeProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { businesses, loading: businessesLoading } = useBusiness();
  const [storedChoice, setStoredChoice] = useState<{ userId: string; mode: AppMode | null } | null>(null);

  useEffect(() => {
    let active = true;
    if (!user?.id || user.role !== "AGENT") return () => { active = false; };
    AsyncStorage.getItem(`${MODE_KEY}.${user.id}`)
      .then((value) => {
        if (active) setStoredChoice({ userId: user.id, mode: value === "owner" || value === "agent" ? value : null });
      })
      .catch(() => {
        if (active) setStoredChoice({ userId: user.id, mode: null });
      });
    return () => {
      active = false;
    };
  }, [user?.id, user?.role]);

  const userId = user?.id;
  const role = user?.role;
  const savedMode = storedChoice && storedChoice.userId === userId ? storedChoice.mode : null;
  const ready = role !== "AGENT" || (
    storedChoice?.userId === userId &&
    (savedMode !== "owner" || !businessesLoading)
  );
  const mode = resolveAppMode(user?.role, savedMode, businesses.length > 0);
  const canSwitch = user?.role === "AGENT" && businesses.length > 0;
  const setMode = useCallback((next: AppMode) => {
    if (!canSwitch || !userId) return;
    setStoredChoice({ userId, mode: next });
    AsyncStorage.setItem(`${MODE_KEY}.${userId}`, next).catch(() => undefined);
  }, [canSwitch, userId]);
  const value = useMemo(() => ({ mode, ready, canSwitch, setMode }), [mode, ready, canSwitch, setMode]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useAgentMode() {
  const value = useContext(ModeContext);
  if (!value) throw new Error("useAgentMode outside AgentModeProvider");
  return value;
}

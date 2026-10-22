import type { Me, TokenPair } from "@reviewqr/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiData } from "../api/data";
import { mobileApi } from "../api/instance";

type SessionValue = {
  ready: boolean;
  user: Me | null;
  saveSession: (pair: TokenPair) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Me | null>(null);

  const refreshUser = useCallback(async () => {
    const me = await apiData<Me>("/api/v1/me");
    setUser(me);
  }, []);

  const saveSession = useCallback(
    async (pair: TokenPair) => {
      await mobileApi.saveSession(pair);
      await refreshUser();
    },
    [refreshUser]
  );

  const logout = useCallback(async () => {
    await mobileApi.logout();
    setUser(null);
  }, []);

  useEffect(() => {
    let live = true;
    mobileApi
      .restore()
      .then(async (ok) => {
        if (!live || !ok) return;
        await refreshUser();
      })
      .catch(() => undefined)
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, [refreshUser]);

  const value = useMemo(
    () => ({ ready, user, saveSession, refreshUser, logout }),
    [ready, user, saveSession, refreshUser, logout]
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession outside provider");
  return value;
}

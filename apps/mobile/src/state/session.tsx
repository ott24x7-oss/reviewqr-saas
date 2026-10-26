import type { Me, TokenPair } from "@reviewqr/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { endSession } from "../auth/end-session";
import { clearWidgetSnapshot } from "../widgets/cache";
import { apiData } from "../api/data";
import { apiBaseUrl, mobileApi } from "../api/instance";
import { forgetPushToken, readPushToken } from "../push/stored-token";
import { BUSINESS_ID_KEY } from "./storage";
import { agentMockEnabled } from "../agent/env";

const MOCK_AGENT_USER: Me = {
  id: "local-agent",
  email: "agent@example.test",
  name: "Diwakar Sharma",
  phone: "+919876543210",
  role: "AGENT",
  pushEnabled: false
};

type SessionValue = {
  ready: boolean;
  user: Me | null;
  saveSession: (pair: TokenPair) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Me | null>(null);

  const refreshUser = useCallback(async () => {
    if (agentMockEnabled()) {
      setUser(MOCK_AGENT_USER);
      return;
    }
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
    if (agentMockEnabled()) {
      queryClient.clear();
      setUser(null);
      return;
    }
    await endSession({
      baseUrl: apiBaseUrl(),
      accessToken: mobileApi.getAccessToken(),
      pushToken: await readPushToken(),
      revoke: () => mobileApi.logout(),
      clearQuery: () => queryClient.clear(),
      clearBusinessId: () => AsyncStorage.removeItem(BUSINESS_ID_KEY),
      clearPushToken: () => forgetPushToken()
    });
    await clearWidgetSnapshot().catch(() => undefined);
    setUser(null);
  }, [queryClient]);

  useEffect(() => {
    let live = true;
    mobileApi.setSessionListener(() => {
      if (!live) return;
      clearWidgetSnapshot().catch(() => undefined);
      setUser(null);
      router.replace("/(auth)/login");
    });
    if (agentMockEnabled()) {
      Promise.resolve().then(() => {
        if (!live) return;
        setUser(MOCK_AGENT_USER);
        setReady(true);
      });
      return () => {
        live = false;
        mobileApi.setSessionListener(null);
      };
    }
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
      mobileApi.setSessionListener(null);
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

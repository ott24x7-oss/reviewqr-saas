import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { adminAuth, AdminApiError, clearAdminTokens, readAdminAccessToken, writeAdminTokens } from "./api";
import { adminMockEnabled } from "./env";
import type { AdminAuthRequest, AdminAuthStatus, AdminDeviceStatus } from "./types";

export type AdminSessionStatus = AdminDeviceStatus | "SIGNED_OUT" | "REVOKED";
type AdminIdentity = AdminAuthStatus["admin"] | null;
type AdminSessionValue = {
  ready: boolean;
  status: AdminSessionStatus;
  admin: AdminIdentity;
  deviceId: string | null;
  unlocked: boolean;
  sendOtp: (phone: string) => Promise<string>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
  unlock: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<AdminSessionStatus>("SIGNED_OUT");
  const [admin, setAdmin] = useState<AdminIdentity>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const statusRef = useRef(status);
  const checking = useRef(false);
  const backgroundAt = useRef<number | null>(null);
  const lockTimeoutMs = useRef(120_000);
  const revokedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { statusRef.current = status; }, [status]);

  const signOut = useCallback(async () => {
    if (revokedTimer.current) clearTimeout(revokedTimer.current);
    await clearAdminTokens();
    queryClient.removeQueries({ queryKey: ["admin"] });
    setAdmin(null);
    setDeviceId(null);
    setUnlocked(false);
    setStatus("SIGNED_OUT");
    router.replace("/(admin)/login");
  }, [queryClient]);

  const markRevoked = useCallback(async () => {
    await clearAdminTokens();
    setUnlocked(false);
    setStatus("REVOKED");
    if (!revokedTimer.current) revokedTimer.current = setTimeout(() => signOut().catch(() => undefined), 1200);
  }, [signOut]);

  const applyStatus = useCallback((next: AdminAuthStatus) => {
    setStatus(next.status);
    setAdmin(next.admin);
    setDeviceId(next.deviceId);
    if (next.status !== "ACTIVE") setUnlocked(false);
    if (next.status === "REVOKED") markRevoked().catch(() => undefined);
  }, [markRevoked]);

  const refreshStatus = useCallback(async () => {
    if (checking.current || !(await readAdminAccessToken())) return;
    checking.current = true;
    try {
      const next = await adminAuth.status();
      applyStatus(next);
    } catch (error) {
      if (error instanceof AdminApiError && ["DEVICE_REVOKED", "ADMIN_DEVICE_REVOKED"].includes(error.code)) await markRevoked();
      else if (error instanceof AdminApiError && error.code === "DEVICE_PENDING") setStatus("PENDING");
      else if (error instanceof AdminApiError && error.status === 401) await signOut();
    } finally {
      checking.current = false;
    }
  }, [applyStatus, markRevoked, signOut]);

  const sendOtp = useCallback(async (phone: string) => {
    const request: AdminAuthRequest = { phase: "request", phone: phone.replace(/\D/g, "") };
    const response = await adminAuth.requestOtp(request);
    return response.challengeId;
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    let pushToken: string | undefined;
    if (Platform.OS !== "web") {
      try {
        let permission = await Notifications.getPermissionsAsync();
        if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
        if (permission.granted) {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          pushToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
        }
      } catch { /* sign-in remains available if notifications are disabled */ }
    }
    const response = await adminAuth.verifyOtp({
      phase: "verify",
      phone: phone.replace(/\D/g, ""),
      code: code.trim(),
      deviceName: Device.deviceName || `${Platform.OS} device`,
      platform: Platform.OS,
      pushToken
    });
    await writeAdminTokens(response.accessToken, response.refreshToken);
    setAdmin(response.admin);
    setDeviceId(response.deviceId);
    setStatus(response.status);
    setUnlocked(false);
    if (response.status === "REVOKED") await markRevoked();
  }, [markRevoked]);

  const unlock = useCallback(async () => {
    if (adminMockEnabled()) {
      setUnlocked(true);
      return true;
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock QR24x7 Admin",
        promptSubtitle: "Biometric or device PIN",
        promptDescription: "Confirm your identity before opening admin tools.",
        cancelLabel: "Cancel",
        disableDeviceFallback: false
      });
      setUnlocked(result.success);
      return result.success;
    } catch {
      setUnlocked(false);
      return false;
    }
  }, []);

  useEffect(() => {
    let live = true;
    readAdminAccessToken()
      .then(async (token) => {
        if (!live) return;
        if (token) await refreshStatus();
      })
      .catch(() => undefined)
      .finally(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [refreshStatus]);

  useEffect(() => {
    if (status !== "PENDING") return;
    const timer = setInterval(() => refreshStatus().catch(() => undefined), 5000);
    return () => clearInterval(timer);
  }, [refreshStatus, status]);

  useEffect(() => {
    AsyncStorage.getItem("reviewqr.admin.lockTimeout").then((value) => {
      const minutes = Number(value);
      if (Number.isFinite(minutes) && minutes >= 1 && minutes <= 30) lockTimeoutMs.current = minutes * 60_000;
    }).catch(() => undefined);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "inactive" || state === "background") {
        if (backgroundAt.current === null) backgroundAt.current = Date.now();
      } else if (state === "active") {
        const elapsed = backgroundAt.current === null ? Number.POSITIVE_INFINITY : Date.now() - backgroundAt.current;
        backgroundAt.current = null;
        if (statusRef.current === "ACTIVE" && elapsed >= lockTimeoutMs.current) setUnlocked(false);
        refreshStatus().catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [refreshStatus]);

  const value = useMemo<AdminSessionValue>(() => ({ ready, status, admin, deviceId, unlocked, sendOtp, verifyOtp, refreshStatus, unlock, signOut }), [ready, status, admin, deviceId, unlocked, sendOtp, verifyOtp, refreshStatus, unlock, signOut]);
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession() {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error("useAdminSession outside AdminSessionProvider");
  return value;
}

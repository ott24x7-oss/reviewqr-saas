import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  adminApi, clearAdminTokens, forgetAdminDevice, readAdminAccessToken, readAdminDevice, readAdminPhone, readAdminRefreshToken,
  refreshAdminSession, rememberAdminDevice, setAdminDeviceName, setAdminSessionListener, writeAdminPhone, writeAdminTokens
} from "./api";
import { adminMockEnabled } from "./env";
import { maskPhone } from "./view";
import type { AdminDevice, AdminDeviceStatus, AdminOtpSent, AdminPlatform } from "./types";

export type AdminSessionStatus = AdminDeviceStatus | "SIGNED_OUT";
/** The server returns no admin profile on sign-in, so the app shows the phone it signed in with. */
type AdminIdentity = { phoneMasked: string } | null;
type AdminSessionValue = {
  ready: boolean;
  status: AdminSessionStatus;
  admin: AdminIdentity;
  device: AdminDevice | null;
  unlocked: boolean;
  sendOtp: (phone: string) => Promise<AdminOtpSent>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
  unlock: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AdminSessionContext = createContext<AdminSessionValue | null>(null);
/** POST /auth/refresh is limited to 120 per 10 minutes per IP; poll well under that. */
const PENDING_POLL_MS = 10_000;

export function adminPlatform(os: string = Platform.OS): AdminPlatform {
  return os === "ios" || os === "web" ? os : "android";
}

function adminDeviceName() {
  return (Device.deviceName || Device.modelName || `${Platform.OS} device`).slice(0, 80);
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<AdminSessionStatus>("SIGNED_OUT");
  const [admin, setAdmin] = useState<AdminIdentity>(null);
  const [device, setDevice] = useState<AdminDevice | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const statusRef = useRef(status);
  const checking = useRef(false);
  const backgroundAt = useRef<number | null>(null);
  const lockTimeoutMs = useRef(120_000);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { setAdminDeviceName(adminDeviceName()); }, []);

  const resetLocal = useCallback(async () => {
    await clearAdminTokens();
    queryClient.removeQueries({ queryKey: ["admin"] });
    setAdmin(null);
    setDevice(null);
    setUnlocked(false);
    setStatus("SIGNED_OUT");
    router.replace("/(admin)/login");
  }, [queryClient]);

  const signOut = useCallback(async () => {
    const refreshToken = await readAdminRefreshToken();
    if (refreshToken) await adminApi.logout(refreshToken).catch(() => undefined);
    await resetLocal();
  }, [resetLocal]);

  /** A revoked phone cannot be reused: forget its secret so the next sign-in registers a new one. */
  const markRevoked = useCallback(async () => {
    await forgetAdminDevice();
    await resetLocal();
  }, [resetLocal]);

  const applyDevice = useCallback((next: AdminDevice) => {
    setDevice(next);
    setStatus(next.status);
    if (next.status !== "ACTIVE") setUnlocked(false);
    if (next.status === "REVOKED") markRevoked().catch(() => undefined);
  }, [markRevoked]);

  useEffect(() => {
    setAdminSessionListener({
      onDevice: applyDevice,
      onSignedOut: () => { resetLocal().catch(() => undefined); },
      onDeviceCode: (code) => {
        if (code === "DEVICE_REVOKED") markRevoked().catch(() => undefined);
        else { setStatus("PENDING"); setUnlocked(false); }
      }
    });
    return () => setAdminSessionListener({});
  }, [applyDevice, markRevoked, resetLocal]);

  /** There is no status route: a refresh returns the device and rotates the token pair. */
  const refreshStatus = useCallback(async () => {
    if (checking.current || !(await readAdminRefreshToken())) return;
    checking.current = true;
    try {
      await refreshAdminSession();
    } finally {
      checking.current = false;
    }
  }, []);

  const sendOtp = useCallback((phone: string) => adminApi.requestOtp(phone.replace(/\D/g, "")), []);

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
    const saved = await readAdminDevice();
    const digits = phone.replace(/\D/g, "");
    const session = await adminApi.verifyOtp({
      phone: digits,
      code: code.trim(),
      deviceName: adminDeviceName(),
      platform: adminPlatform(),
      ...(pushToken ? { pushToken: pushToken.slice(0, 240) } : {}),
      ...(saved ?? {})
    });
    await writeAdminTokens(session);
    await rememberAdminDevice(session);
    const phoneMasked = maskPhone(digits);
    await writeAdminPhone(phoneMasked);
    setAdmin({ phoneMasked });
    setUnlocked(false);
    applyDevice(session.device);
  }, [applyDevice]);

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
    Promise.all([readAdminAccessToken(), readAdminPhone()])
      .then(async ([token, phoneMasked]) => {
        if (!live || !token) return;
        if (phoneMasked) setAdmin({ phoneMasked });
        await refreshStatus();
      })
      .catch(() => undefined)
      .finally(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, [refreshStatus]);

  useEffect(() => {
    if (status !== "PENDING") return;
    const timer = setInterval(() => refreshStatus().catch(() => undefined), PENDING_POLL_MS);
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

  const value = useMemo<AdminSessionValue>(() => ({ ready, status, admin, device, unlocked, sendOtp, verifyOtp, refreshStatus, unlock, signOut }), [ready, status, admin, device, unlocked, sendOtp, verifyOtp, refreshStatus, unlock, signOut]);
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession() {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error("useAdminSession outside AdminSessionProvider");
  return value;
}

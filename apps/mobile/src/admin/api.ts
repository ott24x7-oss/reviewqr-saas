import * as SecureStore from "expo-secure-store";
import { useQuery } from "@tanstack/react-query";
import { apiBaseUrl } from "../api/instance";
import { adminMockEnabled } from "./env";
import { adminMockRequest } from "./mock";
import type {
  AdminAccountDetail, AdminAuthRequest, AdminAuthResponse, AdminAuthVerify, AdminAuthStatus, AdminDashboard,
  AdminInbox, AdminInboxSegment, AdminMoney, AdminPlan, AdminSearchResult, AdminSettings,
  AdminShopOrder, AdminSupportTicket, AdminTeam, AdminWhatsApp
} from "./types";

export const ADMIN_ACCESS_KEY = "qr24x7.admin.access";
export const ADMIN_REFRESH_KEY = "qr24x7.admin.refresh";
export const ADMIN_DEVICE_ID_KEY = "qr24x7.admin.deviceId";
export const ADMIN_DEVICE_SECRET_KEY = "qr24x7.admin.deviceSecret";
export const ADMIN_QUERY_PREFIX = ["admin"] as const;

export async function writeAdminTokens(access: string, refresh: string) {
  await Promise.all([secureSet(ADMIN_ACCESS_KEY, access), secureSet(ADMIN_REFRESH_KEY, refresh)]);
}

export async function readAdminAccessToken() {
  return secureGet(ADMIN_ACCESS_KEY);
}

export async function clearAdminTokens() {
  await Promise.all([secureRemove(ADMIN_ACCESS_KEY), secureRemove(ADMIN_REFRESH_KEY)]);
}

/** The server reuses this phone's approval only when it sees the secret it issued for it. */
export async function readAdminDevice() {
  const [deviceId, deviceSecret] = await Promise.all([secureGet(ADMIN_DEVICE_ID_KEY), secureGet(ADMIN_DEVICE_SECRET_KEY)]);
  return deviceId && deviceSecret ? { deviceId, deviceSecret } : null;
}

/** The secret is returned once, when the phone is first registered. */
export async function rememberAdminDevice(response: { deviceId: string; deviceSecret?: string }) {
  if (!response.deviceSecret) return;
  await Promise.all([secureSet(ADMIN_DEVICE_ID_KEY, response.deviceId), secureSet(ADMIN_DEVICE_SECRET_KEY, response.deviceSecret)]);
}

export async function forgetAdminDevice() {
  await Promise.all([secureRemove(ADMIN_DEVICE_ID_KEY), secureRemove(ADMIN_DEVICE_SECRET_KEY)]);
}

async function secureGet(key: string) {
  try {
    if (await SecureStore.isAvailableAsync()) return await SecureStore.getItemAsync(key);
  } catch { /* web uses local storage below */ }
  return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
}

async function secureSet(key: string, value: string) {
  try {
    if (await SecureStore.isAvailableAsync()) return await SecureStore.setItemAsync(key, value);
  } catch { /* web uses local storage below */ }
  if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
}

async function secureRemove(key: string) {
  try {
    if (await SecureStore.isAvailableAsync()) return await SecureStore.deleteItemAsync(key);
  } catch { /* web uses local storage below */ }
  if (typeof localStorage !== "undefined") localStorage.removeItem(key);
}

export class AdminApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "AdminApiError";
  }
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (adminMockEnabled()) return adminMockRequest<T>(path, init);
  const token = await secureGet(ADMIN_ACCESS_KEY);
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiBaseUrl()}/api/v1/admin${path}`, { ...init, headers });
  const data = await response.json().catch(() => ({})) as { code?: string; error?: string; message?: string };
  if (!response.ok) throw new AdminApiError(response.status, data.code ?? data.error ?? "ADMIN_REQUEST_FAILED", data.message ?? "Admin request failed");
  return data as T;
}

export const adminAuth = {
  requestOtp: (body: AdminAuthRequest) => adminFetch<{ challengeId: string }>("/auth", { method: "POST", body: JSON.stringify(body) }),
  verifyOtp: (body: AdminAuthVerify) => adminFetch<AdminAuthResponse>("/auth", { method: "POST", body: JSON.stringify(body) }),
  status: () => adminFetch<AdminAuthStatus>("/auth"),
  requestStepUp: (action: string, target?: string) => adminFetch<{ challengeId: string }>("/step-up", { method: "POST", body: JSON.stringify({ phase: "request", action, target }) }),
  verifyStepUp: (action: string, challengeId: string, code: string) => adminFetch<{ challengeId: string; stepUpToken: string; expiresAt: string }>("/step-up", { method: "POST", body: JSON.stringify({ phase: "verify", action, challengeId, code }) })
};

export function useAdminDashboard(range: string, from?: string, to?: string) {
  const dates = from && to ? `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : "";
  return useQuery({ queryKey: [...ADMIN_QUERY_PREFIX, "dashboard", range, from, to], queryFn: () => adminFetch<AdminDashboard>(`/dashboard?range=${encodeURIComponent(range)}${dates}`) });
}
export function useAdminInbox(segment: AdminInboxSegment | "all") {
  return useQuery({ queryKey: [...ADMIN_QUERY_PREFIX, "inbox", segment], queryFn: () => adminFetch<AdminInbox>(`/inbox?segment=${segment}`) });
}
export function useAdminSearch(query: string) {
  return useQuery({ queryKey: [...ADMIN_QUERY_PREFIX, "search", query], enabled: query.trim().length > 0, queryFn: () => adminFetch<{ items: AdminSearchResult[] }>(`/search?q=${encodeURIComponent(query.trim())}`) });
}
export function useAdminAccount(kind: "user" | "business", id: string | undefined) {
  return useQuery({ queryKey: [...ADMIN_QUERY_PREFIX, kind, id], enabled: !!id, queryFn: () => adminFetch<AdminAccountDetail>(`/${kind === "user" ? "users" : "businesses"}/${encodeURIComponent(id!)}`) });
}
export function useAdminMoney() {
  return useQuery({ queryKey: [...ADMIN_QUERY_PREFIX, "money"], queryFn: () => adminFetch<AdminMoney>("/money") });
}
export function useAdminPlans() {
  return useQuery({ queryKey: [...ADMIN_QUERY_PREFIX, "plans"], queryFn: async () => (await adminFetch<{ items: AdminPlan[] }>("/plans")).items });
}
export function useAdminTeam() {
  return useQuery({ queryKey: [...ADMIN_QUERY_PREFIX, "team"], queryFn: () => adminFetch<AdminTeam>("/team") });
}
export function useAdminShopOrders() {
  return useQuery({ queryKey: [...ADMIN_QUERY_PREFIX, "shop", "orders"], queryFn: async () => (await adminFetch<{ items: AdminShopOrder[] }>("/shop/orders")).items });
}
export function useAdminSupport() {
  return useQuery({ queryKey: [...ADMIN_QUERY_PREFIX, "support"], queryFn: async () => (await adminFetch<{ items: AdminSupportTicket[] }>("/support")).items });
}
export function useAdminWhatsApp() {
  return useQuery({ queryKey: [...ADMIN_QUERY_PREFIX, "whatsapp"], queryFn: () => adminFetch<AdminWhatsApp>("/whatsapp") });
}
export function useAdminSettings() {
  return useQuery({ queryKey: [...ADMIN_QUERY_PREFIX, "settings"], queryFn: () => adminFetch<AdminSettings>("/settings") });
}
export function useAdminAudit() {
  return useQuery({ queryKey: [...ADMIN_QUERY_PREFIX, "audit"], queryFn: async () => (await adminFetch<{ items: import("./types").AdminAuditEvent[] }>("/audit")).items });
}

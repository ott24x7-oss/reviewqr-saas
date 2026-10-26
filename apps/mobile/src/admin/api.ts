import * as SecureStore from "expo-secure-store";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiBaseUrl } from "../api/instance";
import { adminMockEnabled } from "./env";
import { adminMockTransport } from "./mock";
import type {
  AdminAuditEvent, AdminAuditFilters, AdminBusiness, AdminBusinessActionBody, AdminCommission, AdminCommissionActionBody,
  AdminCommissionStatus, AdminDashboard, AdminDevice, AdminDeviceRow, AdminInbox, AdminInboxActionBody, AdminInboxSegment,
  AdminOtpSent, AdminOtpVerifyBody, AdminPage, AdminPayment, AdminPaymentActionBody, AdminPaymentDetail, AdminPaymentFilters,
  AdminPlan, AdminPlanPatch, AdminRange, AdminRefreshed, AdminRevealed, AdminSearch, AdminSession, AdminSettings,
  AdminSettingsPatch, AdminShopActionBody, AdminShopOrderDetail, AdminShopOrders, AdminShopOrderStatus, AdminStepUpAction,
  AdminStepUpToken, AdminSupportActionBody, AdminTeam, AdminTeamActionBody, AdminTicket, AdminTicketDetail, AdminUser,
  AdminUserActionBody, AdminWhatsApp, AdminWhatsAppInfo, AdminWhatsAppTestResult
} from "./types";

export const ADMIN_ACCESS_KEY = "qr24x7.admin.access";
export const ADMIN_ACCESS_EXPIRES_KEY = "qr24x7.admin.accessExpiresAt";
export const ADMIN_REFRESH_KEY = "qr24x7.admin.refresh";
export const ADMIN_DEVICE_ID_KEY = "qr24x7.admin.deviceId";
export const ADMIN_DEVICE_SECRET_KEY = "qr24x7.admin.deviceSecret";
export const ADMIN_PHONE_KEY = "qr24x7.admin.phoneMasked";
export const ADMIN_QUERY_PREFIX = ["admin"] as const;
/** Every admin route lives here. Paths below are relative to it. */
export const ADMIN_API_PREFIX = "/api/v1/admin";

// ---------- secure storage ----------

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

/** Saves a token pair from verify or refresh. The refresh token rotates on every refresh. */
export async function writeAdminTokens(pair: { accessToken: string; refreshToken: string; expiresIn: number }) {
  await Promise.all([
    secureSet(ADMIN_ACCESS_KEY, pair.accessToken),
    secureSet(ADMIN_REFRESH_KEY, pair.refreshToken),
    secureSet(ADMIN_ACCESS_EXPIRES_KEY, String(Date.now() + pair.expiresIn * 1000))
  ]);
}

export async function readAdminAccessToken() {
  return secureGet(ADMIN_ACCESS_KEY);
}

export async function readAdminRefreshToken() {
  return secureGet(ADMIN_REFRESH_KEY);
}

export async function clearAdminTokens() {
  await Promise.all([secureRemove(ADMIN_ACCESS_KEY), secureRemove(ADMIN_REFRESH_KEY), secureRemove(ADMIN_ACCESS_EXPIRES_KEY)]);
}

/** The server reuses this phone's approval only when it sees the secret it issued for it. */
export async function readAdminDevice() {
  const [deviceId, deviceSecret] = await Promise.all([secureGet(ADMIN_DEVICE_ID_KEY), secureGet(ADMIN_DEVICE_SECRET_KEY)]);
  return deviceId && deviceSecret ? { deviceId, deviceSecret } : null;
}

/**
 * The secret comes back once, when verify registers a new phone. Verify with no
 * secret in the reply means the saved device was reused, so nothing changes.
 */
export async function rememberAdminDevice(session: { device: { id: string }; deviceSecret?: string }) {
  if (!session.deviceSecret) return;
  await Promise.all([secureSet(ADMIN_DEVICE_ID_KEY, session.device.id), secureSet(ADMIN_DEVICE_SECRET_KEY, session.deviceSecret)]);
}

export async function forgetAdminDevice() {
  await Promise.all([secureRemove(ADMIN_DEVICE_ID_KEY), secureRemove(ADMIN_DEVICE_SECRET_KEY)]);
}

export async function writeAdminPhone(masked: string) {
  await secureSet(ADMIN_PHONE_KEY, masked);
}

export async function readAdminPhone() {
  return secureGet(ADMIN_PHONE_KEY);
}

// ---------- transport ----------

export class AdminApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "AdminApiError";
  }
}

export function isStepUpRequired(error: unknown) {
  return error instanceof AdminApiError && error.code === "STEP_UP_REQUIRED";
}

export type AdminTransportRequest = { method: string; headers: Record<string, string>; body?: string };
export type AdminTransportResponse = { status: number; body: unknown };
export type AdminTransport = (path: string, request: AdminTransportRequest) => Promise<AdminTransportResponse>;

const fetchTransport: AdminTransport = async (path, request) => {
  const response = await fetch(`${apiBaseUrl()}${ADMIN_API_PREFIX}${path}`, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    credentials: "omit"
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
};

let transportOverride: AdminTransport | null = null;
/** Tests swap the transport. `null` restores fetch (or the dev mock). */
export function setAdminTransport(transport: AdminTransport | null) {
  transportOverride = transport;
}

function transport(): AdminTransport {
  if (transportOverride) return transportOverride;
  return adminMockEnabled() ? adminMockTransport : fetchTransport;
}

type AdminSessionListener = {
  /** A refresh returned this device. Its status may have changed (approved, revoked). */
  onDevice?: (device: AdminDevice) => void;
  /** The refresh token was refused, so this phone is signed out. */
  onSignedOut?: () => void;
  /** A guarded route said DEVICE_PENDING or DEVICE_REVOKED. */
  onDeviceCode?: (code: "DEVICE_PENDING" | "DEVICE_REVOKED") => void;
};
let listener: AdminSessionListener = {};
export function setAdminSessionListener(next: AdminSessionListener) {
  listener = next;
}

let deviceName = "Admin phone";
export function setAdminDeviceName(name: string) {
  deviceName = name.trim().slice(0, 80) || "Admin phone";
}

export type AdminRequestInit = {
  method?: "GET" | "POST" | "PUT" | "PATCH";
  body?: unknown;
  /** A step-up token for exactly the action this request performs. It is spent on use. */
  stepUp?: string | null;
  /** Auth routes are called without a bearer token. */
  auth?: boolean;
};

function unwrap<T>(response: AdminTransportResponse): T {
  const body = (response.body ?? {}) as { data?: T; error?: { code?: string; message?: string } };
  if (response.status >= 200 && response.status < 300) return body.data as T;
  throw new AdminApiError(response.status, body.error?.code ?? "INTERNAL", body.error?.message ?? "Admin request failed");
}

async function send(path: string, init: AdminRequestInit, token: string | null) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.stepUp) headers["X-Step-Up"] = init.stepUp;
  return transport()(path, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body)
  });
}

let refreshing: Promise<string | null> | null = null;

/**
 * POST /auth/refresh. The server rotates the refresh token, so the new pair is
 * saved before anything else runs. One refresh at a time for every caller.
 */
export function refreshAdminSession(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = await readAdminRefreshToken();
      if (!refreshToken) return null;
      let response: AdminTransportResponse;
      try {
        response = await send("/auth/refresh", { method: "POST", body: { refreshToken, deviceName }, auth: false }, null);
      } catch {
        return null;
      }
      if (response.status === 400 || response.status === 401) {
        await clearAdminTokens();
        listener.onSignedOut?.();
        return null;
      }
      if (response.status < 200 || response.status >= 300) return null;
      const next = unwrap<AdminRefreshed>(response);
      await writeAdminTokens(next);
      listener.onDevice?.(next.device);
      return next.accessToken;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function currentToken() {
  const [token, expiresAt] = await Promise.all([readAdminAccessToken(), secureGet(ADMIN_ACCESS_EXPIRES_KEY)]);
  if (token && expiresAt && Number(expiresAt) - 30_000 < Date.now()) return (await refreshAdminSession()) ?? token;
  return token;
}

export async function adminRequest<T>(path: string, init: AdminRequestInit = {}): Promise<T> {
  const authed = init.auth !== false;
  const token = authed ? await currentToken() : null;
  let response = await send(path, init, token);
  // An expired or rotated access token is answered 401, or 403 FORBIDDEN by the admin guard.
  const code = (response.body as { error?: { code?: string } } | null)?.error?.code;
  if (authed && (response.status === 401 || (response.status === 403 && code === "FORBIDDEN"))) {
    const next = await refreshAdminSession();
    if (next) response = await send(path, init, next);
  }
  try {
    return unwrap<T>(response);
  } catch (error) {
    if (error instanceof AdminApiError && (error.code === "DEVICE_PENDING" || error.code === "DEVICE_REVOKED")) {
      listener.onDeviceCode?.(error.code);
    }
    throw error;
  }
}

function query(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : "";
}

const id = (value: string) => encodeURIComponent(value);

// ---------- the client: one function per server route ----------

export const adminApi = {
  // auth
  requestOtp: (phone: string) => adminRequest<AdminOtpSent>("/auth/otp/request", { method: "POST", body: { phone }, auth: false }),
  verifyOtp: (body: AdminOtpVerifyBody) => adminRequest<AdminSession>("/auth/otp/verify", { method: "POST", body, auth: false }),
  logout: (refreshToken: string) => adminRequest<{ ok: true }>("/auth/logout", { method: "POST", body: { refreshToken }, auth: false }),
  /** Sends a WhatsApp code. No action yet: the action is bound when the code is checked. */
  sendStepUp: () => adminRequest<AdminOtpSent>("/step-up", { method: "POST", body: {} }),
  verifyStepUp: (action: AdminStepUpAction, code: string) => adminRequest<AdminStepUpToken>("/step-up", { method: "POST", body: { code, action } }),

  dashboard: (range: AdminRange, from?: string, to?: string) =>
    adminRequest<AdminDashboard>(`/dashboard${query({ range, from: range === "custom" ? from : undefined, to: range === "custom" ? to : undefined })}`),

  inbox: (segment: AdminInboxSegment, cursor?: string | null) => adminRequest<AdminInbox>(`/inbox${query({ segment, cursor })}`),
  /** Device approval needs an approve_device step-up. Payout segment actions are refused: use Money. */
  inboxAction: (body: AdminInboxActionBody, stepUp?: string | null) => adminRequest<{ changed: number }>("/inbox", { method: "POST", body, stepUp }),

  search: (q: string) => adminRequest<AdminSearch>(`/search${query({ q: q.trim() })}`),

  user: (userId: string) => adminRequest<AdminUser>(`/users/${id(userId)}`),
  userAction: <T = unknown>(userId: string, body: AdminUserActionBody, stepUp?: string | null) => adminRequest<T>(`/users/${id(userId)}`, { method: "POST", body, stepUp }),
  business: (businessId: string) => adminRequest<AdminBusiness>(`/businesses/${id(businessId)}`),
  businessAction: <T = unknown>(businessId: string, body: AdminBusinessActionBody) => adminRequest<T>(`/businesses/${id(businessId)}`, { method: "POST", body }),
  revealUserPhone: (userId: string) => adminRequest<AdminRevealed>(`/users/${id(userId)}`, { method: "POST", body: { action: "reveal" } }),
  revealBusinessPhone: (businessId: string) => adminRequest<AdminRevealed>(`/businesses/${id(businessId)}`, { method: "POST", body: { action: "reveal" } }),

  payments: (filters: AdminPaymentFilters = {}, cursor?: string | null) => adminRequest<AdminPage<AdminPayment>>(`/payments${query({ ...filters, cursor })}`),
  payment: (paymentId: string) => adminRequest<AdminPaymentDetail>(`/payments/${id(paymentId)}`),
  /** approve and refund need a reason and a step-up (approve_payment / refund_payment). */
  paymentAction: (paymentId: string, body: AdminPaymentActionBody, stepUp?: string | null) => adminRequest<unknown>(`/payments/${id(paymentId)}`, { method: "POST", body, stepUp }),
  commissions: (status?: AdminCommissionStatus, cursor?: string | null) => adminRequest<AdminPage<AdminCommission>>(`/commissions${query({ status, cursor })}`),
  /** Works on every due commission of one agent. pay needs a reason, the UTR and a mark_payout_paid step-up. */
  commissionAction: (body: AdminCommissionActionBody, stepUp?: string | null) => adminRequest<unknown>("/commissions", { method: "POST", body, stepUp }),

  plans: () => adminRequest<{ items: AdminPlan[] }>("/plans"),
  /** Price or module changes need a change_plan_price or change_plan_modules step-up. */
  patchPlan: (planId: string, body: AdminPlanPatch, stepUp?: string | null) => adminRequest<unknown>(`/plans/${id(planId)}`, { method: "PATCH", body, stepUp }),

  team: () => adminRequest<AdminTeam>("/agents/team"),
  teamAction: (body: AdminTeamActionBody) => adminRequest<unknown>("/agents/team", { method: "POST", body }),

  shopOrders: (status?: AdminShopOrderStatus, cursor?: string | null) => adminRequest<AdminShopOrders>(`/shop/orders${query({ status, cursor })}`),
  shopOrder: (orderId: string) => adminRequest<AdminShopOrderDetail>(`/shop/orders/${id(orderId)}`),
  shopAction: <T = unknown>(orderId: string, body: AdminShopActionBody) => adminRequest<T>(`/shop/orders/${id(orderId)}`, { method: "POST", body }),

  tickets: (status?: string, cursor?: string | null) => adminRequest<AdminPage<AdminTicket>>(`/support${query({ status, cursor })}`),
  ticket: (ticketId: string) => adminRequest<AdminTicketDetail>(`/support/${id(ticketId)}`),
  ticketAction: (ticketId: string, body: AdminSupportActionBody) => adminRequest<unknown>(`/support/${id(ticketId)}`, { method: "POST", body }),

  whatsapp: () => adminRequest<AdminWhatsApp>("/whatsapp"),
  whatsappReconnect: (stepUp: string) => adminRequest<AdminWhatsAppInfo>("/whatsapp/reconnect", { method: "POST", stepUp }),
  /** Sends only to the signed-in admin's own number. */
  whatsappTest: (message?: string) => adminRequest<AdminWhatsAppTestResult>("/whatsapp/test", { method: "POST", body: message ? { message } : {} }),

  settings: () => adminRequest<AdminSettings>("/settings"),
  /** Share or TDS changes need a change_settings step-up. */
  patchSettings: (body: AdminSettingsPatch, stepUp?: string | null) => adminRequest<unknown>("/settings", { method: "PUT", body, stepUp }),

  devices: () => adminRequest<{ devices: AdminDeviceRow[] }>("/devices"),
  /** approve needs an approve_device step-up. */
  deviceAction: (deviceId: string, action: "approve" | "revoke", stepUp?: string | null) =>
    adminRequest<{ devices: AdminDeviceRow[] }>(`/devices/${id(deviceId)}`, { method: "POST", body: { action }, stepUp }),

  audit: (filters: AdminAuditFilters = {}, cursor?: string | null) => adminRequest<AdminPage<AdminAuditEvent>>(`/audit${query({ ...filters, cursor })}`)
};

// ---------- query hooks ----------

const key = (...parts: unknown[]) => [...ADMIN_QUERY_PREFIX, ...parts];

export function useAdminDashboard(range: AdminRange, from?: string, to?: string) {
  const ready = range !== "custom" || (/^\d{4}-\d{2}-\d{2}$/.test(from ?? "") && /^\d{4}-\d{2}-\d{2}$/.test(to ?? ""));
  return useQuery({ queryKey: key("dashboard", range, from, to), enabled: ready, queryFn: () => adminApi.dashboard(range, from, to) });
}
export function useAdminInbox(segment: AdminInboxSegment) {
  return useQuery({ queryKey: key("inbox", segment), queryFn: () => adminApi.inbox(segment) });
}
export function useAdminSearch(text: string) {
  return useQuery({ queryKey: key("search", text.trim()), enabled: text.trim().length >= 2, queryFn: () => adminApi.search(text) });
}
export function useAdminUser(userId: string | undefined, enabled = true) {
  return useQuery({ queryKey: key("user", userId), enabled: enabled && !!userId, queryFn: () => adminApi.user(userId!) });
}
export function useAdminBusiness(businessId: string | undefined, enabled = true) {
  return useQuery({ queryKey: key("business", businessId), enabled: enabled && !!businessId, queryFn: () => adminApi.business(businessId!) });
}
export function useAdminPayments(filters: AdminPaymentFilters) {
  return useInfiniteQuery({
    queryKey: key("payments", filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => adminApi.payments(filters, pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined
  });
}
export function useAdminCommissions(status?: AdminCommissionStatus) {
  return useInfiniteQuery({
    queryKey: key("commissions", status),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => adminApi.commissions(status, pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined
  });
}
export function useAdminPlans() {
  return useQuery({ queryKey: key("plans"), queryFn: async () => (await adminApi.plans()).items });
}
export function useAdminTeam() {
  return useQuery({ queryKey: key("team"), queryFn: () => adminApi.team() });
}
export function useAdminShopOrders(status?: AdminShopOrderStatus) {
  return useQuery({ queryKey: key("shop", "orders", status), queryFn: () => adminApi.shopOrders(status) });
}
export function useAdminTickets() {
  return useQuery({ queryKey: key("support"), queryFn: async () => (await adminApi.tickets()).items });
}
export function useAdminTicket(ticketId: string | null) {
  return useQuery({ queryKey: key("support", ticketId), enabled: !!ticketId, queryFn: () => adminApi.ticket(ticketId!) });
}
export function useAdminWhatsApp(pollMs: number | false = false) {
  return useQuery({ queryKey: key("whatsapp"), queryFn: () => adminApi.whatsapp(), refetchInterval: pollMs });
}
export function useAdminSettings() {
  return useQuery({ queryKey: key("settings"), queryFn: () => adminApi.settings() });
}
export function useAdminDevices() {
  return useQuery({ queryKey: key("devices"), queryFn: async () => (await adminApi.devices()).devices });
}
export function useAdminAudit(filters: AdminAuditFilters = {}) {
  return useInfiniteQuery({
    queryKey: key("audit", filters),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => adminApi.audit(filters, pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined
  });
}

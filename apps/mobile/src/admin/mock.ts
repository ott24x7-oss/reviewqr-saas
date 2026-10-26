import type { AdminTransportRequest, AdminTransportResponse } from "./api";
import type {
  AdminAuditEvent, AdminCommission, AdminDashboard, AdminDevice, AdminDeviceRow, AdminInbox, AdminInboxItem, AdminInboxSegment,
  AdminOtpSent, AdminPayment, AdminPaymentDetail, AdminPlan, AdminSearch, AdminSession, AdminSettings, AdminShopOrder,
  AdminShopOrderDetail, AdminShopOrders, AdminStepUpAction, AdminStepUpToken, AdminTeam, AdminTicket, AdminTicketDetail,
  AdminUser, AdminBusiness, AdminWhatsApp, AdminRefreshed
} from "./types";

/*
 * A local stand-in for /api/v1/admin, used only in __DEV__ (EXPO_PUBLIC_ADMIN_MOCK=1),
 * by Jest and by screenshots. It follows the real contract: the same paths and
 * methods, `{ data }` / `{ error: { code, message } }` envelopes, the admin guard's
 * DEVICE_PENDING / DEVICE_REVOKED codes, rotating refresh tokens, a device secret
 * that is returned once, and step-up tokens bound to one action and spent once.
 */

export const MOCK_OTP = "123456";
const ACCESS_TTL_SEC = 900;
const DAY = 86_400_000;
const now = Date.parse("2026-10-26T06:30:00.000Z");
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

type MockDevice = AdminDevice & { secret: string };
type State = {
  serial: number;
  devices: Map<string, MockDevice>;
  access: Map<string, string>;
  refresh: Map<string, string>;
  stepUps: Map<string, AdminStepUpAction>;
  /** A PENDING phone becomes ACTIVE after this many refreshes, as if another admin approved it. */
  pendingRefreshes: number;
  inbox: Record<AdminInboxSegment, AdminInboxItem[]>;
  payments: AdminPayment[];
  commissions: AdminCommission[];
  plans: AdminPlan[];
  team: AdminTeam;
  orders: AdminShopOrder[];
  tickets: AdminTicketDetail[];
  settings: AdminSettings;
  adminDevices: AdminDeviceRow[];
  audit: AdminAuditEvent[];
  whatsappStatus: AdminWhatsApp["status"];
};

let state: State;

function card(id: string, title: string, subtitle: string, status: string, ageMs: number): AdminInboxItem {
  return { id, title, subtitle, status, createdAt: iso(ageMs) };
}

function seed(): State {
  return {
    serial: 0,
    devices: new Map(),
    access: new Map(),
    refresh: new Map(),
    stepUps: new Map(),
    pendingRefreshes: 2,
    inbox: {
      agents: [card("ap-2", "Neha Singh", "Depth 2", "PENDING", 2_400_000), card("ap-4", "Ravi Kumar", "Depth 1", "PENDING", 5_000_000)],
      devices: [card("dev-2", "Pixel 9", "Kavita Sharma", "PENDING", 3_600_000)],
      proofs: [card("order-1", "INV-2026-0141", "360000 paise", "PROOF_SENT", 7_200_000)],
      payouts: [card("user-agent-1", "Amit Verma", "394000 paise approved", "APPROVED", 0)],
      refunds: [card("ticket-2", "Refund for duplicate payment", "OPEN", "OPEN", 9_000_000)],
      shop: [card("order-2", "INV-2026-0139", "175000 paise", "PRINTING", 12_000_000)],
      support: [card("ticket-1", "QR not scanning", "OPEN", "OPEN", 1_200_000), card("ticket-2", "Refund for duplicate payment", "OPEN", "OPEN", 9_000_000)],
      failed: [card("pay-2", "49900 paise", "FAILED", "FAILED", 7_200_000)]
    },
    payments: [
      { id: "pay-1", amount: 2499000, status: "COMPLETED", provider: "RAZORPAY", createdAt: iso(3_600_000), utr: "RZ7261", invoiceNumber: "QR-2026-0311", email: "madhav@example.in", phone: "•••• 4218", plan: "Growth" },
      { id: "pay-2", amount: 49900, status: "FAILED", provider: "RAZORPAY", createdAt: iso(7_200_000), utr: null, invoiceNumber: null, email: "greencafe@example.in", phone: "•••• 1094", plan: "Starter" },
      { id: "pay-3", amount: 249900, status: "PENDING", provider: "UPI", createdAt: iso(9_000_000), utr: "UPI0911", invoiceNumber: null, email: "citydental@example.in", phone: "•••• 8110", plan: "Growth" }
    ],
    commissions: [
      { id: "com-1", agentId: "user-agent-1", agentName: "Amit Verma", kind: "SALE", amountPaise: 1000000, status: "APPROVED", createdAt: iso(DAY) },
      { id: "com-2", agentId: "user-agent-2", agentName: "Neha Singh", kind: "SALE", amountPaise: 620000, status: "PENDING", createdAt: iso(2 * DAY) },
      { id: "com-3", agentId: "user-agent-1", agentName: "Amit Verma", kind: "TEAM_OVERRIDE", amountPaise: 84000, status: "PAID", createdAt: iso(30 * DAY) }
    ],
    plans: [
      { id: "starter", nameEn: "Starter", nameHi: "स्टार्टर", slug: "starter", descriptionEn: "QR reviews", descriptionHi: "QR रिव्यू", modules: ["reviews", "qr"], badge: null, sortOrder: 1, active: true, visibleOnPricingPage: true, prices: [{ duration: "MONTH_1", pricePaise: 49900, mrpPaise: null, active: true }] },
      { id: "growth", nameEn: "Growth", nameHi: "ग्रोथ", slug: "growth", descriptionEn: "Reviews, menu and orders", descriptionHi: "रिव्यू, मेन्यू और ऑर्डर", modules: ["reviews", "qr", "menu", "orders"], badge: "Popular", sortOrder: 2, active: true, visibleOnPricingPage: true, prices: [{ duration: "MONTH_1", pricePaise: 249900, mrpPaise: null, active: true }, { duration: "YEAR_1", pricePaise: 2499000, mrpPaise: 2999000, active: true }] },
      { id: "pro", nameEn: "Pro", nameHi: "प्रो", slug: "pro", descriptionEn: "Every module", descriptionHi: "सभी सुविधाएँ", modules: ["reviews", "qr", "menu", "orders", "campaigns"], badge: null, sortOrder: 3, active: true, visibleOnPricingPage: true, prices: [{ duration: "YEAR_1", pricePaise: 5999000, mrpPaise: null, active: true }] }
    ],
    team: {
      settings: { maxTeamDepth: 2, minSharePercent: 50, maxSharePercent: 90, autoApproveSubAgents: false, tdsPercent: 5, tdsYearlyThresholdPaise: 1500000 },
      agents: [
        { id: "ap-1", userId: "user-agent-1", name: "Amit Verma", phone: "•••• 4218", status: "ACTIVE", active: true, sharePercent: null, depth: 1, leaderId: null, code: "AMIT7X" },
        { id: "ap-2", userId: "user-agent-2", name: "Neha Singh", phone: "•••• 1094", status: "PENDING", active: true, sharePercent: 70, depth: 2, leaderId: "ap-1", code: "NEHA3K" },
        { id: "ap-3", userId: "user-agent-3", name: "Rahul Jain", phone: "•••• 8110", status: "PAUSED", active: true, sharePercent: 60, depth: 2, leaderId: "ap-1", code: "RAHUL9" }
      ]
    },
    orders: [
      { id: "order-1", status: "PROOF_SENT", totalPaise: 360000, invoiceNumber: "INV-2026-0141", createdAt: iso(7_200_000), business: "The Green Cafe", name: "Rohit", phone: "•••• 1094" },
      { id: "order-2", status: "PRINTING", totalPaise: 175000, invoiceNumber: "INV-2026-0139", createdAt: iso(12_000_000), business: "City Dental Care", name: "Dr. Mehta", phone: "•••• 8110" },
      { id: "order-3", status: "PACKED", totalPaise: 150000, invoiceNumber: "INV-2026-0130", createdAt: iso(DAY), business: "Madhav Sweets", name: "Madhav", phone: "•••• 4218" }
    ],
    tickets: [
      { id: "ticket-1", subject: "QR not scanning", status: "OPEN", user: { id: "user-1", name: "Madhav", email: "madhav@example.in", phone: "•••• 4218" }, messages: [{ id: "m1", body: "The QR opens a blank page on two phones.", authorId: "user-1", createdAt: iso(1_200_000) }] },
      { id: "ticket-2", subject: "Refund for duplicate payment", status: "OPEN", user: { id: "user-2", name: "Dr. Mehta", email: "citydental@example.in", phone: "•••• 8110" }, messages: [{ id: "m2", body: "I was charged twice, please refund one.", authorId: "user-2", createdAt: iso(9_000_000) }] }
    ],
    settings: {
      maintenanceMode: false, maintenanceMessage: "", maxTeamDepth: 2, minSharePercent: 50, maxSharePercent: 90, autoApproveSubAgents: false,
      tdsPercent: 5, tdsYearlyThresholdPaise: 1500000, minVersionCode: 4, latestVersionCode: 5,
      flags: { newCheckout: true, shopShipping: false },
      notify: { paidPayment: true, failedPayment: true, signup: true, agentPending: true, printProof: true, payoutDue: true, supportTicket: true, whatsappDown: true }
    },
    adminDevices: [
      { id: "dev-1", name: "Pixel 8", platform: "android", status: "ACTIVE", lastSeenAt: iso(60_000), adminName: "Diwakar Sharma" },
      { id: "dev-2", name: "Pixel 9", platform: "android", status: "PENDING", lastSeenAt: iso(3_600_000), adminName: "Kavita Sharma" }
    ],
    audit: Array.from({ length: 24 }, (_, index) => ({
      id: `audit-${index + 1}`,
      createdAt: iso(index * 3_600_000),
      adminId: index % 2 ? "admin-2" : "admin-1",
      adminName: index % 2 ? "Kavita Sharma" : "Diwakar Sharma",
      deviceId: "dev-1",
      ip: "203.0.113.7",
      action: ["agent.update", "commission.pay", "plan.update", "admin.device"][index % 4],
      entity: ["AgentProfile", "User", "Plan", "AdminDevice"][index % 4],
      entityId: ["ap-2", "user-agent-1", "growth", "dev-3"][index % 4],
      reason: index % 4 === 1 ? "Verified monthly statement" : null,
      before: { status: "PENDING" },
      after: { status: "ACTIVE" }
    })),
    whatsappStatus: "connected"
  };
}

export function resetAdminMock() {
  state = seed();
}
resetAdminMock();

// ---------- envelope helpers ----------

const data = (value: unknown, status = 200): AdminTransportResponse => ({ status, body: { data: JSON.parse(JSON.stringify(value)) } });
const error = (status: number, code: string, message: string): AdminTransportResponse => ({ status, body: { error: { code, message } } });
const validation = (message: string) => error(400, "VALIDATION", message);

function header(request: AdminTransportRequest, name: string) {
  const found = Object.entries(request.headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return found?.[1] ?? null;
}

function body(request: AdminTransportRequest): Record<string, unknown> | null {
  if (!request.body) return {};
  try {
    const parsed = JSON.parse(request.body) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function issuePair(deviceId: string) {
  state.serial += 1;
  const accessToken = `mock-access-${state.serial}`;
  const refreshToken = `mock-refresh-${state.serial}-0123456789abcdef`;
  state.access.set(accessToken, deviceId);
  state.refresh.set(refreshToken, deviceId);
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SEC, tokenType: "Bearer" as const };
}

function publicDevice(device: MockDevice): AdminDevice {
  return { id: device.id, status: device.status, name: device.name, platform: device.platform };
}

/** requireAdminActor: a bearer admin token for a known device that is ACTIVE. */
function guard(request: AdminTransportRequest): { device: MockDevice } | AdminTransportResponse {
  const auth = header(request, "Authorization");
  if (!auth?.startsWith("Bearer ")) return error(401, "UNAUTHORIZED", "Sign in required");
  const deviceId = state.access.get(auth.slice(7));
  const device = deviceId ? state.devices.get(deviceId) : undefined;
  if (!device) return error(403, "FORBIDDEN", "Admin access only");
  if (device.status === "REVOKED") return error(403, "DEVICE_REVOKED", "This phone was signed out");
  if (device.status === "PENDING") return error(403, "DEVICE_PENDING", "This phone is waiting for approval");
  return { device };
}

/** requireStepUp: the X-Step-Up token must be for one of these actions, and is spent on use. */
function stepUp(request: AdminTransportRequest, ...actions: AdminStepUpAction[]) {
  const token = header(request, "X-Step-Up");
  const action = token ? state.stepUps.get(token) : undefined;
  if (!token || !action || !actions.includes(action)) return error(403, "STEP_UP_REQUIRED", "Enter the WhatsApp code to confirm this");
  state.stepUps.delete(token);
  return null;
}

const reasonMissing = (value: unknown) => (typeof value === "string" && value.trim() ? null : validation("A reason is required"));

function otpSent(message?: string): AdminOtpSent {
  return { sent: true, channel: "dev", resendAfterSec: 30, ...(message ? { message } : {}), devCode: MOCK_OTP };
}

function dashboard(range: string): AdminDashboard {
  const length = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const days = Array.from({ length }, (_, index) => new Date(now - (length - 1 - index) * DAY).toISOString().slice(0, 10));
  const wave = (base: number, step: number, amp: number, phase = 0) => days.map((_, index) => Math.max(0, Math.round(base + index * step + Math.sin((index + phase) * 0.6) * amp)));
  const revenue = wave(2_000_000, 16_000, 420_000);
  const previousRevenue = wave(1_800_000, 12_000, 330_000, 2);
  const signups = wave(4, 0.1, 2);
  const newPaid = wave(1, 0.05, 1);
  const shopOrders = wave(2, 0, 1, 1);
  const scans = wave(400, 4, 90);
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  return {
    range,
    start: `${days[0]}T00:00:00.000+05:30`,
    end: new Date(now + DAY).toISOString(),
    kpis: {
      revenuePaise: sum(revenue), previousRevenuePaise: sum(previousRevenue), newPaid: sum(newPaid), mrrPaise: 46200000, arrPaise: 46200000 * 12,
      activeSubs: 2180, trials: 84, expiring: 29, churned: 13, signups: sum(signups), previousSignups: Math.round(sum(signups) * 0.9),
      scans: sum(scans), shopOrders: sum(shopOrders)
    },
    series: { days, revenue, previousRevenue, signups, newPaid, shopOrders, scans },
    planMix: [{ planId: "starter", name: "Starter", count: 43 }, { planId: "growth", name: "Growth", count: 35 }, { planId: "pro", name: "Pro", count: 17 }],
    leaderboard: { label: "2026-10", rows: [{ agentId: "user-agent-1", name: "Amit Verma", amountPaise: 18340000 }, { agentId: "user-agent-2", name: "Neha Singh", amountPaise: 14750000 }] },
    health: { whatsapp: state.whatsappStatus, lastPaymentAt: iso(120_000), lastReconcileAt: iso(360_000), errorRate: 0.003 }
  };
}

function inbox(segment: AdminInboxSegment): AdminInbox {
  const counts = Object.fromEntries(Object.entries(state.inbox).map(([key, rows]) => [key, rows.length])) as AdminInbox["counts"];
  return { counts, segment, items: state.inbox[segment], nextCursor: null };
}

function userDetail(id: string): AdminUser {
  return {
    id, email: "madhav@example.in", name: "Madhav Sharma", phone: "•••• 4218", role: "USER", suspended: false, tier: "GROWTH",
    subscriptionStatus: "ACTIVE", subscriptionEndsAt: "2026-12-15T00:00:00.000Z", trialEndsAt: null, createdAt: iso(200 * DAY),
    subscription: { planId: "growth", plan: "Growth", status: "ACTIVE", endsAt: "2026-12-15T00:00:00.000Z", duration: "YEAR_1", modules: ["reviews", "qr", "menu", "orders"], pricePaise: 2499000 },
    businesses: [{ id: "biz-1", name: "Madhav Sweets", slug: "madhav-sweets", isActive: true }],
    payments: [{ id: "pay-1", amount: 2499000, status: "COMPLETED", provider: "RAZORPAY", createdAt: iso(3_600_000) }],
    devices: [{ id: "qr-1", shortCode: "MS01", status: "ACTIVE", kind: "QR" }],
    timeline: [{ id: "audit-x", action: "user.subscription.extend", createdAt: iso(DAY), reason: "Festival offer" }]
  };
}

function businessDetail(id: string): AdminBusiness {
  return {
    id, name: "Madhav Sweets", slug: "madhav-sweets", isActive: true, city: "Jaipur", phone: "•••• 4218", email: "madhav@example.in", createdAt: iso(200 * DAY),
    owner: { id: "user-1", name: "Madhav Sharma", email: "madhav@example.in", phone: "•••• 4218", tier: "GROWTH", subscriptionStatus: "ACTIVE", subscriptionEndsAt: "2026-12-15T00:00:00.000Z" },
    timeline: [{ id: "audit-y", action: "business.note", createdAt: iso(2 * DAY), reason: "Called owner" }]
  };
}

function search(q: string): AdminSearch {
  const needle = q.toLowerCase();
  const has = (...values: (string | null)[]) => values.some((value) => value?.toLowerCase().includes(needle));
  return {
    users: [{ id: "user-1", name: "Madhav Sharma", email: "madhav@example.in", phone: "•••• 4218", role: "USER" }].filter((row) => has(row.name, row.email)),
    businesses: [{ id: "biz-1", name: "Madhav Sweets", slug: "madhav-sweets", isActive: true }].filter((row) => has(row.name, row.slug)),
    payments: state.payments.filter((row) => has(row.id, row.utr, row.invoiceNumber)).map(({ id, amount, status, utr, invoiceNumber, createdAt }) => ({ id, amount, status, utr, invoiceNumber, createdAt })),
    agents: state.team.agents.filter((row) => has(row.name, row.code)).map(({ id, userId, name, code, status, phone }) => ({ id, userId, name, code, status, phone })),
    orders: state.orders.filter((row) => has(row.id, row.invoiceNumber)).map(({ id, status, totalPaise, invoiceNumber, createdAt }) => ({ id, status, totalPaise, invoiceNumber, createdAt }))
  };
}

function removeFromInbox(segment: AdminInboxSegment, ids: string[]) {
  state.inbox[segment] = state.inbox[segment].filter((row) => !ids.includes(row.id));
}

// ---------- routes ----------

export async function adminMockTransport(path: string, request: AdminTransportRequest): Promise<AdminTransportResponse> {
  const [pathname, search_ = ""] = path.split("?");
  const params = new URLSearchParams(search_);
  const method = request.method.toUpperCase();
  const input = body(request);
  if (input === null) return validation("Invalid request");
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/");
  const route = `${method} /${parts.map((part, index) => (index > 0 && /^(users|businesses|payments|plans|orders|support|devices)$/.test(parts[index - 1]) ? ":id" : part)).join("/")}`;
  const id = decodeURIComponent(parts[parts.length - 1] ?? "");

  // ----- auth (no bearer) -----
  if (route === "POST /auth/otp/request") {
    if (typeof input.phone !== "string" || input.phone.length < 10) return validation("Enter a valid mobile number");
    return data(otpSent("Enter this code to sign in"));
  }
  if (route === "POST /auth/otp/verify") {
    if (input.code !== MOCK_OTP) return validation("Invalid code");
    if (typeof input.deviceName !== "string" || !input.deviceName.trim()) return validation("Invalid request");
    const saved = typeof input.deviceId === "string" ? state.devices.get(input.deviceId) : undefined;
    // openAdminDevice: reuse a device only with the secret it was issued, and never a revoked one.
    const reuse = saved && saved.status !== "REVOKED" && input.deviceSecret === saved.secret ? saved : null;
    let device: MockDevice;
    let deviceSecret: string | undefined;
    if (reuse) {
      device = reuse;
      device.name = input.deviceName.trim();
    } else {
      state.serial += 1;
      deviceSecret = `mock-device-secret-${state.serial}`;
      device = { id: `admin-device-${state.serial}`, status: "PENDING", name: input.deviceName.trim(), platform: String(input.platform ?? "android"), secret: deviceSecret };
      state.devices.set(device.id, device);
      state.pendingRefreshes = 2;
    }
    const session: AdminSession = { ...issuePair(device.id), device: publicDevice(device), ...(deviceSecret ? { deviceSecret } : {}) };
    return data(session);
  }
  if (route === "POST /auth/refresh") {
    const token = typeof input.refreshToken === "string" ? input.refreshToken : "";
    const deviceId = state.refresh.get(token);
    const device = deviceId ? state.devices.get(deviceId) : undefined;
    if (!device || device.status === "REVOKED") return error(401, "UNAUTHORIZED", "Refresh token is not valid");
    state.refresh.delete(token);
    if (device.status === "PENDING") {
      if (state.pendingRefreshes > 0) state.pendingRefreshes -= 1;
      else device.status = "ACTIVE";
    }
    const refreshed: AdminRefreshed = { ...issuePair(device.id), device: publicDevice(device) };
    return data(refreshed);
  }
  if (route === "POST /auth/logout") {
    const token = typeof input.refreshToken === "string" ? input.refreshToken : "";
    if (!state.refresh.delete(token)) return error(401, "UNAUTHORIZED", "Refresh token is not valid");
    return data({ ok: true });
  }

  // ----- everything else needs an ACTIVE admin phone -----
  const gate = guard(request);
  if ("status" in gate) return gate;

  if (route === "POST /step-up") {
    if (!input.code) return data(otpSent("Enter this code to confirm the change"));
    if (typeof input.code !== "string" || !/^\d{6}$/.test(input.code)) return validation("Invalid code");
    if (!input.action) return validation("Choose the action to confirm");
    if (input.code !== MOCK_OTP) return validation("Invalid code");
    state.serial += 1;
    const stepUpToken = `mock-step-up-${state.serial}`;
    state.stepUps.set(stepUpToken, input.action as AdminStepUpAction);
    const token: AdminStepUpToken = { stepUpToken, expiresIn: 300 };
    return data(token);
  }

  if (route === "GET /dashboard") {
    const range = params.get("range") || "7d";
    if (!["today", "7d", "30d", "mtd", "custom"].includes(range)) return validation("range must be today, 7d, 30d, mtd, or custom");
    if (range === "custom" && !(params.get("from") && params.get("to"))) return validation("Use from and to as YYYY-MM-DD");
    return data(dashboard(range));
  }

  if (route === "GET /inbox") {
    const segment = (params.get("segment") || "agents") as AdminInboxSegment;
    if (!(segment in state.inbox)) return validation("Unknown inbox segment");
    return data(inbox(segment));
  }
  if (route === "POST /inbox") {
    const segment = input.segment as AdminInboxSegment;
    if (!(segment in state.inbox)) return validation("Invalid request");
    if (segment === "devices" && input.action === "approve") {
      const denied = stepUp(request, "approve_device");
      if (denied) return denied;
    }
    const ids = [...new Set([...(Array.isArray(input.ids) ? input.ids.map(String) : []), ...(typeof input.id === "string" ? [input.id] : [])])];
    if (!ids.length) return validation("Choose at least one item");
    if (segment === "payouts") return validation("Mark a payout paid from Money");
    const allowed: Record<AdminInboxSegment, string[]> = { agents: ["approve", "reject"], devices: ["approve", "revoke"], proofs: ["approve"], payouts: [], refunds: ["close"], shop: ["advance"], support: ["close"], failed: ["reject"] };
    const changed = allowed[segment].includes(String(input.action)) ? state.inbox[segment].filter((row) => ids.includes(row.id)).length : 0;
    if (!changed) return validation("Nothing could be updated");
    removeFromInbox(segment, ids);
    if (segment === "support" || segment === "refunds") { removeFromInbox("support", ids); removeFromInbox("refunds", ids); }
    return data({ changed });
  }

  if (route === "GET /search") {
    const q = (params.get("q") || "").trim();
    if (q.length < 2) return validation("Type at least 2 characters");
    return data(search(q));
  }

  if (route === "GET /users/:id") return data(userDetail(id));
  if (route === "POST /users/:id") {
    const action = input.action;
    if (action === "reveal") return data({ phone: "+919876542180" });
    if (action === "role") {
      const denied = stepUp(request, "change_role");
      return denied ?? data({ before: { role: "USER" }, after: { role: input.role } });
    }
    if (action === "plan") {
      const plan = state.plans.find((row) => row.id === input.planId);
      if (!plan) return error(404, "NOT_FOUND", "Plan not found");
      const price = plan.prices.find((row) => row.duration === input.duration && row.active) ?? plan.prices.find((row) => row.active);
      if (price && price.duration !== "MONTH_1") {
        const missing = reasonMissing(input.reason);
        if (missing) return missing;
        const denied = stepUp(request, "change_user_plan");
        if (denied) return denied;
      }
      return data({ before: {}, after: { planId: plan.id, duration: price?.duration } });
    }
    if (action === "grant") {
      const days = Number(input.days);
      if (!Number.isInteger(days) || days < 1 || days > 3650) return validation("Invalid request");
      if (days > 30) {
        const missing = reasonMissing(input.reason);
        if (missing) return missing;
        const denied = stepUp(request, "grant_days_over_30");
        if (denied) return denied;
      }
      return data({ before: {}, after: { days } });
    }
    if (action === "note" && !(typeof input.note === "string" && input.note.trim())) return validation("Invalid request");
    if (["cancel", "suspend", "unsuspend", "resend", "reset-onboarding", "note"].includes(String(action))) return data({ after: { action } });
    return validation("Invalid request");
  }
  if (route === "GET /businesses/:id") return data(businessDetail(id));
  if (route === "POST /businesses/:id") {
    if (input.action === "reveal") return data({ phone: "+919876542180" });
    if (input.action === "note" && !(typeof input.note === "string" && input.note.trim())) return validation("Invalid request");
    if (["suspend", "unsuspend", "note"].includes(String(input.action))) return data({ after: { action: input.action } });
    return validation("Invalid request");
  }

  if (route === "GET /payments") {
    const status = params.get("status");
    const provider = params.get("provider");
    return data({ items: state.payments.filter((row) => (!status || row.status === status) && (!provider || row.provider === provider)), nextCursor: null });
  }
  if (route === "GET /payments/:id") {
    const row = state.payments.find((item) => item.id === id);
    if (!row) return error(404, "NOT_FOUND", "Payment not found");
    const detail: AdminPaymentDetail = { id: row.id, amount: row.amount, status: row.status, provider: row.provider, providerOrderId: null, providerPaymentId: null, utr: row.utr, refundUtr: null, invoiceNumber: row.invoiceNumber, invoiceUrl: null, payerVpa: null, reference: null, createdAt: row.createdAt, plan: row.plan, user: { id: "user-1", name: null, email: row.email, phone: row.phone } };
    return data(detail);
  }
  if (route === "POST /payments/:id") {
    const row = state.payments.find((item) => item.id === id);
    if (!row) return error(404, "NOT_FOUND", "Payment not found");
    if (input.action === "refund" || input.action === "approve") {
      const missing = reasonMissing(input.reason);
      if (missing) return missing;
      const denied = stepUp(request, input.action === "refund" ? "refund_payment" : "approve_payment");
      if (denied) return denied;
    }
    const before = { status: row.status };
    if (input.action === "refund") {
      if (String(input.refundUtr ?? "").trim().length < 6) return validation("Enter the refund UTR");
      if (row.status !== "COMPLETED") return error(409, "CONFLICT", "Only a completed payment can be refunded");
      row.status = "REFUNDED";
    } else if (input.action === "approve") {
      if (!["PENDING", "QUEUED", "FAILED"].includes(row.status)) return error(409, "CONFLICT", "Payment cannot be approved");
      row.status = "COMPLETED";
    } else if (input.action === "reject") {
      if (!["PENDING", "QUEUED"].includes(row.status)) return error(409, "CONFLICT", "Only a pending payment can be rejected");
      row.status = "FAILED";
    } else if (input.action === "invoice") {
      return data({ link: `https://qr24x7.in/api/billing/invoices/${row.id}` });
    } else if (input.action !== "reconcile") {
      return validation("Invalid request");
    }
    return data({ before, after: { status: row.status } });
  }
  if (route === "GET /commissions") {
    const status = params.get("status");
    return data({ items: state.commissions.filter((row) => !status || row.status === status), nextCursor: null });
  }
  if (route === "POST /commissions") {
    const agentId = String(input.agentId ?? "");
    if (!agentId) return validation("Invalid request");
    if (input.action === "pay") {
      const missing = reasonMissing(input.reason);
      if (missing) return missing;
      const denied = stepUp(request, "mark_payout_paid");
      if (denied) return denied;
      const due = state.commissions.filter((row) => row.agentId === agentId && row.status === "APPROVED");
      if (!due.length) return validation("Nothing approved to pay");
      due.forEach((row) => { row.status = "PAID"; });
      return data({ before: { status: "APPROVED" }, after: { status: "PAID", payoutId: `payout-${agentId}` } });
    }
    if (input.action === "approve") {
      const due = state.commissions.filter((row) => row.agentId === agentId && row.status === "PENDING");
      due.forEach((row) => { row.status = "APPROVED"; });
      return data({ count: due.length, before: { status: "PENDING" }, after: { status: "APPROVED", count: due.length } });
    }
    return validation("Invalid request");
  }

  if (route === "GET /plans") return data({ items: state.plans });
  if (route === "PATCH /plans/:id") {
    const plan = state.plans.find((row) => row.id === id);
    if (!Object.values(input).some((value) => value !== undefined)) return validation("Nothing to update");
    if (input.modules != null || input.pricePaise != null || "mrpPaise" in input) {
      const denied = stepUp(request, "change_plan_price", "change_plan_modules");
      if (denied) return denied;
    }
    if (!plan) return error(404, "NOT_FOUND", "Plan not found");
    const before = { active: plan.active, visibleOnPricingPage: plan.visibleOnPricingPage, modules: plan.modules };
    if (typeof input.active === "boolean") plan.active = input.active;
    if (typeof input.visibleOnPricingPage === "boolean") plan.visibleOnPricingPage = input.visibleOnPricingPage;
    if (Array.isArray(input.modules)) plan.modules = input.modules.map(String);
    if (typeof input.duration === "string" && typeof input.pricePaise === "number") {
      const price = plan.prices.find((row) => row.duration === input.duration);
      if (price) { price.pricePaise = input.pricePaise; price.active = true; }
      else plan.prices.push({ duration: input.duration as AdminPlan["prices"][number]["duration"], pricePaise: input.pricePaise, mrpPaise: null, active: true });
    }
    return data({ before, after: { id, active: plan.active, visibleOnPricingPage: plan.visibleOnPricingPage, modules: plan.modules } });
  }

  if (route === "GET /agents/team") return data(state.team);
  if (route === "POST /agents/team") {
    const agent = state.team.agents.find((row) => row.id === input.id);
    if (!agent) return error(404, "NOT_FOUND", "Agent not found");
    const before = { status: agent.status, sharePercent: agent.sharePercent, leaderId: agent.leaderId };
    switch (input.action) {
      case "approve": case "resume": agent.status = "ACTIVE"; break;
      case "reject": agent.status = "REJECTED"; break;
      case "pause": agent.status = "PAUSED"; break;
      case "share": {
        const share = Number(input.sharePercent);
        if (!Number.isInteger(share) || share < state.team.settings.minSharePercent || share > state.team.settings.maxSharePercent) return validation("Share is outside the allowed range");
        agent.sharePercent = share;
        break;
      }
      case "move": {
        const leader = state.team.agents.find((row) => row.userId === input.leaderUserId);
        if (!leader) return error(404, "NOT_FOUND", "Agent not found");
        if (leader.id === agent.id) return validation("An agent cannot lead themselves");
        agent.leaderId = leader.id;
        agent.depth = leader.depth + 1;
        break;
      }
      case "update":
        if (typeof input.name === "string" && input.name) agent.name = input.name;
        if (typeof input.active === "boolean") agent.active = input.active;
        break;
      case "reassign": break;
      default: return validation("Invalid request");
    }
    return data({ before, after: { action: input.action } });
  }

  if (route === "GET /shop/orders") {
    const status = params.get("status");
    const listed: AdminShopOrders = {
      items: state.orders.filter((row) => !status || row.status === status),
      nextCursor: null,
      lowStock: [{ id: "var-1", sku: "STAND-A5", name: "Acrylic stand A5", stock: 4, lowStockAt: 10 }]
    };
    return data(listed);
  }
  if (route === "GET /shop/orders/:id") {
    const row = state.orders.find((item) => item.id === id);
    if (!row) return error(404, "NOT_FOUND", "Order not found");
    const detail: AdminShopOrderDetail = { ...row, paymentStatus: "PAID", subtotalPaise: row.totalPaise, discountPaise: 0, advancePaise: row.totalPaise, balancePaise: 0, buyerLegalName: null, email: "owner@example.in", shipment: null, lines: [{ id: `${row.id}-l1`, sku: "STAND-A5", name: "Acrylic QR stand", qty: 12, unitPaise: Math.round(row.totalPaise / 12), needsNfc: false }] };
    return data(detail);
  }
  if (route === "POST /shop/orders/:id") {
    const row = state.orders.find((item) => item.id === id);
    if (!row) return error(404, "NOT_FOUND", "Order not found");
    if (input.action === "approve-proof") {
      if (row.status !== "PROOF_SENT") return validation("That order cannot move to APPROVED");
      row.status = "APPROVED";
      removeFromInbox("proofs", [id]);
      return data({ status: row.status });
    }
    if (input.action === "move") {
      if (!input.to) return validation("Choose the next status");
      row.status = String(input.to) as AdminShopOrder["status"];
      return data({ status: row.status });
    }
    if (input.action === "tracking") {
      const awb = String(input.awb ?? "").trim();
      if (awb.length < 4) return validation("Enter a tracking number");
      const moved = row.status === "PACKED" || row.status === "PICKUP_SCHEDULED";
      if (moved) row.status = "SHIPPED";
      return data({ moved, awb: awb.slice(0, 64), status: row.status });
    }
    return validation("Invalid request");
  }

  if (route === "GET /support") {
    const status = params.get("status");
    const items: AdminTicket[] = state.tickets
      .filter((row) => !status || row.status === status)
      .map((row) => ({ id: row.id, subject: row.subject, status: row.status, createdAt: row.messages[0]?.createdAt ?? iso(0), updatedAt: row.messages[row.messages.length - 1]?.createdAt ?? iso(0), name: row.user.name, email: row.user.email, phone: row.user.phone }));
    return data({ items, nextCursor: null });
  }
  if (route === "GET /support/:id") {
    const ticket = state.tickets.find((row) => row.id === id);
    return ticket ? data(ticket) : error(404, "NOT_FOUND", "Ticket not found");
  }
  if (route === "POST /support/:id") {
    const ticket = state.tickets.find((row) => row.id === id);
    if (!ticket) return error(404, "NOT_FOUND", "Ticket not found");
    const text = typeof input.body === "string" ? input.body.trim() : "";
    if (!text && !input.status) return validation("Write a reply");
    const before = { status: ticket.status };
    if (text) ticket.messages.push({ id: `m${ticket.messages.length + 10}`, body: text, authorId: "admin-1", createdAt: new Date(now).toISOString() });
    ticket.status = input.status === "CLOSED" ? "CLOSED" : "OPEN";
    return data({ before, after: { status: ticket.status } });
  }

  if (route === "GET /whatsapp") {
    const info: AdminWhatsApp = {
      status: state.whatsappStatus, qrPng: null, phoneNumber: "919876542180", error: null, connectedAt: iso(DAY), lastEvent: "connection.open",
      delivery: { lastAt: iso(120_000), lastChannel: "whatsapp", counts: { whatsapp: 42, email: 3, dev: 0 } }
    };
    return data(info);
  }
  if (route === "POST /whatsapp/reconnect") {
    const denied = stepUp(request, "whatsapp_pairing");
    if (denied) return denied;
    state.whatsappStatus = "qr-pending";
    return data({ status: "starting", qrPng: null, phoneNumber: null, error: null, connectedAt: null, lastEvent: "reconnect" });
  }
  if (route === "POST /whatsapp/test") return data({ via: "baileys", to: "•••• 4218" });

  if (route === "GET /settings") return data(state.settings);
  if (route === "PUT /settings") {
    const sensitive = ["minSharePercent", "maxSharePercent", "tdsPercent", "tdsYearlyThresholdPaise"].some((field) => input[field] !== undefined);
    if (sensitive) {
      const denied = stepUp(request, "change_settings");
      if (denied) return denied;
    }
    const before = JSON.parse(JSON.stringify(state.settings)) as AdminSettings;
    const { flags, notify, ...rest } = input as Partial<AdminSettings>;
    state.settings = { ...state.settings, ...rest, flags: { ...state.settings.flags, ...(flags ?? {}) }, notify: { ...state.settings.notify, ...(notify ?? {}) } };
    return data({ before, after: state.settings });
  }

  if (route === "GET /devices") return data({ devices: state.adminDevices });
  if (route === "POST /devices/:id") {
    if (input.action !== "approve" && input.action !== "revoke") return validation("Invalid request");
    if (input.action === "approve") {
      const denied = stepUp(request, "approve_device");
      if (denied) return denied;
    }
    const row = state.adminDevices.find((item) => item.id === id);
    if (!row) return error(404, "NOT_FOUND", "Device not found");
    if (input.action === "approve" && row.status === "REVOKED") return validation("Revoked devices need a new sign-in");
    row.status = input.action === "approve" ? "ACTIVE" : "REVOKED";
    return data({ devices: state.adminDevices });
  }

  if (route === "GET /audit") {
    const action = params.get("action");
    const admin = params.get("admin");
    return data({ items: state.audit.filter((row) => (!action || row.action === action) && (!admin || row.adminId === admin)), nextCursor: null });
  }

  return error(404, "NOT_FOUND", `Unmocked admin request: ${method} ${pathname}`);
}

/** Test helper: revoke a signed-in phone as another admin would. */
export function revokeMockAdminDevice(deviceId: string) {
  const device = state.devices.get(deviceId);
  if (device) device.status = "REVOKED";
}

/** Test and screenshot helper: an already approved phone with a fresh token pair. */
export function seedActiveMockAdmin(): AdminSession {
  state.serial += 1;
  const device: MockDevice = { id: `admin-device-${state.serial}`, status: "ACTIVE", name: "Pixel 8", platform: "android", secret: `mock-device-secret-${state.serial}` };
  state.devices.set(device.id, device);
  return { ...issuePair(device.id), device: publicDevice(device), deviceSecret: device.secret };
}

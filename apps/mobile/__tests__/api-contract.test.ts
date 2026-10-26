/**
 * Contract tests for the admin and agent API clients.
 *
 * For every client function this checks the exact path, method and body the
 * server route expects (bodies are parsed with the same zod schemas the routes
 * use), and parses a response. It also reads app/api/v1/{admin,agent}/** so a
 * new, renamed or removed server route fails here until the client follows.
 */
import fs from "fs";
import path from "path";
import type { ZodTypeAny } from "zod";

const mockStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  })
}));
jest.mock("../src/state/session", () => ({ useSession: () => ({ user: null }) }));

import {
  adminBusinessActionSchema, adminCommissionActionSchema, adminDeviceActionSchema, adminInboxActionSchema, adminMeSchema,
  adminMoneySummarySchema, adminMyDevicesSchema, adminOtpVerifySchema, adminPaymentActionSchema, adminPayoutsPageSchema,
  adminPlanPatchSchema, adminSessionSchema, adminSettingsPatchSchema, adminShopActionSchema, adminShopOrderDetailSchema,
  adminStepUpSchema, adminStepUpTokenSchema, adminSupportActionSchema, adminTeamActionSchema, adminTeamResponseSchema,
  adminUserActionSchema, adminWhatsAppStatusSchema, adminWhatsAppTestSchema, agentBusinessesSchema, agentCommissionsSchema, agentHomeSchema, agentInviteBodySchema,
  agentInviteResultSchema, agentJoinBodySchema, agentJoinResultSchema, agentMemberDetailSchema, agentMemberPatchSchema,
  agentOnboardSchema, agentPayoutsSchema, agentProfilePutSchema, agentProfileSchema, agentTeamSchema, logoutSchema,
  otpRequestSchema, otpSentSchema, refreshSchema, tokenPairSchema
} from "@reviewqr/shared";
import { adminApi, refreshAdminSession, setAdminTransport, writeAdminTokens, type AdminTransport } from "../src/admin/api";
import { adminMockTransport, MOCK_OTP, resetAdminMock, seedActiveMockAdmin } from "../src/admin/mock";
import { agentRequests } from "../src/agent/api";
import { agentMockRequest, resetAgentMock } from "../src/agent/mock";

const repoRoot = path.resolve(__dirname, "../../..");

/** "METHOD /path/:id" for every handler exported under app/api/v1/<area>. */
function serverRoutes(area: "admin" | "agent") {
  const base = path.join(repoRoot, "app/api/v1", area);
  const routes: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") {
        const rel = path.relative(base, dir).split(path.sep).filter(Boolean).map((part) => (/^\[.+\]$/.test(part) ? ":id" : part));
        const source = fs.readFileSync(full, "utf8");
        for (const match of source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE)\b/g)) routes.push(`${match[1]} /${rel.join("/")}`);
      }
    }
  };
  walk(base);
  return routes.sort();
}

// ---------------------------------------------------------------- admin

type Sent = { path: string; method: string; headers: Record<string, string>; body?: string; status: number; response: unknown };
const sent: Sent[] = [];
const recorder: AdminTransport = async (requestPath, request) => {
  const response = await adminMockTransport(requestPath, request);
  sent.push({ path: requestPath, ...request, status: response.status, response: response.body });
  return response;
};

type AdminCase = {
  /** The adminApi key (or "refresh" for refreshAdminSession). */
  fn: keyof typeof adminApi | "refresh";
  route: string;
  path: string;
  body?: ZodTypeAny;
  /** The step-up action this call must carry in X-Step-Up. */
  stepUp?: Parameters<typeof adminApi.verifyStepUp>[0];
  response?: ZodTypeAny;
  call: (stepUp: string | null) => Promise<unknown>;
};

const adminCases: AdminCase[] = [
  { fn: "requestOtp", route: "POST /auth/otp/request", path: "/auth/otp/request", body: otpRequestSchema, response: otpSentSchema, call: () => adminApi.requestOtp("9876543210") },
  { fn: "verifyOtp", route: "POST /auth/otp/verify", path: "/auth/otp/verify", body: adminOtpVerifySchema, response: adminSessionSchema, call: () => adminApi.verifyOtp({ phone: "9876543210", code: MOCK_OTP, deviceName: "Pixel 9", platform: "android", pushToken: "ExponentPushToken[x]", deviceId: "admin-device-1", deviceSecret: "wrong" }) },
  { fn: "refresh", route: "POST /auth/refresh", path: "/auth/refresh", body: refreshSchema, response: tokenPairSchema.extend({ device: adminSessionSchema.shape.device }), call: () => refreshAdminSession() },
  { fn: "logout", route: "POST /auth/logout", path: "/auth/logout", body: logoutSchema, call: async () => adminApi.logout(mockStore.get("qr24x7.admin.refresh") ?? "") },
  { fn: "sendStepUp", route: "POST /step-up", path: "/step-up", body: adminStepUpSchema, response: otpSentSchema, call: () => adminApi.sendStepUp() },
  { fn: "verifyStepUp", route: "POST /step-up", path: "/step-up", body: adminStepUpSchema, response: adminStepUpTokenSchema, call: () => adminApi.verifyStepUp("approve_device", MOCK_OTP) },
  { fn: "dashboard", route: "GET /dashboard", path: "/dashboard?range=custom&from=2026-10-01&to=2026-10-26", call: () => adminApi.dashboard("custom", "2026-10-01", "2026-10-26") },
  { fn: "inbox", route: "GET /inbox", path: "/inbox?segment=devices", call: () => adminApi.inbox("devices") },
  { fn: "inboxAction", route: "POST /inbox", path: "/inbox", body: adminInboxActionSchema, stepUp: "approve_device", call: (stepUp) => adminApi.inboxAction({ segment: "devices", action: "approve", id: "dev-2" }, stepUp) },
  { fn: "search", route: "GET /search", path: "/search?q=Madhav", call: () => adminApi.search(" Madhav ") },
  { fn: "user", route: "GET /users/:id", path: "/users/user-1", call: () => adminApi.user("user-1") },
  { fn: "userAction", route: "POST /users/:id", path: "/users/user-1", body: adminUserActionSchema, stepUp: "grant_days_over_30", call: (stepUp) => adminApi.userAction("user-1", { action: "grant", days: 45, reason: "Festival offer" }, stepUp) },
  { fn: "revealUserPhone", route: "POST /users/:id", path: "/users/user-1", body: adminUserActionSchema, call: () => adminApi.revealUserPhone("user-1") },
  { fn: "business", route: "GET /businesses/:id", path: "/businesses/biz-1", call: () => adminApi.business("biz-1") },
  { fn: "businessAction", route: "POST /businesses/:id", path: "/businesses/biz-1", body: adminBusinessActionSchema, call: () => adminApi.businessAction("biz-1", { action: "note", note: "Called owner" }) },
  { fn: "revealBusinessPhone", route: "POST /businesses/:id", path: "/businesses/biz-1", body: adminBusinessActionSchema, call: () => adminApi.revealBusinessPhone("biz-1") },
  { fn: "payments", route: "GET /payments", path: "/payments?status=COMPLETED&provider=RAZORPAY", call: () => adminApi.payments({ status: "COMPLETED", provider: "RAZORPAY" }) },
  { fn: "payment", route: "GET /payments/:id", path: "/payments/pay-1", call: () => adminApi.payment("pay-1") },
  { fn: "paymentAction", route: "POST /payments/:id", path: "/payments/pay-1", body: adminPaymentActionSchema, stepUp: "refund_payment", call: (stepUp) => adminApi.paymentAction("pay-1", { action: "refund", refundUtr: "UTR123456", reason: "Duplicate charge" }, stepUp) },
  { fn: "commissions", route: "GET /commissions", path: "/commissions?status=APPROVED", call: () => adminApi.commissions("APPROVED") },
  { fn: "commissionAction", route: "POST /commissions", path: "/commissions", body: adminCommissionActionSchema, stepUp: "mark_payout_paid", call: (stepUp) => adminApi.commissionAction({ action: "pay", agentId: "user-agent-1", utr: "UTR998877", reason: "October payout" }, stepUp) },
  { fn: "plans", route: "GET /plans", path: "/plans", call: () => adminApi.plans() },
  { fn: "patchPlan", route: "PATCH /plans/:id", path: "/plans/growth", body: adminPlanPatchSchema, stepUp: "change_plan_modules", call: (stepUp) => adminApi.patchPlan("growth", { modules: ["qr", "reviews"] }, stepUp) },
  { fn: "me", route: "GET /me", path: "/me", response: adminMeSchema, call: () => adminApi.me() },
  { fn: "moneySummary", route: "GET /money/summary", path: "/money/summary?range=30d", response: adminMoneySummarySchema, call: () => adminApi.moneySummary("30d") },
  { fn: "payouts", route: "GET /payouts", path: "/payouts", response: adminPayoutsPageSchema, call: () => adminApi.payouts() },
  { fn: "team", route: "GET /agents/team", path: "/agents/team", response: adminTeamResponseSchema, call: () => adminApi.team() },
  { fn: "teamAction", route: "POST /agents/team", path: "/agents/team", body: adminTeamActionSchema, call: () => adminApi.teamAction({ action: "share", id: "ap-2", sharePercent: 75 }) },
  { fn: "shopOrders", route: "GET /shop/orders", path: "/shop/orders?status=PACKED", call: () => adminApi.shopOrders("PACKED") },
  { fn: "shopOrder", route: "GET /shop/orders/:id", path: "/shop/orders/order-3", response: adminShopOrderDetailSchema, call: () => adminApi.shopOrder("order-3") },
  { fn: "shopAction", route: "POST /shop/orders/:id", path: "/shop/orders/order-3", body: adminShopActionSchema, call: () => adminApi.shopAction("order-3", { action: "tracking", awb: "AWB12345", courierName: "Delhivery" }) },
  { fn: "tickets", route: "GET /support", path: "/support?status=OPEN", call: () => adminApi.tickets("OPEN") },
  { fn: "ticket", route: "GET /support/:id", path: "/support/ticket-1", call: () => adminApi.ticket("ticket-1") },
  { fn: "ticketAction", route: "POST /support/:id", path: "/support/ticket-1", body: adminSupportActionSchema, call: () => adminApi.ticketAction("ticket-1", { body: "Please rescan now." }) },
  { fn: "whatsapp", route: "GET /whatsapp", path: "/whatsapp", response: adminWhatsAppStatusSchema, call: () => adminApi.whatsapp() },
  { fn: "whatsappReconnect", route: "POST /whatsapp/reconnect", path: "/whatsapp/reconnect", stepUp: "whatsapp_pairing", call: (stepUp) => adminApi.whatsappReconnect(stepUp ?? "") },
  { fn: "whatsappTest", route: "POST /whatsapp/test", path: "/whatsapp/test", body: adminWhatsAppTestSchema, call: () => adminApi.whatsappTest("Hello") },
  { fn: "settings", route: "GET /settings", path: "/settings", call: () => adminApi.settings() },
  { fn: "patchSettings", route: "PUT /settings", path: "/settings", body: adminSettingsPatchSchema, stepUp: "change_settings", call: (stepUp) => adminApi.patchSettings({ tdsPercent: 5, notify: { signup: false } }, stepUp) },
  { fn: "devices", route: "GET /devices", path: "/devices", call: () => adminApi.devices() },
  { fn: "myDevices", route: "GET /devices/mine", path: "/devices/mine", response: adminMyDevicesSchema, call: () => adminApi.myDevices() },
  { fn: "deviceAction", route: "POST /devices/:id", path: "/devices/dev-1", body: adminDeviceActionSchema, call: () => adminApi.deviceAction("dev-1", "revoke") },
  { fn: "audit", route: "GET /audit", path: "/audit?action=plan.update", call: () => adminApi.audit({ action: "plan.update" }) }
];

describe("admin client contract", () => {
  beforeEach(async () => {
    mockStore.clear();
    sent.length = 0;
    resetAdminMock();
    setAdminTransport(recorder);
    await writeAdminTokens(seedActiveMockAdmin());
  });
  afterAll(() => setAdminTransport(null));

  it("has a case for every client function", () => {
    const covered = new Set(adminCases.map((item) => item.fn));
    expect(Object.keys(adminApi).filter((name) => !covered.has(name as keyof typeof adminApi))).toEqual([]);
  });

  it("calls exactly the routes the server exports", () => {
    const client = [...new Set(adminCases.map((item) => item.route))].sort();
    expect(client).toEqual(serverRoutes("admin"));
  });

  it.each(adminCases.map((item) => [`${item.fn} → ${item.route}`, item] as const))("%s", async (_name, item) => {
    let stepUp: string | null = null;
    if (item.stepUp) {
      stepUp = (await adminApi.verifyStepUp(item.stepUp, MOCK_OTP)).stepUpToken;
      sent.length = 0;
    }
    const result = await item.call(stepUp);
    const request = sent[sent.length - 1];
    expect(request.method).toBe(item.route.split(" ")[0]);
    expect(request.path).toBe(item.path);
    expect(request.status).toBeLessThan(300);
    const isAuthRoute = item.path.startsWith("/auth/");
    expect(Boolean(request.headers.Authorization)).toBe(!isAuthRoute);
    if (item.stepUp) expect(request.headers["X-Step-Up"]).toBe(stepUp);
    else expect(request.headers["X-Step-Up"]).toBeUndefined();
    if (item.body) {
      const body = JSON.parse(request.body ?? "{}") as unknown;
      // Parsing drops unknown keys, so a misnamed or extra field shows up as a difference.
      expect(item.body.parse(body)).toEqual(body);
    }
    const envelope = request.response as { data?: unknown };
    expect(envelope).toHaveProperty("data");
    if (item.response) item.response.parse(envelope.data);
    if (item.fn !== "refresh") expect(result).toEqual(envelope.data);
  });

  it("is refused by the mock, like the server, without the step-up header", async () => {
    for (const item of adminCases.filter((entry) => entry.stepUp)) {
      await expect(item.call(null)).rejects.toMatchObject({ code: "STEP_UP_REQUIRED" });
    }
  });
});

// ---------------------------------------------------------------- agent

type Fetched = { url: string; method: string; body?: string };
const fetched: Fetched[] = [];
let nextResponse: unknown = null;

type AgentCase = {
  fn: keyof typeof agentRequests;
  route: string;
  url: string;
  body?: ZodTypeAny;
  response?: ZodTypeAny;
  sample: unknown;
  call: () => Promise<unknown>;
};

const commission = { id: "c-1", kind: "SALE", amountPaise: 12000, sharePercent: null, businessName: "Madhav Sweets", status: "APPROVED", createdAt: "2026-10-26T08:30:00.000Z" };
const member = { id: "user-2", name: "Amit Verma", phoneMasked: "•••• 4218", status: "ACTIVE", sharePercent: null, monthSalesPaise: 1800000, monthOverridePaise: 54000, businesses: 6 };

const agentCases: AgentCase[] = [
  { fn: "home", route: "GET /home", url: "/api/v1/agent/home", response: agentHomeSchema, sample: { earnings: { todayPaise: 1, monthPaise: 2, pendingPaise: 3, paidPaise: 4 }, businesses: 2, team: { members: 1, monthSalesPaise: 5 }, status: "ACTIVE" }, call: () => agentRequests.home() },
  { fn: "businesses", route: "GET /businesses", url: "/api/v1/agent/businesses", response: agentBusinessesSchema, sample: { items: [{ id: "b-1", name: "Madhav Sweets", planName: "Growth", status: "ACTIVE", endsAt: null, lastPaymentAt: null }] }, call: () => agentRequests.businesses() },
  { fn: "commissions", route: "GET /commissions", url: "/api/v1/agent/commissions?cursor=abc", response: agentCommissionsSchema, sample: { items: [commission], nextCursor: null }, call: () => agentRequests.commissions("abc") },
  { fn: "payouts", route: "GET /payouts", url: "/api/v1/agent/payouts", response: agentPayoutsSchema, sample: { items: [{ id: "p-1", grossPaise: 100, tdsPaise: 5, netPaise: 95, utr: "UTR1", paidAt: "2026-10-10T00:00:00.000Z" }] }, call: () => agentRequests.payouts() },
  { fn: "profile", route: "GET /profile", url: "/api/v1/agent/profile", response: agentProfileSchema, sample: { name: "Diwakar", city: "Jaipur", upiId: "d@upi", pan: "", bankLast4: null }, call: () => agentRequests.profile() },
  { fn: "updateProfile", route: "PUT /profile", url: "/api/v1/agent/profile", body: agentProfilePutSchema, response: agentProfileSchema, sample: { name: "Diwakar", city: "Jaipur", upiId: "d@upi", pan: "•••••234F", bankLast4: "7261" }, call: () => agentRequests.updateProfile({ name: "Diwakar", city: "Jaipur", upiId: "d@upi", pan: "ABCDE1234F", bankAccount: "000111227261", bankIfsc: "HDFC0001234" }) },
  { fn: "team", route: "GET /team", url: "/api/v1/agent/team", response: agentTeamSchema, sample: { canRecruit: true, maxSharePercent: 90, minSharePercent: 50, inviteLink: "", members: [member] }, call: () => agentRequests.team() },
  { fn: "member", route: "GET /team/:id", url: "/api/v1/agent/team/user-2", response: agentMemberDetailSchema, sample: { ...member, sales: [{ id: "s-1", kind: "SALE", amountPaise: 100, businessName: "Cafe", status: "PENDING", createdAt: "2026-10-01T00:00:00.000Z" }] }, call: () => agentRequests.member("user-2") },
  { fn: "updateMember", route: "PATCH /team/:id", url: "/api/v1/agent/team/user-2", body: agentMemberPatchSchema, sample: { sharePercent: 75 }, call: () => agentRequests.updateMember("user-2", { sharePercent: 75 }) },
  { fn: "invite", route: "POST /team/invite", url: "/api/v1/agent/team/invite", body: agentInviteBodySchema, response: agentInviteResultSchema, sample: { inviteLink: "https://qr24x7.in/agent/join/ABCD1234", code: "ABCD1234" }, call: () => agentRequests.invite("9876543210") },
  { fn: "join", route: "POST /join", url: "/api/v1/agent/join", body: agentJoinBodySchema, response: agentJoinResultSchema, sample: { status: "PENDING", leaderName: "Amit" }, call: () => agentRequests.join("ABCD1234") },
  { fn: "onboardBusiness", route: "POST /onboard", url: "/api/v1/agent/onboard", body: agentOnboardSchema, sample: { id: "lead-1", sent: true, channel: "whatsapp" }, call: () => agentRequests.onboardBusiness("9876543210", "Madhav Sweets") }
];

describe("agent client contract", () => {
  const realFetch = global.fetch;
  beforeAll(() => {
    global.fetch = jest.fn(async (input: unknown, init?: RequestInit) => {
      fetched.push({ url: String(input), method: init?.method ?? "GET", body: typeof init?.body === "string" ? init.body : undefined });
      return { ok: true, status: 200, json: async () => ({ data: nextResponse }) } as Response;
    }) as typeof fetch;
  });
  afterAll(() => { global.fetch = realFetch; });
  beforeEach(() => { fetched.length = 0; });

  it("has a case for every client function", () => {
    const covered = new Set(agentCases.map((item) => item.fn));
    expect(Object.keys(agentRequests).filter((name) => !covered.has(name as keyof typeof agentRequests))).toEqual([]);
  });

  it("calls exactly the routes the server exports", () => {
    // GET /api/v1/agent (the older one-shot home) is read by app/(app)/agent.tsx, not by src/agent.
    const server = serverRoutes("agent").filter((route) => route !== "GET /");
    expect([...new Set(agentCases.map((item) => item.route))].sort()).toEqual(server);
  });

  it.each(agentCases.map((item) => [`${item.fn} → ${item.route}`, item] as const))("%s", async (_name, item) => {
    nextResponse = item.response ? item.response.parse(item.sample) : item.sample;
    const result = await item.call();
    const request = fetched[fetched.length - 1];
    expect(request.url).toBe(item.url);
    expect(request.method).toBe(item.route.split(" ")[0]);
    if (item.body) {
      const body = JSON.parse(request.body ?? "{}") as unknown;
      expect(item.body.parse(body)).toEqual(body);
    } else {
      expect(request.body).toBeUndefined();
    }
    expect(result).toEqual(nextResponse);
  });

  it("serves mock responses that the shared schemas accept", async () => {
    resetAgentMock();
    const parse = async (schema: ZodTypeAny, requestPath: string, init?: RequestInit) => schema.parse(await agentMockRequest(requestPath, init));
    await parse(agentHomeSchema, "/agent/home");
    await parse(agentBusinessesSchema, "/agent/businesses");
    await parse(agentCommissionsSchema, "/agent/commissions");
    await parse(agentPayoutsSchema, "/agent/payouts");
    await parse(agentProfileSchema, "/agent/profile");
    await parse(agentProfileSchema, "/agent/profile", { method: "PUT", body: JSON.stringify({ name: "D", city: "J", upiId: "u", pan: "ABCDE1234F" }) });
    await parse(agentTeamSchema, "/agent/team");
    await parse(agentMemberDetailSchema, "/agent/team/member-1");
    await parse(agentInviteResultSchema, "/agent/team/invite", { method: "POST", body: "{}" });
    await parse(agentJoinResultSchema, "/agent/join", { method: "POST", body: JSON.stringify({ code: "ABCD1234" }) });
  });
});

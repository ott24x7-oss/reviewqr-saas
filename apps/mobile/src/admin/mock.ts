import type {
  AdminAccountDetail, AdminAuthResponse, AdminAuthStatus, AdminDashboard, AdminInbox,
  AdminInboxItem, AdminMoney, AdminPlan, AdminSearchResult, AdminSettings, AdminShopOrder,
  AdminSupportTicket, AdminTeam, AdminWhatsApp
} from "./types";

const segments = ["agents", "devices", "proofs", "payouts", "refunds", "orders", "support", "payments"] as const;
const now = Date.now();
const counts = () => Object.fromEntries(segments.map((segment) => [segment, 0])) as AdminInbox["counts"];

const seededDashboard = (): AdminDashboard => {
  const keys = [
    ["revenue", 128400000], ["newPaid", 42], ["mrr", 46200000], ["activeSubs", 2180], ["trials", 84],
    ["expiring", 29], ["churned", 13], ["signups", 117], ["scans", 12480], ["shopOrders", 64]
  ] as const;
  const kpis = keys.map(([key, value], index) => ({
    key,
    value,
    changePercent: [12.4, 8.1, 6.8, 4.2, -2.1, 3.5, -1.4, 11.2, 18.6, 9.1][index],
    series: Array.from({ length: 14 }, (_, point) => Math.round(value * (0.58 + 0.025 * point + Math.sin((point + index) * 1.6) * 0.055)))
  }));
  const revenue = Array.from({ length: 90 }, (_, index) => {
    const date = new Date(now - (89 - index) * 86_400_000);
    return { label: date.toISOString().slice(5, 10), value: Math.round(2_000_000 + index * 16_000 + Math.sin(index * 0.32) * 420_000), previousValue: Math.round(1_800_000 + index * 12_000 + Math.cos(index * 0.29) * 330_000) };
  });
  return {
    range: "30d", kpis,
    revenue,
    planMix: [{ name: "Starter", value: 43 }, { name: "Growth", value: 35 }, { name: "Pro", value: 17 }, { name: "Trial", value: 5 }],
    topAgents: [{ id: "a1", name: "Amit Verma", salesPaise: 18340000, businesses: 38 }, { id: "a2", name: "Neha Singh", salesPaise: 14750000, businesses: 31 }, { id: "a3", name: "Rahul Jain", salesPaise: 11620000, businesses: 24 }],
    health: [{ key: "whatsapp", value: "Connected", healthy: true }, { key: "payments", value: "Healthy · 2 min ago", healthy: true }, { key: "cron", value: "Reconciled · 6 min ago", healthy: true }, { key: "errors", value: "0.3% · normal", healthy: true }]
  };
};

const makeInboxItem = (id: string, segment: AdminInboxItem["segment"], title: string, subtitle: string, actions: AdminInboxItem["actions"], amountPaise?: number): AdminInboxItem => ({
  id, segment, title, subtitle, createdAt: new Date(now - Number(id.replace(/\D/g, "") || 1) * 2_400_000).toISOString(), status: "PENDING", amountPaise, phoneMasked: "+91 •••• 4218", actions
});

const seededInbox: AdminInboxItem[] = [
  makeInboxItem("agent-1", "agents", "Amit Verma", "Agent · Jaipur · 8 businesses", ["approve", "reject"]),
  makeInboxItem("device-1", "devices", "Pixel 9 · Diwakar Sharma", "New admin phone · Jaipur", ["approve", "reject"]),
  makeInboxItem("proof-1", "proofs", "Madhav Sweets", "Print proof · Table QR · 2 min ago", ["approve", "reject"]),
  makeInboxItem("payout-1", "payouts", "Amit Verma", "Commission payout · UTR required", ["mark-paid", "reject"], 394000),
  makeInboxItem("refund-1", "refunds", "City Dental Care", "Refund request · Growth plan", ["approve", "reject"], 149900),
  makeInboxItem("order-1", "orders", "The Green Cafe", "12 acrylic stands · Paid", ["approve", "reject"], 360000),
  makeInboxItem("support-1", "support", "QR not scanning", "Madhav Sweets · New message", ["reply", "reject"]),
  makeInboxItem("payment-1", "payments", "Failed renewal", "City Dental Care · Razorpay", ["approve", "reject"], 249900)
];

const seededMoney = (): AdminMoney => ({
  payments: [
    { id: "pay-1", business: "Madhav Sweets", ownerPhoneMasked: "+91 •••• 4218", plan: "Growth annual", amountPaise: 2499000, gateway: "Razorpay", ref: "pay_RZ••7261", status: "PAID", createdAt: new Date(now - 3_600_000).toISOString() },
    { id: "pay-2", business: "The Green Cafe", ownerPhoneMasked: "+91 •••• 1094", plan: "Starter monthly", amountPaise: 49900, gateway: "Razorpay", ref: "pay_RZ••1948", status: "FAILED", createdAt: new Date(now - 7_200_000).toISOString() },
    { id: "pay-3", business: "City Dental Care", ownerPhoneMasked: "+91 •••• 8110", plan: "Growth monthly", amountPaise: 249900, gateway: "Cashfree", ref: "cf_•••0911", status: "PENDING", createdAt: new Date(now - 9_000_000).toISOString() }
  ],
  commissions: [
    { id: "com-1", agent: "Amit Verma", business: "Madhav Sweets", grossPaise: 1000000, tdsPaise: 100000, netPaise: 900000, status: "APPROVED", createdAt: new Date(now - 86_400_000).toISOString() },
    { id: "com-2", agent: "Neha Singh", business: "The Green Cafe", grossPaise: 620000, tdsPaise: 62000, netPaise: 558000, status: "PENDING", createdAt: new Date(now - 172_800_000).toISOString() }
  ],
  payouts: [{ id: "po-1", agent: "Amit Verma", grossPaise: 3940000, tdsPaise: 394000, netPaise: 3546000, utr: "UTR••••7261", status: "PAID", createdAt: new Date(now - 30 * 86_400_000).toISOString() }],
  totals: { paidPaise: 128400000, pendingPaise: 2940000, tdsPaise: 1032000 }
});

const detailFor = (id: string, kind: "user" | "business" = "user"): AdminAccountDetail => ({
  id,
  kind,
  name: kind === "business" ? "Madhav Sweets" : "Diwakar Sharma",
  phone: "+91 98765 42180",
  email: "owner@example.in",
  city: "Jaipur, Rajasthan",
  plan: "Growth · Annual",
  status: "ACTIVE",
  endsAt: "15 Dec 2026",
  modules: ["QR reviews", "Menu", "Orders", "Campaigns"],
  businesses: [{ id: "b-1", name: "Madhav Sweets", status: "ACTIVE" }, { id: "b-2", name: "Madhav Catering", status: "TRIAL" }],
  payments: [{ id: "pay-1", amountPaise: 2499000, status: "PAID", createdAt: new Date(now - 3_600_000).toISOString() }],
  devices: [{ id: "d-1", name: "Pixel 9 · Jaipur", status: "ACTIVE", lastSeenAt: "Now" }],
  audit: [{ id: "audit-1", action: "Renewed Growth plan", actor: "Admin · Kavita", createdAt: new Date(now - 86_400_000).toISOString() }]
});

let deviceStatus: AdminAuthStatus["status"] = "PENDING";
let pendingChecks = 2;
let inbox = seededInbox.map((row) => ({ ...row }));
let money = seededMoney();
let plans: AdminPlan[] = [
  { id: "starter", nameEn: "Starter", nameHi: "स्टार्टर", durationDays: 30, pricePaise: 49900, visible: true, active: true, modules: ["QR", "Reviews"], badge: null, sort: 1 },
  { id: "growth", nameEn: "Growth", nameHi: "ग्रोथ", durationDays: 365, pricePaise: 2499000, visible: true, active: true, modules: ["QR", "Reviews", "Menu", "Orders"], badge: "Popular", sort: 2 },
  { id: "pro", nameEn: "Pro", nameHi: "प्रो", durationDays: 365, pricePaise: 5999000, visible: true, active: true, modules: ["All modules"], badge: null, sort: 3 }
];
const initialTeam: AdminTeam["members"] = [
  { id: "a1", name: "Amit Verma", leader: null, status: "ACTIVE", sharePercent: 70, monthSalesPaise: 18340000, businesses: 38 },
  { id: "a2", name: "Neha Singh", leader: "Amit Verma", status: "PENDING", sharePercent: 65, monthSalesPaise: 14750000, businesses: 31 },
  { id: "a3", name: "Rahul Jain", leader: "Amit Verma", status: "PAUSED", sharePercent: 60, monthSalesPaise: 11620000, businesses: 24 }
];
const initialShopOrders: AdminShopOrder[] = [
  { id: "order-1", business: "The Green Cafe", item: "Acrylic QR stand", quantity: 12, amountPaise: 360000, status: "PROOF", proofUrl: null, trackingNumber: null, createdAt: new Date(now - 3_600_000).toISOString() },
  { id: "order-2", business: "City Dental Care", item: "Counter QR card", quantity: 50, amountPaise: 175000, status: "PRINTING", proofUrl: null, trackingNumber: null, createdAt: new Date(now - 9_000_000).toISOString() },
  { id: "order-3", business: "Madhav Sweets", item: "Acrylic QR stand", quantity: 5, amountPaise: 150000, status: "SHIPPED", proofUrl: null, trackingNumber: "TRK•••7210", createdAt: new Date(now - 86_400_000).toISOString() }
];
let teamMembers: AdminTeam["members"] = clone(initialTeam);
let shopOrders: AdminShopOrder[] = clone(initialShopOrders);
let settings: AdminSettings = { maintenanceBanner: "", autoApproveAgents: false, teamDepth: 4, shareCapPercent: 80, tdsPercent: 10, minVersionCode: 4, latestVersionCode: 5, flags: [{ name: "New checkout", enabled: true }, { name: "Shop shipping", enabled: false }], devices: [{ id: "d-1", name: "Pixel 9 · Jaipur", status: "ACTIVE", lastSeenAt: "Now" }, { id: "d-2", name: "Chrome · Admin web", status: "ACTIVE", lastSeenAt: "1 hour ago" }] };
let stepUpToken = "";
const MOCK_DEVICE_SECRET = "mock-device-secret";
let deviceSerial = 0;
let deviceId = "device-1";

export function resetAdminMock() {
  deviceStatus = "PENDING";
  pendingChecks = 2;
  inbox = seededInbox.map((row) => ({ ...row }));
  money = seededMoney();
  plans = [
    { id: "starter", nameEn: "Starter", nameHi: "स्टार्टर", durationDays: 30, pricePaise: 49900, visible: true, active: true, modules: ["QR", "Reviews"], badge: null, sort: 1 },
    { id: "growth", nameEn: "Growth", nameHi: "ग्रोथ", durationDays: 365, pricePaise: 2499000, visible: true, active: true, modules: ["QR", "Reviews", "Menu", "Orders"], badge: "Popular", sort: 2 },
    { id: "pro", nameEn: "Pro", nameHi: "प्रो", durationDays: 365, pricePaise: 5999000, visible: true, active: true, modules: ["All modules"], badge: null, sort: 3 }
  ];
  stepUpToken = "";
  deviceSerial = 0;
  deviceId = "device-1";
  teamMembers = clone(initialTeam);
  shopOrders = clone(initialShopOrders);
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
/** Like the server: a step-up token is bound to one action and is spent on first use. */
function hasStepUp(init: RequestInit, action: string) {
  const header = new Headers(init.headers).get("X-Step-Up");
  const ok = !!stepUpToken && header === stepUpToken && header === `step-up-${action}`;
  if (ok) stepUpToken = "";
  return ok;
}
function readBody(init: RequestInit) { try { return typeof init.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : {}; } catch { return {}; } }
function getSegment(path: string) { return new URLSearchParams(path.split("?")[1] ?? "").get("segment") ?? "agents"; }

export async function adminMockRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const body = readBody(init);
  const cleanPath = path.split("?")[0].replace(/\/$/, "") || "/";
  let result: unknown;

  if (cleanPath === "/auth" && method === "POST" && body.phase === "request") result = { challengeId: "mock-admin-otp" };
  else if (cleanPath === "/auth" && method === "POST" && body.phase === "verify") {
    if (body.code !== "123456") throw new Error("INVALID_OTP");
    // Like the server: a device id is reused only with the secret issued for it.
    const reuse = deviceSerial > 0 && deviceStatus !== "REVOKED" && body.deviceId === deviceId && body.deviceSecret === `${MOCK_DEVICE_SECRET}-${deviceSerial}`;
    if (!reuse) {
      deviceSerial += 1;
      deviceId = `device-${deviceSerial}`;
      deviceStatus = "PENDING";
      pendingChecks = 2;
    }
    result = { accessToken: "mock-admin-access", refreshToken: "mock-admin-refresh", status: deviceStatus, deviceId, ...(reuse ? {} : { deviceSecret: `${MOCK_DEVICE_SECRET}-${deviceSerial}` }), admin: { id: "admin-1", name: "Kavita Sharma", phoneMasked: "+91 •••• 4218" } } satisfies AdminAuthResponse;
  } else if (cleanPath === "/auth" && method === "GET") {
    if (deviceStatus === "PENDING" && pendingChecks > 0) pendingChecks -= 1;
    else if (deviceStatus === "PENDING") deviceStatus = "ACTIVE";
    result = { status: deviceStatus, deviceId, admin: { id: "admin-1", name: "Kavita Sharma", phoneMasked: "+91 •••• 4218" } } satisfies AdminAuthStatus;
  } else if (cleanPath === "/step-up" && method === "POST" && body.phase === "request") result = { challengeId: "mock-step-up" };
  else if (cleanPath === "/step-up" && method === "POST" && body.phase === "verify") {
    if (body.code !== "123456") throw new Error("INVALID_OTP");
    stepUpToken = `step-up-${String(body.action ?? "action")}`;
    result = { challengeId: "mock-step-up", stepUpToken, expiresAt: new Date(now + 300_000).toISOString() };
  } else if (cleanPath === "/dashboard" && method === "GET") result = seededDashboard();
  else if (cleanPath === "/inbox" && method === "GET") {
    const selected = getSegment(path);
    const allCounts = counts();
    for (const item of inbox) allCounts[item.segment] += 1;
    result = { counts: allCounts, items: selected === "all" ? inbox : inbox.filter((item) => item.segment === selected), nextCursor: null } satisfies AdminInbox;
  } else if (/^\/inbox\/[^/]+\/action$/.test(cleanPath) && method === "POST") {
    const itemId = cleanPath.split("/")[2];
    const item = inbox.find((row) => row.id === itemId);
    if (!item) throw new Error("INBOX_ITEM_NOT_FOUND");
    if (body.action === "reject" && String(body.reason ?? "").trim().length < 3) throw new Error("REASON_REQUIRED");
    if ((body.action === "mark-paid" || (body.action === "approve" && item.segment === "devices")) && !hasStepUp(init, body.action === "mark-paid" ? "mark_payout_paid" : "approve_device")) throw new Error("STEP_UP_REQUIRED");
    inbox = inbox.filter((row) => row.id !== itemId);
    result = { ok: true, id: itemId };
  } else if (cleanPath === "/search" && method === "GET") {
    const q = new URLSearchParams(path.split("?")[1] ?? "").get("q")?.trim() ?? "";
    const hits: AdminSearchResult[] = [
      { id: "u-1", type: "user", title: "Diwakar Sharma", subtitle: "Owner · Jaipur · +91 •••• 4218" },
      { id: "b-1", type: "business", title: "Madhav Sweets", subtitle: "Growth plan · Active · Jaipur" },
      { id: "pay-1", type: "payment", title: "pay_RZ••7261", subtitle: "₹24,990 · Paid · Madhav Sweets" },
      { id: "a1", type: "agent", title: "Amit Verma", subtitle: "Agent · 38 businesses · Active" },
      { id: "order-1", type: "order", title: "Shop order #Q7X21", subtitle: "12 stands · Proof ready" }
    ];
    result = { items: q ? hits.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(q.toLowerCase())) : [] };
  } else if (/^\/(users|businesses)\/[^/]+$/.test(cleanPath) && method === "GET") {
    const [kind, id] = cleanPath.slice(1).split("/");
    result = detailFor(id, kind === "businesses" ? "business" : "user");
  } else if (/^\/(users|businesses)\/[^/]+\/action$/.test(cleanPath) && method === "POST") {
    if (body.action === "grant-days" && Number(body.days) > 30 && !hasStepUp(init, "grant_days_over_30")) throw new Error("STEP_UP_REQUIRED");
    if (body.action === "change-plan") {
      // Like the server: a plan longer than 30 days needs a reason and its own step-up.
      const target = plans.find((plan) => plan.nameEn === body.plan || plan.id === body.plan);
      if ((target?.durationDays ?? 0) > 30 && String(body.reason ?? "").trim().length < 3) throw new Error("REASON_REQUIRED");
      if ((target?.durationDays ?? 0) > 30 && !hasStepUp(init, "change_user_plan")) throw new Error("STEP_UP_REQUIRED");
    }
    result = { ok: true, action: body.action };
  } else if (cleanPath === "/money" && method === "GET") result = money;
  else if (/^\/payments\/[^/]+\/action$/.test(cleanPath) && method === "POST") {
    if (body.action === "refund" && String(body.reason ?? "").trim().length < 3) throw new Error("REASON_REQUIRED");
    if (body.action === "refund" && !hasStepUp(init, "refund_payment")) throw new Error("STEP_UP_REQUIRED");
    const payment = money.payments.find((row) => row.id === cleanPath.split("/")[2]);
    if (payment && body.action === "refund") payment.status = "REFUNDED";
    result = { ok: true };
  } else if (/^\/commissions\/[^/]+\/action$/.test(cleanPath) && method === "POST") {
    const headers = new Headers(init.headers);
    if (body.action === "mark-paid" && (!headers.get("X-Step-Up") || headers.get("X-Step-Up") !== stepUpToken || !hasStepUp(init, "mark_payout_paid"))) throw new Error("STEP_UP_REQUIRED");
    const row = money.commissions.find((item) => item.id === cleanPath.split("/")[2]);
    if (row && body.action === "mark-paid") row.status = "PAID";
    if (row && body.action === "approve") row.status = "APPROVED";
    result = { ok: true };
  } else if (cleanPath === "/plans" && method === "GET") result = { items: plans };
  else if (/^\/plans\/[^/]+$/.test(cleanPath) && method === "PATCH") {
    const plan = plans.find((item) => item.id === cleanPath.split("/")[2]);
    if (!plan) throw new Error("PLAN_NOT_FOUND");
    if (("pricePaise" in body || "modules" in body) && !hasStepUp(init, "change_plan_price") && !hasStepUp(init, "change_plan_modules")) throw new Error("STEP_UP_REQUIRED");
    Object.assign(plan, body);
    result = plan;
  } else if (cleanPath === "/team" && method === "GET") {
    result = { members: teamMembers, leaderboard: seededDashboard().topAgents.map((row, index) => ({ id: row.id, name: row.name, salesPaise: row.salesPaise, overridesPaise: [834000, 672000, 441000][index] })), maxDepth: 4 } satisfies AdminTeam;
  } else if (/^\/team\/[^/]+\/action$/.test(cleanPath) && method === "POST") {
    const member = teamMembers.find((item) => item.id === cleanPath.split("/")[2]);
    if (!member) throw new Error("TEAM_MEMBER_NOT_FOUND");
    if (body.action === "approve") member.status = "ACTIVE";
    if (body.action === "reject") member.status = "REJECTED";
    if (body.action === "pause") member.status = "PAUSED";
    if (body.action === "resume") member.status = "ACTIVE";
    if (body.action === "update") {
      if (typeof body.sharePercent === "number") member.sharePercent = body.sharePercent;
      if (typeof body.leader === "string" || body.leader === null) member.leader = body.leader as string | null;
    }
    result = { ok: true };
  } else if (cleanPath === "/shop/orders" && method === "GET") {
    result = { items: shopOrders };
  } else if (cleanPath === "/support" && method === "GET") {
    result = { items: [
      { id: "ticket-1", subject: "QR not scanning", business: "Madhav Sweets", phoneMasked: "+91 •••• 4218", status: "OPEN", updatedAt: "2 min ago", messages: [{ id: "m1", from: "Owner", text: "The QR opens a blank page on two phones.", createdAt: "Today · 10:12 AM" }] },
      { id: "ticket-2", subject: "Payment receipt", business: "City Dental Care", phoneMasked: "+91 •••• 8110", status: "WAITING", updatedAt: "25 min ago", messages: [{ id: "m2", from: "Owner", text: "Could you resend the invoice?", createdAt: "Today · 9:49 AM" }] }
    ] satisfies AdminSupportTicket[] };
  } else if (cleanPath === "/whatsapp" && method === "GET") result = { senderStatus: "CONNECTED", phoneMasked: "+91 •••• 4218", pairingQr: "mock-pairing-token", cloudTemplates: [{ name: "order_update", status: "APPROVED" }, { name: "review_request", status: "PENDING" }], lastMessageAt: "2 min ago" } satisfies AdminWhatsApp;
  else if (cleanPath === "/whatsapp/action" && method === "POST") { if (body.action === "reconnect" && !hasStepUp(init, "whatsapp_pairing")) throw new Error("STEP_UP_REQUIRED"); result = { ok: true, pairingQr: "mock-pairing-token" }; }
  else if (cleanPath === "/settings" && method === "GET") result = settings;
  else if (cleanPath === "/settings" && method === "PUT") { settings = { ...settings, ...body } as AdminSettings; result = settings; }
  else if (cleanPath === "/audit" && method === "GET") result = { items: Array.from({ length: 24 }, (_, index) => ({ id: `audit-${index + 1}`, admin: index % 2 ? "Kavita Sharma" : "Diwakar Sharma", action: ["Approved agent", "Marked payout paid", "Updated plan price", "Revoked device"][index % 4], target: ["Amit Verma", "Madhav Sweets", "Growth plan", "Pixel 9"][index % 4], reason: index % 4 === 1 ? "Verified monthly statement" : null, createdAt: new Date(now - index * 3_600_000).toISOString(), before: { status: "PENDING" }, after: { status: "ACTIVE" } })) };
  else if (cleanPath === "/devices" && method === "GET") result = { items: settings.devices };
  else if (/^\/devices\/[^/]+\/action$/.test(cleanPath) && method === "POST") { if (body.action === "approve" && !hasStepUp(init, "approve_device")) throw new Error("STEP_UP_REQUIRED"); result = { ok: true }; }
  else if (cleanPath === "/shop/orders/action" && method === "POST") { const order = shopOrders.find((item) => item.id === body.id); if (order) { order.status = String(body.status ?? order.status); if (typeof body.trackingNumber === "string" && body.trackingNumber) order.trackingNumber = body.trackingNumber; } result = { ok: true }; }
  else if (/^\/support\/[^/]+\/reply$/.test(cleanPath) && method === "POST") result = { ok: true };
  else if (/^\/support\/[^/]+\/action$/.test(cleanPath) && method === "POST") result = { ok: true };
  else throw new Error(`Unmocked admin request: ${method} ${cleanPath}`);

  return clone(result) as T;
}

resetAdminMock();

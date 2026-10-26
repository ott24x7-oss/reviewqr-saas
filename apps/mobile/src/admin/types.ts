import type { z } from "zod";
import type {
  adminBusinessActionSchema,
  adminCommissionActionSchema,
  adminDeviceSchema,
  adminInboxActionSchema,
  adminInboxSegmentSchema,
  adminNotifyPrefSchema,
  adminOtpVerifySchema,
  adminPaymentActionSchema,
  adminPlatformSchema,
  adminRangeSchema,
  adminSessionSchema,
  adminSettingsPatchSchema,
  adminShopActionSchema,
  adminStepUpTokenSchema,
  adminSupportActionSchema,
  adminTeamActionSchema,
  adminUserActionSchema,
  AdminPlanPatch as SharedAdminPlanPatch,
  AdminStepUpAction as SharedAdminStepUpAction,
  otpSentSchema,
  TokenPair
} from "@reviewqr/shared";

/*
 * Request bodies come straight from packages/shared/src/admin-app.ts (the zod
 * schemas the /api/v1/admin routes parse). Response shapes mirror what
 * lib/admin/* returns inside the `{ data }` envelope; the server has no zod
 * schema for those, so keep them in step with lib/admin by hand.
 */

// ---------- auth ----------
export type AdminPlatform = z.infer<typeof adminPlatformSchema>;
export type AdminDeviceStatus = "PENDING" | "ACTIVE" | "REVOKED";
export type AdminDevice = z.infer<typeof adminDeviceSchema>;
export type AdminOtpSent = z.infer<typeof otpSentSchema>;
/** POST /auth/otp/verify. `deviceId` + `deviceSecret` reuse an approved phone. */
export type AdminOtpVerifyBody = z.input<typeof adminOtpVerifySchema>;
/** POST /auth/otp/verify response. `deviceSecret` is present only for a newly registered phone. */
export type AdminSession = z.infer<typeof adminSessionSchema>;
/** POST /auth/refresh response: a rotated pair plus the device's current status. */
export type AdminRefreshed = TokenPair & { device: AdminDevice };
export type AdminStepUpAction = SharedAdminStepUpAction;
export type AdminStepUpToken = z.infer<typeof adminStepUpTokenSchema>;

// ---------- dashboard ----------
export type AdminRange = z.infer<typeof adminRangeSchema>;
export type AdminDashboard = {
  range: string;
  start: string;
  end: string;
  kpis: {
    revenuePaise: number;
    previousRevenuePaise: number;
    newPaid: number;
    mrrPaise: number;
    arrPaise: number;
    activeSubs: number;
    trials: number;
    expiring: number;
    churned: number;
    signups: number;
    previousSignups: number;
    scans: number;
    shopOrders: number;
  };
  series: {
    days: string[];
    revenue: number[];
    previousRevenue: number[];
    signups: number[];
    newPaid: number[];
    shopOrders: number[];
    scans: number[];
  };
  planMix: { planId: string | null; name: string; count: number }[];
  leaderboard: { label: string; rows: { agentId: string; name: string; amountPaise: number }[] };
  health: { whatsapp: string; lastPaymentAt: string | null; lastReconcileAt: string | null; errorRate: number };
};

// What the dashboard screen draws, built from AdminDashboard in view.ts.
export type AdminKpiKey = "revenue" | "newPaid" | "mrr" | "activeSubs" | "trials" | "expiring" | "churned" | "signups" | "scans" | "shopOrders";
export type AdminSeriesPoint = { label: string; value: number; previousValue?: number };
/** `changePercent` is null when the server sends no previous period for that number. */
export type AdminKpi = { key: AdminKpiKey; value: number; changePercent: number | null; series: number[] };

// ---------- inbox ----------
export type AdminInboxSegment = z.infer<typeof adminInboxSegmentSchema>;
export type AdminInboxActionBody = z.infer<typeof adminInboxActionSchema>;
export type AdminInboxAction = AdminInboxActionBody["action"];
export type AdminInboxItem = { id: string; title: string; subtitle: string; status: string; createdAt: string };
export type AdminInbox = {
  counts: Record<AdminInboxSegment, number>;
  segment: AdminInboxSegment;
  items: AdminInboxItem[];
  nextCursor: string | null;
};

// ---------- search ----------
export type AdminSearch = {
  users: { id: string; name: string | null; email: string; phone: string; role: string }[];
  businesses: { id: string; name: string; slug: string; isActive: boolean }[];
  payments: { id: string; amount: number; status: string; utr: string | null; invoiceNumber: string | null; createdAt: string }[];
  agents: { id: string; userId: string; name: string; code: string; status: string; phone: string }[];
  orders: { id: string; status: string; totalPaise: number; invoiceNumber: string | null; createdAt: string }[];
};
export type AdminSearchResult = { id: string; type: "user" | "business" | "payment" | "agent" | "order"; title: string; subtitle: string };

// ---------- users / businesses ----------
export type AdminTimelineEntry = { id: string; action: string; createdAt: string; reason: string | null };
export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string;
  role: string;
  suspended: boolean;
  tier: string;
  subscriptionStatus: string;
  subscriptionEndsAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  subscription: {
    planId: string | null;
    plan: string | null;
    status: string;
    endsAt: string | null;
    duration: string | null;
    modules: string[];
    pricePaise: number;
  } | null;
  businesses: { id: string; name: string; slug: string; isActive: boolean }[];
  payments: { id: string; amount: number; status: string; provider: string; createdAt: string }[];
  /** QR / NFC devices on the owner's businesses, not admin phones. */
  devices: { id: string; shortCode: string; status: string; kind: string }[];
  timeline: AdminTimelineEntry[];
};
export type AdminBusiness = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  city: string | null;
  phone: string;
  email: string | null;
  createdAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string;
    phone: string;
    tier: string;
    subscriptionStatus: string;
    subscriptionEndsAt: string | null;
  };
  timeline: AdminTimelineEntry[];
};
export type AdminUserActionBody = z.input<typeof adminUserActionSchema>;
export type AdminBusinessActionBody = z.input<typeof adminBusinessActionSchema>;
export type AdminRevealed = { phone: string };

// ---------- money ----------
export type AdminPaymentStatus = "PENDING" | "QUEUED" | "COMPLETED" | "FAILED" | "REFUNDED" | "EXPIRED" | "CANCELLED";
export type AdminPaymentProvider = "RAZORPAY" | "STRIPE" | "MANUAL" | "UPI" | "USDT" | "YOUPI";
export type AdminPayment = {
  id: string;
  amount: number;
  status: AdminPaymentStatus;
  provider: AdminPaymentProvider;
  createdAt: string;
  utr: string | null;
  invoiceNumber: string | null;
  email: string;
  phone: string;
  plan: string | null;
};
export type AdminPaymentDetail = {
  id: string;
  amount: number;
  status: AdminPaymentStatus;
  provider: AdminPaymentProvider;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  utr: string | null;
  refundUtr: string | null;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  payerVpa: string | null;
  reference: string | null;
  createdAt: string;
  plan: string | null;
  user: { id: string; name: string | null; email: string; phone: string };
};
export type AdminPaymentFilters = { status?: AdminPaymentStatus; provider?: AdminPaymentProvider; planId?: string; from?: string; to?: string };
export type AdminPaymentActionBody = z.input<typeof adminPaymentActionSchema>;
export type AdminCommissionStatus = "PENDING" | "APPROVED" | "PAID" | "REVERSED" | "LEGACY_UNSETTLED";
export type AdminCommission = {
  id: string;
  agentId: string;
  agentName: string;
  kind: string;
  amountPaise: number;
  status: AdminCommissionStatus;
  createdAt: string;
};
export type AdminCommissionActionBody = z.input<typeof adminCommissionActionSchema>;
export type AdminPage<T> = { items: T[]; nextCursor: string | null };

// ---------- plans ----------
export type AdminPlanDuration = "MONTH_1" | "MONTH_6" | "YEAR_1" | "LIFETIME";
export type AdminPlanPrice = { duration: AdminPlanDuration; pricePaise: number; mrpPaise: number | null; active: boolean };
export type AdminPlan = {
  id: string;
  nameEn: string;
  nameHi: string;
  slug: string;
  descriptionEn: string;
  descriptionHi: string;
  modules: string[];
  badge: string | null;
  sortOrder: number;
  active: boolean;
  visibleOnPricingPage: boolean;
  prices: AdminPlanPrice[];
};
export type AdminPlanPatch = SharedAdminPlanPatch;

// ---------- team ----------
export type AdminTeamSettings = {
  maxTeamDepth: number;
  minSharePercent: number;
  maxSharePercent: number;
  autoApproveSubAgents: boolean;
  tdsPercent: number;
  tdsYearlyThresholdPaise: number;
};
export type AdminTeamAgent = {
  /** Agent profile id: the `id` sent with every team action. */
  id: string;
  userId: string;
  name: string;
  phone: string;
  status: string;
  active: boolean;
  sharePercent: number | null;
  depth: number;
  /** Leader's agent profile id. */
  leaderId: string | null;
  code: string;
};
export type AdminTeam = { settings: AdminTeamSettings; agents: AdminTeamAgent[] };
export type AdminTeamActionBody = z.input<typeof adminTeamActionSchema>;

// ---------- shop ----------
export type AdminShopOrderStatus =
  | "PENDING_PAYMENT" | "PAID" | "PROOF_SENT" | "CHANGES_REQUESTED" | "APPROVED" | "PRINTING" | "NFC_WRITTEN"
  | "PACKED" | "PICKUP_SCHEDULED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RTO" | "REPRINT";
export type AdminShopOrder = {
  id: string;
  status: AdminShopOrderStatus;
  totalPaise: number;
  invoiceNumber: string | null;
  createdAt: string;
  business: string | null;
  name: string | null;
  phone: string;
};
export type AdminLowStock = { id: string; sku: string; name: string; stock: number; lowStockAt: number };
export type AdminShopOrders = AdminPage<AdminShopOrder> & { lowStock: AdminLowStock[] };
export type AdminShopOrderDetail = {
  id: string;
  status: AdminShopOrderStatus;
  paymentStatus: string;
  totalPaise: number;
  subtotalPaise: number;
  discountPaise: number;
  advancePaise: number;
  balancePaise: number;
  invoiceNumber: string | null;
  buyerLegalName: string | null;
  business: string | null;
  name: string | null;
  email: string;
  phone: string;
  createdAt: string;
  shipment: { awb: string | null; courierName: string | null; provider: string } | null;
  lines: { id: string; sku: string; name: string; qty: number; unitPaise: number; needsNfc: boolean }[];
};
export type AdminShopActionBody = z.input<typeof adminShopActionSchema>;
export type AdminShopTracked = { moved: boolean; awb: string; status: string };

// ---------- support ----------
export type AdminTicket = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  name: string | null;
  email: string;
  phone: string;
};
export type AdminTicketDetail = {
  id: string;
  subject: string;
  status: string;
  user: { id: string; name: string | null; email: string; phone: string };
  messages: { id: string; body: string; authorId: string; createdAt: string }[];
};
export type AdminSupportActionBody = z.input<typeof adminSupportActionSchema>;

// ---------- whatsapp ----------
export type AdminWhatsAppInfo = {
  status: "idle" | "starting" | "qr-pending" | "connecting" | "connected" | "disconnected" | "logged-out" | "unavailable";
  /** A data: URL PNG of the pairing QR, while pairing. */
  qrPng: string | null;
  phoneNumber: string | null;
  error: string | null;
  connectedAt: string | null;
  lastEvent: string | null;
};
export type AdminWhatsApp = AdminWhatsAppInfo & {
  delivery: { lastAt: string | null; lastChannel: string | null; counts: { whatsapp: number; email: number; dev: number } };
};
export type AdminWhatsAppTestResult = { via: string; to: string };

// ---------- settings / devices / audit ----------
export type AdminNotifyPrefs = Required<z.infer<typeof adminNotifyPrefSchema>>;
export type AdminSettings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maxTeamDepth: number;
  minSharePercent: number;
  maxSharePercent: number;
  autoApproveSubAgents: boolean;
  tdsPercent: number;
  tdsYearlyThresholdPaise: number;
  minVersionCode: number;
  latestVersionCode: number;
  flags: Record<string, boolean>;
  notify: AdminNotifyPrefs;
};
export type AdminSettingsPatch = z.input<typeof adminSettingsPatchSchema>;
export type AdminDeviceRow = {
  id: string;
  name: string;
  platform: string;
  status: AdminDeviceStatus;
  lastSeenAt: string | null;
  adminName: string;
};
export type AdminAuditEvent = {
  id: string;
  createdAt: string;
  adminId: string | null;
  adminName: string | null;
  deviceId: string | null;
  ip: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
};
export type AdminAuditFilters = { admin?: string; action?: string; target?: string };

export type AdminDeviceStatus = "PENDING" | "ACTIVE" | "REVOKED";
export type AdminInboxSegment = "agents" | "devices" | "proofs" | "payouts" | "refunds" | "orders" | "support" | "payments";
export type AdminInboxAction = "approve" | "reject" | "pause" | "mark-paid" | "reply" | "ship";

export type AdminAuthRequest = { phase: "request"; phone: string };
export type AdminAuthVerify = { phase: "verify"; phone: string; code: string; deviceName: string; platform: string; pushToken?: string; deviceId?: string; deviceSecret?: string };
export type AdminAuthResponse = {
  accessToken: string;
  refreshToken: string;
  status: AdminDeviceStatus;
  deviceId: string;
  /** Sent once for a newly registered phone. Kept in secure storage. */
  deviceSecret?: string;
  admin: { id: string; name: string; phoneMasked: string };
};
export type AdminAuthStatus = {
  status: AdminDeviceStatus;
  deviceId: string;
  admin: { id: string; name: string; phoneMasked: string };
  reason?: "DEVICE_REVOKED" | "DEVICE_PENDING";
};
export type AdminStepUpRequest = { action: string; phase: "request"; target?: string };
export type AdminStepUpVerify = { action: string; phase: "verify"; challengeId: string; code: string };
export type AdminStepUpResponse = { challengeId: string; stepUpToken?: string; expiresAt?: string };

export type AdminKpiKey = "revenue" | "newPaid" | "mrr" | "activeSubs" | "trials" | "expiring" | "churned" | "signups" | "scans" | "shopOrders";
export type AdminSeriesPoint = { label: string; value: number; previousValue?: number };
export type AdminKpi = { key: AdminKpiKey; value: number; changePercent: number; series: number[] };
export type AdminDashboard = {
  range: string;
  kpis: AdminKpi[];
  revenue: AdminSeriesPoint[];
  planMix: { name: string; value: number }[];
  topAgents: { id: string; name: string; salesPaise: number; businesses: number }[];
  health: { key: "whatsapp" | "payments" | "cron" | "errors"; value: string; healthy: boolean }[];
};

export type AdminInboxItem = {
  id: string;
  segment: AdminInboxSegment;
  title: string;
  subtitle: string;
  createdAt: string;
  status: string;
  amountPaise?: number;
  phoneMasked?: string;
  actions: AdminInboxAction[];
};
export type AdminInbox = { counts: Record<AdminInboxSegment, number>; items: AdminInboxItem[]; nextCursor: string | null };
export type AdminSearchResult = { id: string; type: "user" | "business" | "payment" | "agent" | "order"; title: string; subtitle: string };
export type AdminAccountDetail = {
  id: string;
  kind: "user" | "business";
  name: string;
  phone: string;
  email: string;
  city: string;
  plan: string;
  status: string;
  endsAt: string;
  modules: string[];
  businesses: { id: string; name: string; status: string }[];
  payments: { id: string; amountPaise: number; status: string; createdAt: string }[];
  devices: { id: string; name: string; status: string; lastSeenAt: string }[];
  audit: { id: string; action: string; actor: string; createdAt: string }[];
};
export type AdminPayment = { id: string; business: string; ownerPhoneMasked: string; plan: string; amountPaise: number; gateway: string; ref: string; status: string; createdAt: string };
export type AdminCommission = { id: string; agent: string; business: string; grossPaise: number; tdsPaise: number; netPaise: number; status: string; createdAt: string };
export type AdminPayout = { id: string; agent: string; grossPaise: number; tdsPaise: number; netPaise: number; utr: string; status: string; createdAt: string };
export type AdminMoney = { payments: AdminPayment[]; commissions: AdminCommission[]; payouts: AdminPayout[]; totals: { paidPaise: number; pendingPaise: number; tdsPaise: number } };
export type AdminPlan = { id: string; nameEn: string; nameHi: string; durationDays: number; pricePaise: number; visible: boolean; active: boolean; modules: string[]; badge: string | null; sort: number };
export type AdminTeamMember = { id: string; name: string; leader: string | null; status: string; sharePercent: number; monthSalesPaise: number; businesses: number };
export type AdminTeam = { members: AdminTeamMember[]; leaderboard: { id: string; name: string; salesPaise: number; overridesPaise: number }[]; maxDepth: number };
export type AdminShopOrder = { id: string; business: string; item: string; quantity: number; amountPaise: number; status: string; proofUrl: string | null; trackingNumber: string | null; createdAt: string };
export type AdminSupportTicket = { id: string; subject: string; business: string; phoneMasked: string; status: string; updatedAt: string; messages: { id: string; from: string; text: string; createdAt: string }[] };
export type AdminWhatsApp = { senderStatus: string; phoneMasked: string; pairingQr: string | null; cloudTemplates: { name: string; status: string }[]; lastMessageAt: string | null };
export type AdminSettings = { maintenanceBanner: string; autoApproveAgents: boolean; teamDepth: number; shareCapPercent: number; tdsPercent: number; minVersionCode: number; latestVersionCode: number; flags: { name: string; enabled: boolean }[]; devices: { id: string; name: string; status: AdminDeviceStatus; lastSeenAt: string }[] };
export type AdminAuditEvent = { id: string; admin: string; action: string; target: string; reason: string | null; createdAt: string; before: unknown; after: unknown };

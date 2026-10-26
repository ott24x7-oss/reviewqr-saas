import type {
  AgentBusiness,
  AgentCommission,
  AgentCommissionsPage,
  AgentHome,
  AgentInviteResponse,
  AgentJoinResponse,
  AgentMemberDetail,
  AgentOnboardResponse,
  AgentPayout,
  AgentProfile,
  AgentTeam,
  AgentTeamMember
} from "./types";

const seededHome: AgentHome = {
  earnings: { todayPaise: 18000, monthPaise: 486000, pendingPaise: 92000, paidPaise: 394000 },
  businesses: 12,
  team: { members: 3, monthSalesPaise: 2450000 },
  status: "ACTIVE"
};

const seededBusinesses: AgentBusiness[] = [
  { id: "shop-1", name: "Madhav Sweets", planName: "Growth", status: "ACTIVE", endsAt: "2026-12-15T00:00:00.000Z", lastPaymentAt: "2026-09-15T00:00:00.000Z" },
  { id: "shop-2", name: "The Green Cafe", planName: "Starter", status: "TRIAL", endsAt: "2026-11-02T00:00:00.000Z", lastPaymentAt: null },
  { id: "shop-3", name: "City Dental Care", planName: "Growth", status: "EXPIRED", endsAt: "2026-09-20T00:00:00.000Z", lastPaymentAt: "2026-08-20T00:00:00.000Z" }
];

const seededCommissions: AgentCommission[] = [
  { id: "c-1", kind: "SALE", amountPaise: 12000, sharePercent: null, businessName: "Madhav Sweets", status: "APPROVED", createdAt: "2026-10-26T08:30:00.000Z" },
  { id: "c-2", kind: "TEAM_OVERRIDE", amountPaise: 8400, sharePercent: 70, fromAgentName: "Amit Verma", businessName: "The Green Cafe", status: "PENDING", createdAt: "2026-10-25T13:10:00.000Z" },
  { id: "c-3", kind: "RENEWAL", amountPaise: 24000, sharePercent: null, businessName: "City Dental Care", status: "PAID", createdAt: "2026-10-23T09:15:00.000Z" },
  { id: "c-4", kind: "HARDWARE", amountPaise: 5000, sharePercent: null, businessName: "Madhav Sweets", status: "PENDING", createdAt: "2026-10-21T15:00:00.000Z" },
  { id: "c-5", kind: "SALE", amountPaise: 16000, sharePercent: null, businessName: "The Green Cafe", status: "APPROVED", createdAt: "2026-10-19T11:45:00.000Z" },
  { id: "c-6", kind: "TEAM_OVERRIDE", amountPaise: 6000, sharePercent: 70, fromAgentName: "Amit Verma", businessName: "City Dental Care", status: "PAID", createdAt: "2026-10-17T10:20:00.000Z" }
];

const seededPayouts: AgentPayout[] = [
  { id: "p-1", grossPaise: 394000, tdsPaise: 39400, netPaise: 354600, utr: "UTR••••7261", paidAt: "2026-10-10T00:00:00.000Z" },
  { id: "p-2", grossPaise: 218000, tdsPaise: 21800, netPaise: 196200, utr: "UTR••••1948", paidAt: "2026-09-10T00:00:00.000Z" }
];

const seededMember: AgentTeamMember = {
  id: "member-1",
  name: "Amit Verma",
  phoneMasked: "+91 •••• 4218",
  status: "ACTIVE",
  sharePercent: 70,
  monthSalesPaise: 1800000,
  monthOverridePaise: 54000,
  businesses: 6
};

let home: AgentHome;
let businesses: AgentBusiness[];
let commissions: AgentCommission[];
let payouts: AgentPayout[];
let profile: AgentProfile;
let members: AgentTeamMember[];
let inviteCounter: number;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function resetAgentMock() {
  home = clone(seededHome);
  businesses = clone(seededBusinesses);
  commissions = clone(seededCommissions);
  payouts = clone(seededPayouts);
  profile = { name: "Diwakar Sharma", city: "Jaipur", upiId: "diwakar@upi", pan: "•••••1234", bankLast4: "7261" };
  members = [clone(seededMember)];
  inviteCounter = 0;
}

resetAgentMock();

function bodyOf(init: RequestInit) {
  if (typeof init.body !== "string") return {};
  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function pathParts(path: string) {
  const [pathname, query = ""] = path.replace(/^https?:\/\/[^/]+/, "").split("?");
  return { pathname: pathname.replace(/^\/api\/v1/, "").replace(/\/$/, "") || "/", params: new URLSearchParams(query) };
}

export async function agentMockRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const body = bodyOf(init);
  const { pathname, params } = pathParts(path);
  let result: unknown;

  if (pathname === "/agent/home" && method === "GET") {
    result = home;
  } else if (pathname === "/agent/businesses" && method === "GET") {
    result = { items: businesses };
  } else if (pathname === "/agent/commissions" && method === "GET") {
    const pageSize = 3;
    const offset = Number(params.get("cursor") ?? 0) || 0;
    const items = commissions.slice(offset, offset + pageSize);
    result = { items, nextCursor: offset + pageSize < commissions.length ? String(offset + pageSize) : null } satisfies AgentCommissionsPage;
  } else if (pathname === "/agent/payouts" && method === "GET") {
    result = { items: payouts };
  } else if (pathname === "/agent/profile" && method === "GET") {
    result = profile;
  } else if (pathname === "/agent/profile" && method === "PUT") {
    // Like the server: PAN and bank account come back masked, never in full.
    profile = {
      name: String(body.name ?? profile.name),
      city: String(body.city ?? profile.city),
      upiId: String(body.upiId ?? profile.upiId),
      pan: typeof body.pan === "string" && body.pan ? `•••••${body.pan.slice(-4)}` : profile.pan,
      bankLast4: typeof body.bankAccount === "string" && body.bankAccount ? body.bankAccount.slice(-4) : profile.bankLast4
    } satisfies AgentProfile;
    result = profile;
  } else if (pathname === "/agent/team" && method === "GET") {
    const team: AgentTeam = { canRecruit: true, minSharePercent: 50, maxSharePercent: 90, inviteLink: "https://qr24x7.in/agent/join/AMIT7X", members };
    result = team;
  } else if (pathname === "/agent/team/invite" && method === "POST") {
    inviteCounter += 1;
    const code = `TEAM${String(inviteCounter).padStart(4, "0")}`;
    const invite: AgentInviteResponse = { inviteLink: `https://qr24x7.in/agent/join/${code}`, code };
    result = invite;
  } else if (pathname === "/agent/join" && method === "POST") {
    home.status = "PENDING";
    result = { status: "PENDING", leaderName: "Amit Verma" } satisfies AgentJoinResponse;
  } else if (pathname === "/agent/onboard" && method === "POST") {
    const item = { id: `shop-${businesses.length + 1}`, name: String(body.businessName ?? "New business"), planName: "Starter", status: "PENDING", endsAt: null, lastPaymentAt: null } satisfies AgentBusiness;
    businesses = [item, ...businesses];
    home.businesses = businesses.length;
    result = { id: item.id, sent: true, channel: "whatsapp" } satisfies AgentOnboardResponse;
  } else {
    const memberRoute = pathname.match(/^\/agent\/team\/([^/]+)(?:\/([^/]+))?$/);
    if (!memberRoute || !["GET", "PATCH"].includes(method)) throw new Error(`Unmocked agent request: ${method} ${pathname}`);
    const [, memberId, extra] = memberRoute;
    const member = members.find((row) => row.id === decodeURIComponent(memberId));
    if (!member) throw new Error(`Unknown mock team member: ${memberId}`);
    if (method === "GET" && !extra) {
      result = {
        ...member,
        sales: commissions
          .filter((row) => row.fromAgentName === member.name)
          .map(({ id, kind, amountPaise, businessName, status, createdAt }) => ({ id, kind, amountPaise, businessName, status, createdAt }))
      } satisfies AgentMemberDetail;
    } else if (method === "PATCH") {
      // Like the server: exactly one of sharePercent or action.
      if ((typeof body.sharePercent === "number") === (body.action != null)) throw new Error("Send a share percent or pause/resume");
      if (typeof body.sharePercent === "number") {
        member.sharePercent = body.sharePercent;
        result = { sharePercent: body.sharePercent };
      } else {
        member.status = body.action === "pause" ? "PAUSED" : "ACTIVE";
        result = { status: member.status };
      }
    } else {
      throw new Error(`Unmocked agent request: ${method} ${pathname}`);
    }
  }

  return clone(result) as T;
}

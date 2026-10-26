export type AgentStatus = "ACTIVE" | "PENDING" | "PAUSED" | "REJECTED";
export type AgentCommissionKind = "SALE" | "RENEWAL" | "HARDWARE" | "TEAM_OVERRIDE";

export type AgentHome = {
  earnings: {
    todayPaise: number;
    monthPaise: number;
    pendingPaise: number;
    paidPaise: number;
  };
  businesses: number;
  team: { members: number; monthSalesPaise: number };
  status: AgentStatus;
};

export type AgentBusiness = {
  id: string;
  name: string;
  planName: string;
  status: string;
  endsAt: string | null;
  lastPaymentAt: string | null;
};

export type AgentCommission = {
  id: string;
  kind: AgentCommissionKind;
  amountPaise: number;
  sharePercent: number | null;
  fromAgentName?: string;
  businessName: string;
  status: string;
  createdAt: string;
};

export type AgentCommissionsPage = {
  items: AgentCommission[];
  nextCursor: string | null;
};

export type AgentPayout = {
  id: string;
  grossPaise: number;
  tdsPaise: number;
  netPaise: number;
  utr: string;
  paidAt: string;
};

export type AgentProfile = {
  name: string;
  city: string;
  upiId: string;
  pan: string | null;
  bankLast4?: string | null;
};

export type AgentProfileUpdate = {
  name: string;
  city: string;
  upiId: string;
  pan?: string;
  bankAccount?: string;
  bankIfsc?: string;
};

export type AgentTeamMember = {
  id: string;
  name: string;
  phoneMasked: string;
  status: AgentStatus;
  sharePercent: number;
  monthSalesPaise: number;
  monthOverridePaise: number;
  businesses: number;
};

export type AgentTeam = {
  canRecruit: boolean;
  maxSharePercent: number;
  minSharePercent: number;
  inviteLink: string;
  members: AgentTeamMember[];
};

export type AgentMemberDetail = {
  member: AgentTeamMember;
  stats: {
    todaySalesPaise: number;
    monthSalesPaise: number;
    monthOverridePaise: number;
  };
  sales: AgentCommission[];
};

export type AgentInviteResponse = { inviteLink: string; code: string };
export type AgentJoinResponse = { status: AgentStatus };
export type AgentOnboardResponse = { business: { id: string; name: string } };

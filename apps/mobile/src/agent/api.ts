import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiData } from "../api/data";
import { accountKey } from "../query/keys";
import { useSession } from "../state/session";
import { agentMockEnabled } from "./env";
import { agentMockRequest } from "./mock";
import type {
  AgentBusiness,
  AgentCommissionsPage,
  AgentHome,
  AgentInviteResponse,
  AgentJoinResponse,
  AgentMemberDetail,
  AgentOnboardResponse,
  AgentPayout,
  AgentProfile,
  AgentProfileUpdate,
  AgentMemberUpdate,
  AgentTeam
} from "./types";

export async function agentRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (agentMockEnabled()) return agentMockRequest<T>(path, init);
  return apiData<T>(`/api/v1${path}`, init);
}

export function useAgentHome() {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "home"),
    enabled: user?.role === "AGENT",
    queryFn: () => agentRequests.home()
  });
}

export function useAgentBusinesses() {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "businesses"),
    enabled: user?.role === "AGENT",
    queryFn: async () => (await agentRequests.businesses()).items
  });
}

export function useAgentCommissions() {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "commissions"),
    enabled: user?.role === "AGENT",
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => agentRequests.commissions(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined
  });
}

export function useAgentPayouts() {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "payouts"),
    enabled: user?.role === "AGENT",
    queryFn: async () => (await agentRequests.payouts()).items
  });
}

export function useAgentProfile() {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "profile"),
    enabled: user?.role === "AGENT",
    queryFn: () => agentRequests.profile()
  });
}

export function useAgentTeam(enabled = true) {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "team"),
    enabled: enabled && user?.role === "AGENT",
    queryFn: () => agentRequests.team()
  });
}

export function useAgentMember(memberId: string | undefined) {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "member", memberId),
    enabled: user?.role === "AGENT" && !!memberId,
    queryFn: () => agentRequests.member(memberId!)
  });
}

/** One function per /api/v1/agent route the app uses. Shapes come from @reviewqr/shared. */
export const agentRequests = {
  home: () => agentRequest<AgentHome>("/agent/home"),
  businesses: () => agentRequest<{ items: AgentBusiness[] }>("/agent/businesses"),
  commissions: (cursor?: string | null) => agentRequest<AgentCommissionsPage>(`/agent/commissions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
  payouts: () => agentRequest<{ items: AgentPayout[] }>("/agent/payouts"),
  profile: () => agentRequest<AgentProfile>("/agent/profile"),
  team: () => agentRequest<AgentTeam>("/agent/team"),
  member: (memberId: string) => agentRequest<AgentMemberDetail>(`/agent/team/${encodeURIComponent(memberId)}`),
  updateProfile: (body: AgentProfileUpdate) => agentRequest<AgentProfile>("/agent/profile", { method: "PUT", body: JSON.stringify(body) }),
  onboardBusiness: (phone: string, businessName: string) => agentRequest<AgentOnboardResponse>("/agent/onboard", { method: "POST", body: JSON.stringify({ phone, businessName }) }),
  invite: (phone?: string) => agentRequest<AgentInviteResponse>("/agent/team/invite", { method: "POST", body: JSON.stringify(phone ? { phone } : {}) }),
  /** Send either a share percent or pause/resume, never both. */
  updateMember: (memberId: string, body: AgentMemberUpdate) => agentRequest<{ status: string } | { sharePercent: number }>(`/agent/team/${encodeURIComponent(memberId)}`, { method: "PATCH", body: JSON.stringify(body) }),
  join: (code: string) => agentRequest<AgentJoinResponse>("/agent/join", { method: "POST", body: JSON.stringify({ code }) })
};

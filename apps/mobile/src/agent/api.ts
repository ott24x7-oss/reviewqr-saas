import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiData } from "../api/data";
import { accountKey } from "../query/keys";
import { useSession } from "../state/session";
import { agentMockRequest } from "./mock";
import type {
  AgentBusiness,
  AgentCommissionsPage,
  AgentHome,
  AgentInviteResponse,
  AgentJoinResponse,
  AgentMemberDetail,
  AgentPayout,
  AgentProfile,
  AgentProfileUpdate,
  AgentTeam
} from "./types";

export function agentMockEnabled() {
  return process.env.EXPO_PUBLIC_AGENT_MOCK === "1";
}

export async function agentRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (agentMockEnabled()) return agentMockRequest<T>(path, init);
  return apiData<T>(`/api/v1${path}`, init);
}

export function useAgentHome() {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "home"),
    enabled: user?.role === "AGENT",
    queryFn: () => agentRequest<AgentHome>("/agent/home")
  });
}

export function useAgentBusinesses() {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "businesses"),
    enabled: user?.role === "AGENT",
    queryFn: async () => (await agentRequest<{ items: AgentBusiness[] }>("/agent/businesses")).items
  });
}

export function useAgentCommissions() {
  const { user } = useSession();
  return useInfiniteQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "commissions"),
    enabled: user?.role === "AGENT",
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => agentRequest<AgentCommissionsPage>(`/agent/commissions${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined
  });
}

export function useAgentPayouts() {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "payouts"),
    enabled: user?.role === "AGENT",
    queryFn: async () => (await agentRequest<{ items: AgentPayout[] }>("/agent/payouts")).items
  });
}

export function useAgentProfile() {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "profile"),
    enabled: user?.role === "AGENT",
    queryFn: () => agentRequest<AgentProfile>("/agent/profile")
  });
}

export function useAgentTeam(enabled = true) {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "team"),
    enabled: enabled && user?.role === "AGENT",
    queryFn: () => agentRequest<AgentTeam>("/agent/team")
  });
}

export function useAgentMember(memberId: string | undefined) {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id ?? "", "agent", "member", memberId),
    enabled: user?.role === "AGENT" && !!memberId,
    queryFn: () => agentRequest<AgentMemberDetail>(`/agent/team/${encodeURIComponent(memberId!)}`)
  });
}

export const agentRequests = {
  updateProfile: (body: AgentProfileUpdate) => agentRequest<AgentProfile>("/agent/profile", { method: "PUT", body: JSON.stringify(body) }),
  invite: (phone?: string) => agentRequest<AgentInviteResponse>("/agent/team/invite", { method: "POST", body: JSON.stringify(phone ? { phone } : {}) }),
  updateMember: (memberId: string, body: { sharePercent?: number; action?: "pause" | "resume" }) => agentRequest(`/agent/team/${encodeURIComponent(memberId)}`, { method: "PATCH", body: JSON.stringify(body) }),
  join: (code: string) => agentRequest<AgentJoinResponse>("/agent/join", { method: "POST", body: JSON.stringify({ code }) })
};

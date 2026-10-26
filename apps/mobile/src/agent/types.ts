import type { z } from "zod";
import type {
  agentBusinessItemSchema,
  agentCommissionItemSchema,
  agentMemberSaleSchema,
  agentPayoutItemSchema,
  agentTeamMemberSchema,
  AgentCommissions,
  AgentHome as SharedAgentHome,
  AgentInviteResult,
  AgentJoinResult,
  AgentMemberDetail as SharedAgentMemberDetail,
  AgentMemberPatch,
  AgentProfilePut,
  AgentProfileView,
  AgentStatus as SharedAgentStatus,
  AgentCommissionKind as SharedAgentCommissionKind,
  AgentTeam as SharedAgentTeam,
  otpSentSchema
} from "@reviewqr/shared";

// Every shape here comes from packages/shared/src/agent-team.ts, which the
// /api/v1/agent routes use. Do not redeclare fields by hand.
export type AgentStatus = SharedAgentStatus;
export type AgentCommissionKind = SharedAgentCommissionKind;
export type AgentHome = SharedAgentHome;
export type AgentBusiness = z.infer<typeof agentBusinessItemSchema>;
export type AgentCommission = z.infer<typeof agentCommissionItemSchema>;
export type AgentCommissionsPage = AgentCommissions;
export type AgentPayout = z.infer<typeof agentPayoutItemSchema>;
export type AgentProfile = AgentProfileView;
export type AgentProfileUpdate = AgentProfilePut;
export type AgentTeamMember = z.infer<typeof agentTeamMemberSchema>;
export type AgentTeam = SharedAgentTeam;
/** GET /agent/team/:memberId returns the member fields flat, plus their last sales. */
export type AgentMemberDetail = SharedAgentMemberDetail;
export type AgentMemberSale = z.infer<typeof agentMemberSaleSchema>;
/** A row the commission list can draw: a member sale or one of my own commissions. */
export type AgentSaleRow = AgentMemberSale & { fromAgentName?: string };
export type AgentMemberUpdate = AgentMemberPatch;
export type AgentInviteResponse = AgentInviteResult;
export type AgentJoinResponse = AgentJoinResult;
/** POST /agent/onboard: the owner gets a WhatsApp (or email) invite. */
export type AgentOnboardResponse = { id: string; sent: true; channel: NonNullable<z.infer<typeof otpSentSchema>["channel"]> };

import { z } from "zod";

export const agentStatusSchema = z.enum(["PENDING", "ACTIVE", "PAUSED"]);
export const agentCommissionKindSchema = z.enum(["SALE", "RENEWAL", "HARDWARE", "TEAM_OVERRIDE"]);

export const agentHomeSchema = z.object({
  earnings: z.object({
    todayPaise: z.number().int(),
    monthPaise: z.number().int(),
    pendingPaise: z.number().int(),
    paidPaise: z.number().int()
  }),
  businesses: z.number().int(),
  team: z.object({
    members: z.number().int(),
    monthSalesPaise: z.number().int()
  }),
  status: agentStatusSchema
});

export const agentBusinessItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  planName: z.string(),
  status: z.string(),
  endsAt: z.string().nullable(),
  lastPaymentAt: z.string().nullable()
});
export const agentBusinessesSchema = z.object({ items: z.array(agentBusinessItemSchema) });

export const agentCommissionItemSchema = z.object({
  id: z.string(),
  kind: agentCommissionKindSchema,
  amountPaise: z.number().int(),
  sharePercent: z.number().int().nullable(),
  fromAgentName: z.string().optional(),
  businessName: z.string(),
  status: z.string(),
  createdAt: z.string()
});
export const agentCommissionsSchema = z.object({
  items: z.array(agentCommissionItemSchema),
  nextCursor: z.string().nullable()
});

export const agentPayoutItemSchema = z.object({
  id: z.string(),
  grossPaise: z.number().int(),
  tdsPaise: z.number().int(),
  netPaise: z.number().int(),
  utr: z.string(),
  paidAt: z.string()
});
export const agentPayoutsSchema = z.object({ items: z.array(agentPayoutItemSchema) });

export const agentProfileSchema = z.object({
  name: z.string(),
  city: z.string(),
  upiId: z.string(),
  pan: z.string(),
  bankLast4: z.string().nullable()
});

export const agentProfilePutSchema = z.object({
  name: z.string().trim().min(2).max(80),
  city: z.string().trim().max(80),
  upiId: z.string().trim().max(80),
  pan: z.string().trim().max(20).optional(),
  bankAccount: z.string().trim().max(30).optional(),
  bankIfsc: z.string().trim().max(11).optional(),
  bankName: z.string().trim().max(80).optional()
});

export const agentTeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  phoneMasked: z.string(),
  status: agentStatusSchema,
  sharePercent: z.number().int().nullable(),
  monthSalesPaise: z.number().int(),
  monthOverridePaise: z.number().int(),
  businesses: z.number().int()
});
export const agentTeamSchema = z.object({
  canRecruit: z.boolean(),
  maxSharePercent: z.number().int(),
  minSharePercent: z.number().int(),
  inviteLink: z.string(),
  members: z.array(agentTeamMemberSchema)
});

export const agentInviteBodySchema = z.object({
  phone: z.string().trim().max(20).optional()
});
export const agentInviteResultSchema = z.object({
  inviteLink: z.string(),
  code: z.string()
});

export const agentMemberPatchSchema = z
  .object({
    sharePercent: z.number().int().min(0).max(100).optional(),
    action: z.enum(["pause", "resume"]).optional()
  })
  .refine((value) => (value.sharePercent != null) !== (value.action != null), {
    message: "Send a share percent or pause/resume"
  });

export const agentMemberSaleSchema = z.object({
  id: z.string(),
  kind: agentCommissionKindSchema,
  amountPaise: z.number().int(),
  businessName: z.string(),
  status: z.string(),
  createdAt: z.string()
});
export const agentMemberDetailSchema = agentTeamMemberSchema.extend({
  sales: z.array(agentMemberSaleSchema)
});

export const agentJoinBodySchema = z.object({
  code: z.string().trim().min(4).max(16)
});
export const agentJoinResultSchema = z.object({
  status: agentStatusSchema,
  leaderName: z.string()
});

export type AgentStatus = z.infer<typeof agentStatusSchema>;
export type AgentCommissionKind = z.infer<typeof agentCommissionKindSchema>;
export type AgentHome = z.infer<typeof agentHomeSchema>;
export type AgentBusinesses = z.infer<typeof agentBusinessesSchema>;
export type AgentCommissions = z.infer<typeof agentCommissionsSchema>;
export type AgentPayouts = z.infer<typeof agentPayoutsSchema>;
export type AgentProfileView = z.infer<typeof agentProfileSchema>;
export type AgentProfilePut = z.infer<typeof agentProfilePutSchema>;
export type AgentTeam = z.infer<typeof agentTeamSchema>;
export type AgentInviteResult = z.infer<typeof agentInviteResultSchema>;
export type AgentMemberPatch = z.infer<typeof agentMemberPatchSchema>;
export type AgentMemberDetail = z.infer<typeof agentMemberDetailSchema>;
export type AgentJoinResult = z.infer<typeof agentJoinResultSchema>;

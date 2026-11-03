import { z } from "zod";

export const agentStatusSchema = z.enum(["PENDING", "ACTIVE", "PAUSED", "REJECTED"]);
export const agentCommissionKindSchema = z.enum(["SALE", "RENEWAL", "HARDWARE", "TEAM_OVERRIDE"]);

export const agentHomeSchema = z.object({
  earnings: z.object({
    todayPaise: z.number().int(),
    monthPaise: z.number().int(),
    pendingPaise: z.number().int(),
    paidPaise: z.number().int(),
    /** Unsettled money already paid out that should come off the next payout. */
    clawbackPaise: z.number().int()
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

export const agentApplicationHowSellSchema = z.enum(["SHOP_VISITS", "EXISTING_CLIENTS", "ONLINE", "OTHER"]);
export const agentApplicationSubmitSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(10).max(20),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  howSell: agentApplicationHowSellSchema,
  experience: z.string().trim().max(500).optional().default(""),
  languages: z.array(z.string().trim().min(2).max(40)).min(1).max(8),
  referralOrTeamCode: z.string().trim().max(80).optional().default(""),
  termsAccepted: z.literal(true)
});
export const agentApplicationStatusSchema = z.object({
  status: z.enum(["none", "pending", "approved", "rejected"]),
  rejectionReason: z.string().nullable(),
  appliedAt: z.string().nullable(),
  reapplyAt: z.string().nullable(),
  canReapply: z.boolean()
});
export const agentApplicationResultSchema = z.object({ status: z.enum(["PENDING", "ACTIVE"]) });
export const agentResellerPitchSchema = z.object({
  planCommission: z.object({ basis: z.enum(["PERCENT", "FLAT"]), percent: z.number().int(), flatPaise: z.number().int() }),
  shopCommission: z.object({ basis: z.enum(["PERCENT", "FLAT"]), percent: z.number().int(), flatPaise: z.number().int() }),
  growthPlanName: z.string(),
  growthPlanNameHi: z.string(),
  growthExampleMonthlyPaise: z.number().int(),
  payoutMethod: z.literal("UPI")
});
export type AgentApplicationSubmit = z.infer<typeof agentApplicationSubmitSchema>;
export type AgentApplicationStatus = z.infer<typeof agentApplicationStatusSchema>;
export type AgentApplicationResult = z.infer<typeof agentApplicationResultSchema>;
export type AgentResellerPitch = z.infer<typeof agentResellerPitchSchema>;

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

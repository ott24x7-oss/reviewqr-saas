import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  adminBusinessActionSchema,
  adminCommissionActionSchema,
  adminDeviceActionSchema,
  adminInboxActionSchema,
  adminOtpVerifySchema,
  adminPaymentActionSchema,
  adminSessionSchema,
  adminSettingsPatchSchema,
  adminShopActionSchema,
  adminStepUpSchema,
  adminSupportActionSchema,
  adminTeamActionSchema,
  adminUserActionSchema,
  adminWhatsAppTestSchema,
  dataSchema
} from "@reviewqr/shared";

type JsonSchema = z.ZodTypeAny;

const loose = z.object({}).passthrough();
const bearer = [{ bearerAuth: [] }];
const idParams = z.object({ id: z.string() });

function jsonBody(schema: JsonSchema) {
  return { body: { content: { "application/json": { schema } } } };
}

function jsonResponse(description: string, schema: JsonSchema) {
  return { description, content: { "application/json": { schema } } };
}

/** Admin app routes. Owner and agent tokens are rejected. */
export function registerAdminPaths(registry: OpenAPIRegistry, errorRef: JsonSchema) {
  const denied = {
    401: jsonResponse("Sign in required", errorRef),
    403: jsonResponse("Admin access only", errorRef)
  };
  const ok = { 200: jsonResponse("OK", dataSchema(loose)), ...denied };
  const page = z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().optional() });

  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/auth/otp/request",
    summary: "Request an admin login code. Unknown numbers get the same response.",
    request: jsonBody(z.object({ phone: z.string() })),
    responses: { 200: jsonResponse("Sent", dataSchema(loose)), 400: denied[403] }
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/auth/otp/verify",
    summary: "Verify an admin code and open a device. A new device stays pending.",
    request: jsonBody(adminOtpVerifySchema),
    responses: { 200: jsonResponse("Session", dataSchema(adminSessionSchema)), 400: jsonResponse("Invalid code", errorRef) }
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/auth/refresh",
    summary: "Rotate an admin refresh token and return the device status.",
    request: jsonBody(z.object({ refreshToken: z.string() })),
    responses: { 200: jsonResponse("Session", dataSchema(adminSessionSchema)), 401: denied[401] }
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/auth/logout",
    summary: "Revoke an admin refresh family.",
    request: jsonBody(z.object({ refreshToken: z.string() })),
    responses: { 200: jsonResponse("Signed out", dataSchema(loose)) }
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/step-up",
    summary: "Send or verify a 5-minute step-up code for the signed-in admin device.",
    security: bearer,
    request: jsonBody(adminStepUpSchema),
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/devices",
    summary: "Phones that have signed in to the admin app.",
    security: bearer,
    responses: ok
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/devices/{id}",
    summary: "Approve (step-up) or revoke an admin device.",
    security: bearer,
    request: { params: idParams, ...jsonBody(adminDeviceActionSchema) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/audit",
    summary: "Audit rows. Filter by admin, action, and target.",
    security: bearer,
    request: { query: page.extend({ admin: z.string().optional(), action: z.string().optional(), target: z.string().optional() }) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/dashboard",
    summary: "KPIs, series, plan mix, leaderboard, and health for a date range.",
    security: bearer,
    request: { query: z.object({ range: z.string().optional(), from: z.string().optional(), to: z.string().optional() }) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/inbox",
    summary: "Counts and one segment of work waiting on an admin.",
    security: bearer,
    request: { query: page.extend({ segment: z.string().optional() }) },
    responses: ok
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/inbox",
    summary: "Act on inbox items. Approving a device needs step-up. Payouts are paid from Money.",
    security: bearer,
    request: jsonBody(adminInboxActionSchema),
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/search",
    summary: "Find users, businesses, payments, agents, and shop orders. Phones are masked.",
    security: bearer,
    request: { query: z.object({ q: z.string() }) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/users/{id}",
    summary: "A user, subscription, businesses, payments, and recent audit. Phone is masked.",
    security: bearer,
    request: { params: idParams },
    responses: ok
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/users/{id}",
    summary: "Plan, grant days, cancel, suspend, resend login, reset onboarding, note, role, or reveal.",
    security: bearer,
    request: { params: idParams, ...jsonBody(adminUserActionSchema) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/businesses/{id}",
    summary: "A business and its owner. Phone is masked.",
    security: bearer,
    request: { params: idParams },
    responses: ok
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/businesses/{id}",
    summary: "Suspend, unsuspend, note, or reveal a business phone.",
    security: bearer,
    request: { params: idParams, ...jsonBody(adminBusinessActionSchema) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/payments",
    summary: "Payments, cursor paged. Phones are masked.",
    security: bearer,
    request: { query: page.extend({ status: z.string().optional(), provider: z.string().optional(), planId: z.string().optional(), from: z.string().optional(), to: z.string().optional() }) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/payments/{id}",
    summary: "One payment. The payer VPA is masked.",
    security: bearer,
    request: { params: idParams },
    responses: ok
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/payments/{id}",
    summary: "Approve, reject, reconcile, resend invoice, or mark refunded. A refund needs a reason and step-up.",
    security: bearer,
    request: { params: idParams, ...jsonBody(adminPaymentActionSchema) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/commissions",
    summary: "Commissions, cursor paged.",
    security: bearer,
    request: { query: page.extend({ status: z.string().optional() }) },
    responses: ok
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/commissions",
    summary: "Approve one agent's due commissions, or mark them paid with a UTR. Pay needs a reason and step-up.",
    security: bearer,
    request: jsonBody(adminCommissionActionSchema),
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/plans",
    summary: "Plan catalogue.",
    security: bearer,
    responses: ok
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/admin/plans/{id}",
    summary: "Quick edit. A price or module change needs step-up.",
    security: bearer,
    request: { params: idParams, ...jsonBody(z.object({ active: z.boolean().optional(), pricePaise: z.number().optional(), modules: z.array(z.string()).optional() }).passthrough()) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/agents/team",
    summary: "Agent team. Phones are masked.",
    security: bearer,
    responses: ok
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/agents/team",
    summary: "Approve, pause, move, share, or update an agent. id is the profile id.",
    security: bearer,
    request: jsonBody(adminTeamActionSchema),
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/shop/orders",
    summary: "Shop orders and low stock. Phones are masked.",
    security: bearer,
    request: { query: page.extend({ status: z.string().optional() }) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/shop/orders/{id}",
    summary: "One shop order, lines, and tracking.",
    security: bearer,
    request: { params: idParams },
    responses: ok
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/shop/orders/{id}",
    summary: "Move one legal status, approve a proof, or save a tracking number.",
    security: bearer,
    request: { params: idParams, ...jsonBody(adminShopActionSchema) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/support",
    summary: "Support tickets. Phones are masked.",
    security: bearer,
    request: { query: page.extend({ status: z.string().optional() }) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/support/{id}",
    summary: "One ticket and its messages.",
    security: bearer,
    request: { params: idParams },
    responses: ok
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/support/{id}",
    summary: "Reply or close a ticket.",
    security: bearer,
    request: { params: idParams, ...jsonBody(adminSupportActionSchema) },
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/whatsapp",
    summary: "WhatsApp sender status and the pairing QR when one is waiting.",
    security: bearer,
    responses: ok
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/whatsapp/reconnect",
    summary: "Start pairing. Needs step-up.",
    security: bearer,
    responses: ok
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/whatsapp/test",
    summary: "Send a test message to the signed-in admin only.",
    security: bearer,
    request: jsonBody(adminWhatsAppTestSchema),
    responses: ok
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/settings",
    summary: "Maintenance, team caps, app versions, flags, and this admin's notification preferences.",
    security: bearer,
    responses: ok
  });
  registry.registerPath({
    method: "put",
    path: "/api/v1/admin/settings",
    summary: "Update admin settings. TDS and share caps need step-up.",
    security: bearer,
    request: jsonBody(adminSettingsPatchSchema),
    responses: ok
  });
}

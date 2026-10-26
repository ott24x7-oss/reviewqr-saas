import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  dataSchema,
  billingSummarySchema,
  dashboardSchema,
  daySummarySchema,
  feedbackPatchSchema,
  listSchema,
  menuActionSchema,
  menuResultSchema,
  notificationReadSchema,
  offerActionSchema,
  okSchema,
  orderCardSchema,
  orderStatusSchema,
  bookingCardSchema,
  bookingStatusPatchSchema,
  publicBookingBodySchema,
  pageQuerySchema,
  placeDetailsSchema,
  placesSearchSchema,
  menuSnapRequestSchema,
  productDraftSchema,
  shopOrderDetailSchema,
  tapPageSchema,
  tapSaveSchema,
  qrClaimSchema,
  qrPatchSchema,
  storeSettingsSchema,
  uploadResultSchema,
  testimonialVisibilitySchema,
  hintCreateSchema,
  locationCreateSchema,
  campaignCreateSchema,
  aiSettingsSchema,
  staffRenameSchema,
  staffInviteSchema,
  agentOnboardSchema,
  themeActionSchema,
  agentHomeSchema,
  agentBusinessesSchema,
  agentCommissionsSchema,
  agentPayoutsSchema,
  agentProfileSchema,
  agentProfilePutSchema,
  agentTeamSchema,
  agentInviteBodySchema,
  agentInviteResultSchema,
  agentMemberPatchSchema,
  agentMemberDetailSchema,
  agentJoinBodySchema,
  agentJoinResultSchema
} from "@reviewqr/shared";
import { businessSchema, qrCodeSchema } from "../validations";
import { registerAdminPaths } from "./openapi-admin";

type JsonSchema = z.ZodTypeAny;

function jsonBody(schema: JsonSchema) {
  return { body: { content: { "application/json": { schema } } } };
}

function jsonResponse(description: string, schema: JsonSchema) {
  return { description, content: { "application/json": { schema } } };
}

const loose = z.object({ id: z.string() }).passthrough();
const bearer = [{ bearerAuth: [] }];

export function registerResourcePaths(registry: OpenAPIRegistry, errorRef: JsonSchema) {
  const unauthorized = jsonResponse("Sign in required", errorRef);
  const validation = jsonResponse("Invalid request", errorRef);
  const notFound = jsonResponse("Not found", errorRef);
  const forbidden = jsonResponse("Not allowed", errorRef);
  const planLimit = jsonResponse("Plan limit reached", errorRef);
  const conflict = jsonResponse("Confirmation required", errorRef);
  const rateLimit = jsonResponse("Too many attempts", errorRef);

  const idParams = z.object({ id: z.string() });
  const pageQuery = pageQuerySchema;
  const businessPage = pageQuerySchema.extend({
    businessId: z.string().optional(),
    status: z.string().optional()
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/businesses",
    summary: "Businesses you own or are assigned to",
    security: bearer,
    request: { query: pageQuery },
    responses: {
      200: jsonResponse("Business page", dataSchema(listSchema(loose))),
      400: validation,
      401: unauthorized
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/businesses",
    summary: "Create a business",
    security: bearer,
    request: jsonBody(businessSchema),
    responses: {
      200: jsonResponse("Created", dataSchema(z.object({ business: loose }))),
      400: validation,
      401: unauthorized,
      402: planLimit
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/businesses/{id}",
    summary: "One business you can read",
    security: bearer,
    request: { params: idParams },
    responses: {
      200: jsonResponse("Business", dataSchema(z.object({ business: loose }))),
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/businesses/{id}",
    summary: "Update a business you can manage",
    security: bearer,
    request: { params: idParams, ...jsonBody(businessSchema.partial()) },
    responses: {
      200: jsonResponse("Updated", dataSchema(z.object({ business: loose }))),
      400: validation,
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/businesses/{id}",
    summary: "Archive a business you own",
    security: bearer,
    request: { params: idParams },
    responses: {
      200: jsonResponse("Archived", dataSchema(okSchema)),
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/businesses/{id}/store",
    summary: "Store settings in rupees",
    security: bearer,
    request: { params: idParams },
    responses: {
      200: jsonResponse("Settings", dataSchema(storeSettingsSchema)),
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/businesses/{id}/store",
    summary: "Save store settings",
    security: bearer,
    request: { params: idParams, ...jsonBody(storeSettingsSchema) },
    responses: {
      200: jsonResponse("Saved", dataSchema(okSchema)),
      400: validation,
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/businesses/{id}/menu",
    summary: "Categories plus one page of items, variants, add-ons, and photos",
    security: bearer,
    request: { params: idParams, query: pageQuery },
    responses: {
      200: jsonResponse(
        "Menu",
        dataSchema(z.object({ categories: z.array(loose), items: z.array(loose), nextCursor: z.string().nullable() }))
      ),
      400: validation,
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/businesses/{id}/menu",
    summary: "Create or edit a category, item, variant, add-on, or photo",
    security: bearer,
    request: { params: idParams, ...jsonBody(menuActionSchema) },
    responses: {
      200: jsonResponse("Saved", dataSchema(menuResultSchema)),
      400: validation,
      401: unauthorized,
      402: planLimit,
      404: notFound
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/businesses/{id}/offers",
    summary: "Offer banners",
    security: bearer,
    request: { params: idParams, query: pageQuery },
    responses: {
      200: jsonResponse("Banners", dataSchema(listSchema(loose))),
      400: validation,
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/businesses/{id}/offers",
    summary: "Create or edit a coupon or offer banner",
    security: bearer,
    request: { params: idParams, ...jsonBody(offerActionSchema) },
    responses: {
      200: jsonResponse("Saved", dataSchema(okSchema)),
      400: validation,
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/businesses/{id}/coupons",
    summary: "Coupons",
    security: bearer,
    request: { params: idParams, query: pageQuery },
    responses: {
      200: jsonResponse("Coupons", dataSchema(listSchema(loose))),
      400: validation,
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/businesses/{id}/qr-codes",
    summary: "QR codes on a business you can manage",
    security: bearer,
    request: { params: idParams, query: pageQuery },
    responses: {
      200: jsonResponse("QR codes", dataSchema(listSchema(loose))),
      400: validation,
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/businesses/{id}/qr-codes",
    summary: "Create a QR code on a business",
    security: bearer,
    request: { params: idParams, ...jsonBody(qrCodeSchema) },
    responses: {
      200: jsonResponse("Created", dataSchema(z.object({ qrCode: loose }))),
      400: validation,
      401: unauthorized,
      402: planLimit,
      404: notFound
    }
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/businesses/{id}/qr-codes",
    summary: "Label, move, enable, or disable QR codes",
    security: bearer,
    request: { params: idParams, ...jsonBody(qrPatchSchema) },
    responses: {
      200: jsonResponse("Updated", dataSchema(okSchema)),
      400: validation,
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/businesses/{id}/qr-codes/claim",
    summary: "Activate a printed QR onto this business. 409 means send the same body with confirm true.",
    security: bearer,
    request: { params: idParams, ...jsonBody(qrClaimSchema) },
    responses: {
      200: jsonResponse("Claimed", dataSchema(z.object({ ok: z.literal(true), already: z.boolean(), code: z.string() }))),
      400: validation,
      401: unauthorized,
      404: notFound,
      409: conflict,
      429: rateLimit
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/orders",
    summary: "Orders you can read, newest first, with today's summary",
    security: bearer,
    request: { query: pageQuerySchema.extend({ businessId: z.string().optional(), from: z.string().optional() }) },
    responses: {
      200: jsonResponse("Orders", dataSchema(listSchema(orderCardSchema).extend({ summary: daySummarySchema }))),
      400: validation,
      401: unauthorized
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/orders/{id}",
    summary: "One order: lines, variants, notes, timeline, and KOT text",
    security: bearer,
    request: { params: idParams },
    responses: {
      200: jsonResponse("Order detail", dataSchema(orderCardSchema.extend({ kot: z.string(), events: z.array(z.object({ status: z.string(), at: z.string() })) }))),
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/orders/{id}/status",
    summary: "Change an order status",
    security: bearer,
    request: { params: idParams, ...jsonBody(orderStatusSchema) },
    responses: {
      200: jsonResponse("Updated order", dataSchema(z.object({ order: orderCardSchema }))),
      400: validation,
      401: unauthorized,
      403: forbidden,
      404: notFound
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/public/bookings",
    summary: "Save a service booking and return the WhatsApp link. Bots are ignored. Consent is required.",
    request: jsonBody(publicBookingBodySchema),
    responses: {
      200: jsonResponse(
        "Saved or ignored",
        z.object({
          ok: z.literal(true),
          id: z.string().optional(),
          whatsappUrl: z.string().nullable().optional(),
          ignored: z.boolean().optional()
        })
      ),
      400: validation,
      403: forbidden,
      404: notFound,
      429: rateLimit
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/bookings",
    summary: "Booking requests you can read, newest first",
    security: bearer,
    request: {
      query: pageQuerySchema.extend({
        businessId: z.string().optional(),
        status: z.string().optional(),
        date: z.string().optional(),
        today: z.string().optional()
      })
    },
    responses: {
      200: jsonResponse("Bookings", dataSchema(listSchema(bookingCardSchema))),
      400: validation,
      401: unauthorized,
      403: forbidden,
      404: notFound
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/bookings/{id}",
    summary: "One booking request, including call and WhatsApp links when the phone was consented",
    security: bearer,
    request: { params: idParams },
    responses: {
      200: jsonResponse("Booking", dataSchema(bookingCardSchema)),
      401: unauthorized,
      403: forbidden,
      404: notFound
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/bookings/{id}/status",
    summary: "Change a booking status. Staff who can only read receive 404.",
    security: bearer,
    request: { params: idParams, ...jsonBody(bookingStatusPatchSchema) },
    responses: {
      200: jsonResponse("Updated booking", dataSchema(bookingCardSchema)),
      400: validation,
      401: unauthorized,
      403: forbidden,
      404: notFound
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/feedback",
    summary: "Private feedback you can read",
    security: bearer,
    request: { query: businessPage },
    responses: {
      200: jsonResponse("Feedback", dataSchema(listSchema(loose))),
      400: validation,
      401: unauthorized
    }
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/feedback/{id}",
    summary: "Set status, an internal note, or erase the customer's contact",
    security: bearer,
    request: { params: idParams, ...jsonBody(feedbackPatchSchema) },
    responses: {
      200: jsonResponse("Updated", dataSchema(z.union([z.object({ feedback: loose }), z.object({ ok: z.literal(true), erased: z.literal(true) })]))),
      400: validation,
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/feedback/{id}/reply-draft",
    summary: "Suggest a reply. Nothing is sent to the customer.",
    security: bearer,
    request: { params: idParams },
    responses: {
      200: jsonResponse("Draft", dataSchema(z.object({ publicReply: z.string(), whatsappReply: z.string() }))),
      401: unauthorized,
      404: notFound,
      429: rateLimit,
      503: jsonResponse("Draft unavailable", errorRef)
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/notifications",
    summary: "Your notifications",
    security: bearer,
    request: { query: pageQuery },
    responses: {
      200: jsonResponse("Notifications", dataSchema(listSchema(loose).extend({ unread: z.number().int() }))),
      400: validation,
      401: unauthorized
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/notifications/read",
    summary: "Mark one notification read, or all of them when id is omitted",
    security: bearer,
    request: jsonBody(notificationReadSchema),
    responses: {
      200: jsonResponse("Marked read", dataSchema(okSchema)),
      400: validation,
      401: unauthorized
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/businesses/{id}/menu/snap",
    summary: "Read a product photo and suggest a name. The owner still types the price.",
    security: bearer,
    request: { params: idParams, ...jsonBody(menuSnapRequestSchema) },
    responses: {
      200: jsonResponse("Suggestion", dataSchema(z.object({ item: productDraftSchema }))),
      400: validation,
      401: unauthorized,
      402: planLimit,
      404: notFound,
      429: rateLimit,
      503: jsonResponse("Reader unavailable", errorRef)
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/businesses/{id}/tap",
    summary: "Tap page buttons, theme, and the public QR code",
    security: bearer,
    request: { params: idParams },
    responses: {
      200: jsonResponse("Tap page", dataSchema(tapPageSchema)),
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/businesses/{id}/tap",
    summary: "Save tap page buttons and an optional preset theme",
    security: bearer,
    request: { params: idParams, ...jsonBody(tapSaveSchema) },
    responses: {
      200: jsonResponse("Saved", dataSchema(z.object({ published: z.boolean() }))),
      400: validation,
      401: unauthorized,
      402: planLimit,
      404: notFound
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/dashboard",
    summary: "Today's orders, feedback, scans, bookings, and the current plan",
    security: bearer,
    request: { query: z.object({ businessId: z.string().optional() }) },
    responses: {
      200: jsonResponse("Home", dataSchema(dashboardSchema)),
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/places/search",
    summary: "Search Google Places through the server. enabled is false when the key is unset.",
    security: bearer,
    request: { query: z.object({ q: z.string().optional() }) },
    responses: {
      200: jsonResponse("Predictions", dataSchema(placesSearchSchema)),
      401: unauthorized,
      429: rateLimit
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/places/details",
    summary: "Place details for a new business. enabled is false when the key is unset.",
    security: bearer,
    request: { query: z.object({ placeId: z.string().optional() }) },
    responses: {
      200: jsonResponse("Place", dataSchema(placeDetailsSchema)),
      401: unauthorized,
      404: notFound,
      429: rateLimit
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/shop/orders/{id}",
    summary: "One hardware order, payment status, timeline, and reprint requests",
    security: bearer,
    request: { params: idParams },
    responses: {
      200: jsonResponse("Order", dataSchema(shopOrderDetailSchema)),
      401: unauthorized,
      404: notFound
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/billing/summary",
    summary: "Current plan, expiry, and payment history. Does not start a purchase.",
    security: bearer,
    responses: {
      200: jsonResponse("Billing", dataSchema(billingSummarySchema)),
      401: unauthorized
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/uploads",
    summary: "Upload a logo or cover image (multipart file, optional variant logo|cover, max 8MB)",
    security: bearer,
    responses: {
      200: jsonResponse("Stored", dataSchema(uploadResultSchema)),
      400: validation,
      401: unauthorized,
      429: rateLimit
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/slugs/availability",
    summary: "Check a page address and suggest free names",
    security: bearer,
    request: {
      query: z.object({
        slug: z.string().optional(),
        name: z.string().optional()
      })
    },
    responses: {
      200: jsonResponse(
        "Availability. A pasted URL is invalid. suggestions are free addresses.",
        dataSchema(
          z.object({
            slug: z.string(),
            available: z.boolean(),
            reason: z.enum(["empty", "invalid", "reserved", "taken"]).nullable(),
            url: z.string(),
            suggestions: z.array(z.string())
          })
        )
      ),
      401: unauthorized
    }
  });

  const businessPaths: { method: "get" | "post" | "put" | "patch" | "delete"; path: string; summary: string; body?: JsonSchema }[] = [
    { method: "get", path: "/api/v1/businesses/{id}/reviews", summary: "Google review log, optional rating=1..5" },
    { method: "get", path: "/api/v1/businesses/{id}/testimonials", summary: "Testimonials the owner can show or hide" },
    { method: "post", path: "/api/v1/businesses/{id}/testimonials", summary: "Approve or hide a testimonial", body: testimonialVisibilitySchema },
    { method: "get", path: "/api/v1/businesses/{id}/hints", summary: "Topic hints customers can copy" },
    { method: "post", path: "/api/v1/businesses/{id}/hints", summary: "Add a topic hint", body: hintCreateSchema },
    { method: "delete", path: "/api/v1/businesses/{id}/hints", summary: "Remove a topic hint (hintId query)" },
    { method: "get", path: "/api/v1/businesses/{id}/locations", summary: "Active locations" },
    { method: "post", path: "/api/v1/businesses/{id}/locations", summary: "Add a location", body: locationCreateSchema },
    { method: "get", path: "/api/v1/businesses/{id}/campaigns", summary: "WhatsApp campaigns" },
    { method: "post", path: "/api/v1/businesses/{id}/campaigns", summary: "Create a draft campaign", body: campaignCreateSchema },
    { method: "post", path: "/api/v1/businesses/{id}/campaigns/{campaignId}/send", summary: "Send the template to consented customers. Rate limited." },
    { method: "get", path: "/api/v1/businesses/{id}/ai", summary: "AI review assistant settings" },
    { method: "put", path: "/api/v1/businesses/{id}/ai", summary: "Turn the AI review assistant on or off", body: aiSettingsSchema },
    { method: "patch", path: "/api/v1/businesses/{id}/staff/{staffId}", summary: "Rename a staff member", body: staffRenameSchema },
    { method: "delete", path: "/api/v1/businesses/{id}/staff/{staffId}", summary: "Remove a staff member" },
    { method: "get", path: "/api/v1/businesses/{id}/staff/{staffId}/stats", summary: "Review count for one staff member" },
    { method: "post", path: "/api/v1/businesses/{id}/invites", summary: "Invite an app login with the STAFF role", body: staffInviteSchema },
    { method: "post", path: "/api/v1/businesses/{id}/theme", summary: "Save a theme or a custom colour", body: themeActionSchema }
  ];
  for (const item of businessPaths) {
    const names = [...item.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
    const shape: Record<string, z.ZodString> = {};
    for (const name of names) shape[name] = z.string();
    registry.registerPath({
      method: item.method,
      path: item.path,
      summary: item.summary,
      security: bearer,
      request: { params: z.object(shape), ...(item.body ? jsonBody(item.body) : {}) },
      responses: {
        200: jsonResponse("OK", dataSchema(loose)),
        400: validation,
        401: unauthorized,
        404: notFound,
        429: rateLimit
      }
    });
  }

  registry.registerPath({
    method: "get",
    path: "/api/v1/customers",
    summary: "Consented customers you can call or message",
    security: bearer,
    request: { query: z.object({ businessId: z.string().optional() }) },
    responses: { 200: jsonResponse("Customers", dataSchema(loose)), 401: unauthorized }
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/customers/export",
    summary: "CSV of consented customers",
    security: bearer,
    request: { query: z.object({ businessId: z.string().optional() }) },
    responses: { 200: jsonResponse("CSV text", dataSchema(z.object({ csv: z.string() }))), 401: unauthorized }
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/refer",
    summary: "Owner referral link and rewards",
    security: bearer,
    responses: { 200: jsonResponse("Referral", dataSchema(loose)), 401: unauthorized }
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/me/phone",
    summary: "Send an OTP to a new WhatsApp number",
    security: bearer,
    request: jsonBody(z.object({ phone: z.string() })),
    responses: { 200: jsonResponse("Sent", dataSchema(loose)), 400: validation, 401: unauthorized, 429: rateLimit }
  });
  registry.registerPath({
    method: "put",
    path: "/api/v1/me/phone",
    summary: "Confirm the OTP and save the new number",
    security: bearer,
    request: jsonBody(z.object({ phone: z.string(), code: z.string() })),
    responses: { 200: jsonResponse("Updated", dataSchema(z.object({ phone: z.string() }))), 400: validation, 401: unauthorized }
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/agent/onboard",
    summary: "Agent starts onboarding a business. The owner confirms by OTP.",
    security: bearer,
    request: jsonBody(agentOnboardSchema),
    responses: { 200: jsonResponse("Started", dataSchema(loose)), 400: validation, 401: unauthorized, 403: forbidden }
  });
  const agentResponses = { 401: unauthorized, 403: forbidden, 404: notFound };
  registry.registerPath({
    method: "get",
    path: "/api/v1/agent/home",
    summary: "Agent earnings, business count, and team summary",
    security: bearer,
    responses: { 200: jsonResponse("Agent home", dataSchema(agentHomeSchema)), ...agentResponses }
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/agent/businesses",
    summary: "Businesses this agent brought in. No customer contact details.",
    security: bearer,
    responses: { 200: jsonResponse("Businesses", dataSchema(agentBusinessesSchema)), ...agentResponses }
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/agent/commissions",
    summary: "Commission ledger, including team overrides",
    security: bearer,
    request: { query: pageQuery },
    responses: { 200: jsonResponse("Commissions", dataSchema(agentCommissionsSchema)), 400: validation, ...agentResponses }
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/agent/payouts",
    summary: "Payout statement with gross, TDS, and net",
    security: bearer,
    responses: { 200: jsonResponse("Payouts", dataSchema(agentPayoutsSchema)), ...agentResponses }
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/agent/profile",
    summary: "Agent profile. PAN is masked to the last 4.",
    security: bearer,
    responses: { 200: jsonResponse("Profile", dataSchema(agentProfileSchema)), ...agentResponses }
  });
  registry.registerPath({
    method: "put",
    path: "/api/v1/agent/profile",
    summary: "Update name, city, UPI, PAN, and bank details",
    security: bearer,
    request: jsonBody(agentProfilePutSchema),
    responses: { 200: jsonResponse("Profile", dataSchema(agentProfileSchema)), 400: validation, ...agentResponses }
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/agent/team",
    summary: "Team members, caps, and the current invite link",
    security: bearer,
    responses: { 200: jsonResponse("Team", dataSchema(agentTeamSchema)), ...agentResponses }
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/agent/team/invite",
    summary: "Create a team invite. A phone also sends WhatsApp. Limited to 10 an hour.",
    security: bearer,
    request: jsonBody(agentInviteBodySchema),
    responses: {
      200: jsonResponse("Invite", dataSchema(agentInviteResultSchema)),
      400: validation,
      429: rateLimit,
      ...agentResponses
    }
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/agent/team/{memberId}",
    summary: "A member's stats and last 20 sales. Only their leader can call this.",
    security: bearer,
    request: { params: z.object({ memberId: z.string() }) },
    responses: { 200: jsonResponse("Member", dataSchema(agentMemberDetailSchema)), ...agentResponses }
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/agent/team/{memberId}",
    summary: "Set a member's share or pause and resume them. Only their leader.",
    security: bearer,
    request: { params: z.object({ memberId: z.string() }), ...jsonBody(agentMemberPatchSchema) },
    responses: { 200: jsonResponse("Updated", dataSchema(loose)), 400: validation, ...agentResponses }
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/agent/join",
    summary: "Join a team with an invite code. There is no joining fee.",
    security: bearer,
    request: jsonBody(agentJoinBodySchema),
    responses: { 200: jsonResponse("Joined", dataSchema(agentJoinResultSchema)), 400: validation, 401: unauthorized }
  });

  registerAdminPaths(registry, errorRef);
}

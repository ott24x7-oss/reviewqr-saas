import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  dataSchema,
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
  pageQuerySchema,
  placeDetailsSchema,
  placesSearchSchema,
  qrClaimSchema,
  qrPatchSchema,
  storeSettingsSchema,
  uploadResultSchema
} from "@reviewqr/shared";
import { businessSchema, qrCodeSchema } from "../validations";

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
    request: { query: pageQuerySchema.extend({ businessId: z.string().optional() }) },
    responses: {
      200: jsonResponse("Orders", dataSchema(listSchema(orderCardSchema).extend({ summary: daySummarySchema }))),
      400: validation,
      401: unauthorized
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
    method: "get",
    path: "/api/v1/dashboard",
    summary: "Today's orders, feedback, scans, and the current plan",
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
}

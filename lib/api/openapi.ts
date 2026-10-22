import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
  extendZodWithOpenApi
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  apiErrorSchema,
  dataSchema,
  listSchema,
  deleteAccountSchema,
  loginSchema,
  logoutSchema,
  mePatchSchema,
  meSchema,
  okSchema,
  otpRequestSchema,
  otpSentSchema,
  otpSignupSchema,
  otpVerifySchema,
  pushRegisterSchema,
  pushUnregisterSchema,
  refreshSchema,
  sessionSchema,
  shopCartPutSchema,
  shopEstimateSchema,
  tokenPairSchema
} from "@reviewqr/shared";
import { registerResourcePaths } from "./openapi-resources";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT"
});

const errorRef = registry.register("ApiError", apiErrorSchema);
const tokensRef = registry.register("TokenPair", tokenPairSchema);
const meRef = registry.register("Me", meSchema);

function jsonBody(schema: z.ZodTypeAny) {
  return {
    body: {
      content: {
        "application/json": { schema }
      }
    }
  };
}

function jsonResponse(description: string, schema: z.ZodTypeAny) {
  return {
    description,
    content: {
      "application/json": { schema }
    }
  };
}

const unauthorized = { description: "Sign in required", content: { "application/json": { schema: errorRef } } };
const validation = { description: "Invalid request", content: { "application/json": { schema: errorRef } } };
const rateLimit = { description: "Too many attempts", content: { "application/json": { schema: errorRef } } };

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/otp/request",
  summary: "Request a login code",
  request: jsonBody(otpRequestSchema),
  responses: {
    200: jsonResponse(
      "Code accepted. channel and resendAfterSec say where to look and when a resend is allowed. devCode is present only outside production when OTP_DEV_REVEAL is set.",
      dataSchema(otpSentSchema)
    ),
    400: validation,
    429: rateLimit
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/otp/signup",
  summary: "Request, confirm, or finish a WhatsApp signup",
  request: jsonBody(otpSignupSchema),
  responses: {
    200: jsonResponse(
      "Request returns the send channel. Confirm returns a signup token. Verify and finish return access and refresh tokens.",
      dataSchema(z.union([otpSentSchema, z.object({ signupToken: z.string() }), tokenPairSchema]))
    ),
    400: validation,
    409: { description: "Account already exists", content: { "application/json": { schema: errorRef } } },
    429: rateLimit,
    503: { description: "Code could not be sent", content: { "application/json": { schema: errorRef } } }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/otp/verify",
  summary: "Verify a login code and issue tokens",
  request: jsonBody(otpVerifySchema),
  responses: {
    200: jsonResponse("Access and refresh tokens", dataSchema(tokensRef)),
    400: validation,
    401: unauthorized,
    429: rateLimit,
    500: { description: "AUTH_TOKEN_SECRET is not set", content: { "application/json": { schema: errorRef } } }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/login",
  summary: "Email and password login",
  request: jsonBody(loginSchema),
  responses: {
    200: jsonResponse("Access and refresh tokens", dataSchema(tokensRef)),
    400: validation,
    401: unauthorized,
    429: rateLimit,
    500: { description: "AUTH_TOKEN_SECRET is not set", content: { "application/json": { schema: errorRef } } }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/refresh",
  summary: "Rotate a refresh token",
  request: jsonBody(refreshSchema),
  responses: {
    200: jsonResponse("New access and refresh tokens", dataSchema(tokensRef)),
    400: validation,
    401: unauthorized,
    500: { description: "AUTH_TOKEN_SECRET is not set", content: { "application/json": { schema: errorRef } } }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/logout",
  summary: "Revoke the refresh-token family",
  request: jsonBody(logoutSchema),
  responses: {
    200: jsonResponse("Logged out", dataSchema(okSchema))
  }
});

registry.registerPath({
  method: "get",
  path: "/api/v1/me",
  summary: "Current user",
  security: [{ bearerAuth: [] }],
  responses: {
    200: jsonResponse("Current user", dataSchema(meRef)),
    401: unauthorized
  }
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/me",
  summary: "Update name or push preference",
  security: [{ bearerAuth: [] }],
  request: jsonBody(mePatchSchema),
  responses: {
    200: jsonResponse("Updated user", dataSchema(meRef)),
    400: validation,
    401: unauthorized
  }
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/me",
  summary: "Anonymize the account and keep invoices",
  security: [{ bearerAuth: [] }],
  request: jsonBody(deleteAccountSchema),
  responses: {
    200: jsonResponse("Account anonymized", dataSchema(okSchema)),
    400: validation,
    401: unauthorized,
    403: { description: "Admin accounts cannot be deleted here", content: { "application/json": { schema: errorRef } } }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/push-devices",
  summary: "Register an Expo push token",
  security: [{ bearerAuth: [] }],
  request: jsonBody(pushRegisterSchema),
  responses: {
    200: jsonResponse("Registered", dataSchema(z.object({ id: z.string(), platform: z.enum(["IOS", "ANDROID"]), token: z.string() }))),
    400: validation,
    401: unauthorized,
    429: rateLimit
  }
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/push-devices",
  summary: "Unregister an Expo push token",
  security: [{ bearerAuth: [] }],
  request: jsonBody(pushUnregisterSchema),
  responses: {
    200: jsonResponse("Unregistered", dataSchema(okSchema)),
    400: validation,
    401: unauthorized
  }
});

registry.registerPath({
  method: "get",
  path: "/api/v1/me/sessions",
  summary: "Active refresh sessions",
  security: [{ bearerAuth: [] }],
  responses: {
    200: jsonResponse("Active sessions", dataSchema(listSchema(sessionSchema))),
    401: unauthorized
  }
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/me/sessions",
  summary: "Revoke every refresh session",
  security: [{ bearerAuth: [] }],
  responses: {
    200: jsonResponse("Revoked", dataSchema(okSchema)),
    401: unauthorized
  }
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/me/sessions/{id}",
  summary: "Revoke one refresh session",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: jsonResponse("Revoked", dataSchema(okSchema)),
    401: unauthorized,
    404: { description: "Session not found", content: { "application/json": { schema: errorRef } } }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/v1/shop/catalog",
  summary: "ReviewQR hardware catalogue",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Catalogue" },
    401: unauthorized
  }
});

registry.registerPath({
  method: "get",
  path: "/api/v1/shop/cart",
  summary: "The signed-in owner's shop cart",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Cart" },
    401: unauthorized
  }
});

registry.registerPath({
  method: "put",
  path: "/api/v1/shop/cart",
  summary: "Replace the shop cart",
  security: [{ bearerAuth: [] }],
  request: jsonBody(shopCartPutSchema),
  responses: {
    200: { description: "Cart" },
    400: validation,
    401: unauthorized,
    403: { description: "Forbidden", content: { "application/json": { schema: errorRef } } }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/shop/checkout",
  summary: "Pay the shop cart through YouPI, or a non-production stub",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Checkout" },
    400: validation,
    401: unauthorized,
    429: rateLimit
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/shop/orders/{id}/proof",
  summary: "Approve a design proof or request changes",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            action: z.enum(["approve", "changes"]),
            comment: z.string().max(500).optional()
          })
        }
      }
    }
  },
  responses: {
    200: { description: "Updated status" },
    400: validation,
    401: unauthorized,
    403: { description: "Forbidden", content: { "application/json": { schema: errorRef } } },
    404: { description: "Order not found", content: { "application/json": { schema: errorRef } } }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/shop/orders/{id}/reprint",
  summary: "Request a free reprint for damage or a misprint after delivery",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            reason: z.enum(["damage", "misprint"]),
            note: z.string().max(500).optional()
          })
        }
      }
    }
  },
  responses: {
    200: { description: "Reprint request" },
    400: validation,
    401: unauthorized,
    403: { description: "Forbidden", content: { "application/json": { schema: errorRef } } },
    404: { description: "Order not found", content: { "application/json": { schema: errorRef } } }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/shop/estimate",
  summary: "Pincode serviceability and the cheapest mock or live rate",
  security: [{ bearerAuth: [] }],
  request: jsonBody(shopEstimateSchema),
  responses: {
    200: { description: "Estimate" },
    400: validation,
    401: unauthorized,
    429: rateLimit
  }
});

registerResourcePaths(registry, errorRef);

let cached: ReturnType<OpenApiGeneratorV3["generateDocument"]> | null = null;

export function openApiDocument() {
  if (cached) return cached;
  const generator = new OpenApiGeneratorV3(registry.definitions);
  cached = generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "ReviewQR API",
      version: "1.0.0",
      description: "Versioned JSON API for the ReviewQR mobile app. Cookie sessions are also accepted when Authorization is absent."
    },
    servers: [{ url: "/" }]
  });
  return cached;
}

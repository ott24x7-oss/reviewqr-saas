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
  otpVerifySchema,
  pushRegisterSchema,
  pushUnregisterSchema,
  refreshSchema,
  sessionSchema,
  tokenPairSchema
} from "@reviewqr/shared";

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
    200: jsonResponse("Code sent. devCode is present only outside production when OTP_DEV_REVEAL is set.", dataSchema(otpSentSchema)),
    400: validation,
    429: rateLimit
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

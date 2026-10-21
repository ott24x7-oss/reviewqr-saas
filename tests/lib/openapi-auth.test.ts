import { describe, expect, it } from "vitest";
import { openApiDocument } from "../../lib/api/openapi";

describe("OpenAPI auth document", () => {
  it("lists the mobile auth routes", () => {
    const doc = openApiDocument();
    expect(doc.openapi).toBe("3.0.0");
    expect(doc.paths?.["/api/v1/auth/otp/request"]?.post).toBeTruthy();
    expect(doc.paths?.["/api/v1/auth/login"]?.post).toBeTruthy();
    expect(doc.paths?.["/api/v1/auth/refresh"]?.post).toBeTruthy();
    expect(doc.paths?.["/api/v1/me"]?.get).toBeTruthy();
    expect(doc.paths?.["/api/v1/me/sessions/{id}"]?.delete).toBeTruthy();
  });
});

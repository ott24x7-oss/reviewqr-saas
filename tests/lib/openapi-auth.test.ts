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
    expect(doc.paths?.["/api/v1/me"]?.delete).toBeTruthy();
    expect(doc.paths?.["/api/v1/push-devices"]?.post).toBeTruthy();
    expect(doc.paths?.["/api/v1/me/sessions/{id}"]?.delete).toBeTruthy();
    expect(doc.paths?.["/api/v1/businesses"]?.get).toBeTruthy();
    expect(doc.paths?.["/api/v1/businesses/{id}/menu"]?.post).toBeTruthy();
    expect(doc.paths?.["/api/v1/businesses/{id}/store"]?.put).toBeTruthy();
    expect(doc.paths?.["/api/v1/businesses/{id}/offers"]?.post).toBeTruthy();
    expect(doc.paths?.["/api/v1/businesses/{id}/coupons"]?.get).toBeTruthy();
    expect(doc.paths?.["/api/v1/businesses/{id}/qr-codes/claim"]?.post).toBeTruthy();
    expect(doc.paths?.["/api/v1/orders"]?.get).toBeTruthy();
    expect(doc.paths?.["/api/v1/orders/{id}/status"]?.post).toBeTruthy();
    expect(doc.paths?.["/api/v1/feedback"]?.get).toBeTruthy();
    expect(doc.paths?.["/api/v1/feedback/{id}"]?.patch).toBeTruthy();
    expect(doc.paths?.["/api/v1/notifications"]?.get).toBeTruthy();
    expect(doc.paths?.["/api/v1/uploads"]?.post).toBeTruthy();
    expect(doc.paths?.["/api/v1/shop/catalog"]?.get).toBeTruthy();
    expect(doc.paths?.["/api/v1/shop/cart"]?.put).toBeTruthy();
    expect(doc.paths?.["/api/v1/shop/estimate"]?.post).toBeTruthy();
    expect(doc.paths?.["/api/v1/shop/checkout"]?.post).toBeTruthy();
  });
});

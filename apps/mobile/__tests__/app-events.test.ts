import { eventBody } from "../src/analytics/events";

describe("app event body", () => {
  it("sends the event name and install id only", () => {
    const body = eventBody("signup_complete", "8b1b2c3d-4e5f-4a6b-8c7d-1234567890ab");
    expect(Object.keys(body).sort()).toEqual(["installId", "name"]);
    expect(JSON.stringify(body)).not.toMatch(/@|phone|token/i);
  });
});
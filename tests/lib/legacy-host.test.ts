import { describe, expect, it } from "vitest";
import { legacyHostRedirect, staysOnLegacyHost } from "../../lib/http/legacy-host";
import { destinationFor, directRedirectResponse, ownHostsFrom } from "../../lib/tap/direct-http";

const appUrl = "https://qr24x7.example";
const legacy = "review.watshop.in";

function decide(pathname: string, host = legacy, search = "") {
  return legacyHostRedirect({
    pathname,
    search,
    host,
    appUrl,
    legacyHosts: "review.watshop.in, old.example.com"
  });
}

describe("legacy host redirect", () => {
  it("301s the same path onto NEXT_PUBLIC_APP_URL", () => {
    expect(decide("/login", legacy, "?next=/dashboard")).toBe("https://qr24x7.example/login?next=/dashboard");
    expect(decide("/dashboard/billing")).toBe("https://qr24x7.example/dashboard/billing");
    expect(decide("/", "old.example.com")).toBe("https://qr24x7.example/");
    expect(decide("/pricing", "Old.Example.com:443")).toBe("https://qr24x7.example/pricing");
  });

  it("leaves the configured host, localhost, and unknown hosts alone", () => {
    expect(decide("/login", "qr24x7.example")).toBeNull();
    expect(decide("/login", "localhost:3000")).toBeNull();
    expect(decide("/login", "healthcheck.railway.app")).toBeNull();
    expect(
      legacyHostRedirect({
        pathname: "/login",
        search: "",
        host: legacy,
        appUrl,
        legacyHosts: ""
      })
    ).toBeNull();
  });

  it("keeps QR, NFC, slug pages, and direct-link paths on the legacy host", () => {
    for (const path of [
      "/q/TABLE001",
      "/q/TABLE001/",
      "/q/TABLE001/menu",
      "/q/TABLE001/contact",
      "/t/STAND9",
      "/t/STAND9/menu",
      "/r/ensofter",
      "/ensofter",
      "/ensofter/store",
      "/ensofter/contact",
      "/api/public/direct-scan",
      "/api/public/tap",
      "/api/public/reviews",
      "/api/widget/ensofter",
      "/api/health"
    ]) {
      expect(staysOnLegacyHost(path)).toBe(true);
      expect(decide(path, legacy, "?src=qr")).toBeNull();
    }
  });

  it("still 302s a recorded direct link instead of sending the scan to the new host first", () => {
    expect(decide("/q/TABLE001", legacy, "?src=qr")).toBeNull();
    const hosts = ownHostsFrom(legacy, appUrl, [legacy]);
    expect(destinationFor("https://search.google.com/local/writereview?placeid=abc", hosts)).toBe(
      "https://search.google.com/local/writereview?placeid=abc"
    );
    const response = directRedirectResponse("https://search.google.com/local/writereview?placeid=abc");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://search.google.com/local/writereview?placeid=abc");
    expect(destinationFor(`https://${legacy}/q/TABLE001/menu`, hosts)).toBe("/q/TABLE001/menu");
  });
});

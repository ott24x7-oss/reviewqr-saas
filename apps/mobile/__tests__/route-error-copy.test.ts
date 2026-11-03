import { routeErrorCopy } from "../src/ui/route-error-copy";

describe("owner route error fallback copy", () => {
  it("provides a retry and home action in English and Hindi", () => {
    const en = routeErrorCopy("en");
    const hi = routeErrorCopy("hi");

    expect(en.title).toBe("Something went wrong");
    expect(en.retry).toBe("Try again");
    expect(en.home).toBe("Go home");
    expect(hi.title).toBe("कुछ गड़बड़ हो गई");
    expect(hi.retry).toBe("फिर कोशिश करें");
    expect(hi.home).toBe("होम पर जाएँ");
  });
});

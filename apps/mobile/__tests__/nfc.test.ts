import { canWriteNfc } from "../src/nfc/access";
import { readUriPayload } from "../src/nfc/read";
import { nfcPayloadMatches, nfcTapUrl } from "../src/nfc/url";

describe("nfc writer", () => {
  it("builds a tap url and checks the read-back", () => {
    const url = nfcTapUrl("http://192.168.1.20:3000/", "/t/abc");
    expect(url).toBe("http://192.168.1.20:3000/t/abc?src=nfc");
    expect(nfcPayloadMatches(url, "/t/abc")).toBe(true);
    expect(nfcPayloadMatches("http://x/t/abc", "/t/abc")).toBe(false);
    expect(nfcPayloadMatches(url, "/menu")).toBe(false);
  });

  it("allows owners and field roles, and hides staff", () => {
    expect(canWriteNfc("USER", true)).toBe(true);
    expect(canWriteNfc("USER", false)).toBe(false);
    expect(canWriteNfc("STAFF", true)).toBe(false);
    expect(canWriteNfc("AGENT", false)).toBe(true);
    expect(canWriteNfc("AGENCY", false)).toBe(true);
    expect(canWriteNfc("ADMIN", false)).toBe(true);
  });

  it("decodes a URI payload and ignores a bad record", () => {
    expect(readUriPayload((bytes) => new TextDecoder().decode(bytes), [65, 66])).toBe("AB");
    expect(readUriPayload(() => { throw new Error("bad"); }, [1])).toBe("");
    expect(readUriPayload((bytes) => new TextDecoder().decode(bytes), [])).toBe("");
  });
});

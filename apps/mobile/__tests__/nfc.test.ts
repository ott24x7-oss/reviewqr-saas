import { canWriteNfc } from "../src/nfc/access";
import { readUriPayload } from "../src/nfc/read";
import { nfcPayloadMatches, nfcTapUrl, nfcUrlIsPublicHttps } from "../src/nfc/url";

describe("nfc writer", () => {
  it("keeps a public https tap url and refuses localhost or a LAN address", () => {
    const url = nfcTapUrl("https://reviewqr.example/", "/t/abc");
    expect(url).toBe("https://reviewqr.example/t/abc?src=nfc");
    expect(nfcUrlIsPublicHttps(url)).toBe(true);
    expect(nfcUrlIsPublicHttps("http://reviewqr.example/t/abc?src=nfc")).toBe(false);
    expect(nfcUrlIsPublicHttps("https://localhost/t/abc")).toBe(false);
    expect(nfcUrlIsPublicHttps("https://printer.local/t/abc")).toBe(false);
    expect(nfcUrlIsPublicHttps("https://127.0.0.1/t/abc")).toBe(false);
    expect(nfcUrlIsPublicHttps("https://127.1/t/abc")).toBe(false);
    expect(nfcUrlIsPublicHttps("https://10.1.2.3/t/abc")).toBe(false);
    expect(nfcUrlIsPublicHttps("https://192.168.1.20/t/abc")).toBe(false);
    expect(nfcUrlIsPublicHttps("https://172.16.0.4/t/abc")).toBe(false);
    expect(nfcUrlIsPublicHttps("https://172.31.1.1/t/abc")).toBe(false);
    expect(nfcUrlIsPublicHttps("https://172.15.1.1/t/abc")).toBe(true);
    expect(nfcUrlIsPublicHttps("http://192.168.1.20:3000/t/abc?src=nfc")).toBe(false);
    expect(nfcPayloadMatches(url, "/t/abc")).toBe(true);
    expect(nfcPayloadMatches("https://reviewqr.example/t/abc", "/t/abc")).toBe(false);
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

import { describe, expect, it } from "vitest";
import { decodeNdefUrl, nfcLinkMatches, nfcUrl, normalizeChipUid, publicAppOrigin } from "../../lib/tap/nfc";

describe("NFC links", () => {
  it("builds the tap link and recognises a read-back", () => {
    const url = nfcUrl("https://reviewqr.example/", "TABLE001");
    expect(url).toBe("https://reviewqr.example/t/TABLE001?src=nfc");
    expect(nfcLinkMatches(url, "TABLE001")).toBe(true);
    expect(nfcLinkMatches("https://reviewqr.example/q/TABLE001?src=qr", "TABLE001")).toBe(false);
  });

  it("decodes an https URI record", () => {
    const path = "reviewqr.example/t/TABLE001?src=nfc";
    const bytes = new Uint8Array([4, ...new TextEncoder().encode(path)]);
    expect(decodeNdefUrl(bytes)).toBe(`https://${path}`);
    expect(nfcLinkMatches(decodeNdefUrl(bytes), "TABLE001")).toBe(true);
  });

  it("uses only NEXT_PUBLIC_APP_URL for the tag origin", () => {
    expect(publicAppOrigin(undefined)).toBeNull();
    expect(publicAppOrigin("")).toBeNull();
    expect(publicAppOrigin("not a url")).toBeNull();
    expect(publicAppOrigin("https://reviewqr.example/app/")).toBe("https://reviewqr.example");
    expect(nfcUrl(publicAppOrigin("https://reviewqr.example/")!, "abc")).toBe(
      "https://reviewqr.example/t/abc?src=nfc"
    );
  });

  it("accepts a colon-separated chip UID", () => {
    expect(normalizeChipUid("04:A1:B2:C3")).toBe("04:a1:b2:c3");
    expect(normalizeChipUid("zz")).toBeNull();
    expect(normalizeChipUid("")).toBeNull();
  });
});

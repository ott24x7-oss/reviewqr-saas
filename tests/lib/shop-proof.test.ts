import { describe, expect, it } from "vitest";
import { proofContentType, publicShopProof, shopProofSignatureOk } from "../../lib/admin/shop-proof";

describe("shop proof links", () => {
  it("returns an http proof as stored and signs a private data URL", () => {
    const remote = publicShopProof("order-1", "line-1", "https://cdn.example/proof.png");
    expect(remote).toEqual({ proofUrl: "https://cdn.example/proof.png", proofContentType: "image/png" });

    const stored = "data:application/pdf;base64,JVBERi0x";
    const signed = publicShopProof("order-1", "line-1", stored, 1_700_000_000);
    expect(signed.proofContentType).toBe("application/pdf");
    expect(signed.proofUrl).toContain("/api/shop-proof?");
    expect(signed.proofUrl).not.toContain("base64");
    expect(signed.proofUrl).not.toContain("JVBERi0x");
    const url = new URL(signed.proofUrl!);
    expect(shopProofSignatureOk("order-1", "line-1", url.searchParams.get("exp"), url.searchParams.get("sig"), 1_700_000_000)).toBe(true);
    expect(shopProofSignatureOk("order-1", "line-1", url.searchParams.get("exp"), "tampered", 1_700_000_000)).toBe(false);
    expect(shopProofSignatureOk("order-1", "line-1", url.searchParams.get("exp"), url.searchParams.get("sig"), 1_700_000_000 + 601)).toBe(false);
  });

  it("reads a content type from a data URL", () => {
    expect(proofContentType("data:image/png;base64,aaaa")).toBe("image/png");
    expect(proofContentType(null)).toBeNull();
  });
});

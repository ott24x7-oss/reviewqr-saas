import { describe, expect, it } from "vitest";
import { assignCardImages, preferredCardSrc } from "@/lib/landing/card-images";

describe("plan card images", () => {
  it("prefers an admin image over the category photo", () => {
    expect(preferredCardSrc({ imageUrl: "https://cdn.example/stand.jpg", category: "menu" })).toBe(
      "https://cdn.example/stand.jpg"
    );
    expect(preferredCardSrc({ imageUrl: "  ", category: "menu" })).toBe("/landing/product-menu-800.webp");
  });

  it("keeps a category photo when neighbours differ", () => {
    const srcs = assignCardImages(
      [
        { imageUrl: "", category: "reviews" },
        { imageUrl: "", category: "menu" },
        { imageUrl: "", category: "store" }
      ],
      2
    );
    expect(srcs).toEqual([
      "/landing/product-reviews-800.webp",
      "/landing/product-menu-800.webp",
      "/landing/product-store-800.webp"
    ]);
  });

  it("does not repeat an image on an adjacent card", () => {
    const srcs = assignCardImages(
      [
        { imageUrl: "", category: "menu" },
        { imageUrl: "", category: "menu" },
        { imageUrl: "", category: "menu" },
        { imageUrl: "", category: "menu" }
      ],
      2
    );
    expect(srcs[0]).toBe("/landing/product-menu-800.webp");
    expect(srcs[1]).not.toBe(srcs[0]);
    expect(srcs[2]).not.toBe(srcs[0]);
    expect(srcs[3]).not.toBe(srcs[2]);
    expect(srcs[3]).not.toBe(srcs[1]);
    expect(new Set(srcs).size).toBeGreaterThan(1);
  });

  it("keeps a unique admin image even when the category would repeat", () => {
    const srcs = assignCardImages(
      [
        { imageUrl: "", category: "store" },
        { imageUrl: "https://cdn.example/own.jpg", category: "store" }
      ],
      2
    );
    expect(srcs[1]).toBe("https://cdn.example/own.jpg");
  });
});

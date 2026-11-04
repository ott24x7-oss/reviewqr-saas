import { describe, expect, it, vi } from "vitest";
import { addStarterGuides } from "../../lib/blog/starter-guides";

describe("starter blog guides", () => {
  it("creates missing entries as drafts and skips existing locale/slug pairs", async () => {
    const createMany = vi.fn(async (args: {
      data: Array<{ locale: string; slug: string; status: string; authorName: string }>;
      skipDuplicates: boolean;
    }) => ({ count: args.data.length }));
    const client = { blogPost: { createMany } } as unknown as Parameters<typeof addStarterGuides>[0];

    const count = await addStarterGuides(client);
    expect(count).toBeGreaterThan(0);

    const args = createMany.mock.calls[0]?.[0];
    expect(args).toBeDefined();
    if (!args) throw new Error("Starter guide insert was not attempted");
    expect(args.skipDuplicates).toBe(true);
    expect(args.data.length).toBeGreaterThan(0);
    expect(args.data.every((draft) => draft.status === "DRAFT" && draft.authorName === "QR24x7")).toBe(true);
    expect(new Set(args.data.map((draft) => `${draft.locale}/${draft.slug}`)).size).toBe(args.data.length);
  });
});

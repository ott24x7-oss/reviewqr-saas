import { describe, expect, it } from "vitest";
import { batchSizeError, tableLabels } from "../../lib/print/batch";

describe("print batches", () => {
  it("caps a batch at 100 codes", () => {
    expect(batchSizeError(1)).toBeNull();
    expect(batchSizeError(100)).toBeNull();
    expect(batchSizeError(0)).toMatch(/1 and 100/);
    expect(batchSizeError(101)).toMatch(/1 and 100/);
    expect(batchSizeError(1.5)).toMatch(/1 and 100/);
  });

  it("names each table in order", () => {
    expect(tableLabels(3)).toEqual(["Table 1", "Table 2", "Table 3"]);
    expect(new Set(tableLabels(12)).size).toBe(12);
  });
});

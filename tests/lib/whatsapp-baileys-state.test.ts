import { describe, expect, it, vi } from "vitest";
import {
  BoundedMapCache,
  CoalescedWriter,
  isOwnerLease,
  RetryMessageCache,
  shouldTakeOwnerLease
} from "../../lib/whatsapp-baileys-state";

describe("Baileys state helpers", () => {
  it("bounds retry messages and expires them after the TTL", () => {
    let now = 0;
    const cache = new RetryMessageCache<string>(2, 100, () => now);

    cache.set("one", "first");
    cache.set("two", "second");
    cache.set("three", "third");
    expect(cache.get("one")).toBeUndefined();
    expect(cache.get("two")).toBe("second");

    now = 100;
    expect(cache.get("two")).toBeUndefined();
    expect(cache.get("three")).toBeUndefined();
  });

  it("implements the bounded Baileys retry counter cache interface", () => {
    let now = 0;
    const cache = new BoundedMapCache(1, 50, () => now);

    cache.set("one", 1);
    cache.set("two", 2);
    expect(cache.get<number>("one")).toBeUndefined();
    expect(cache.get<number>("two")).toBe(2);
    cache.del("two");
    expect(cache.get<number>("two")).toBeUndefined();

    cache.set("three", 3);
    now = 50;
    expect(cache.get<number>("three")).toBeUndefined();
    cache.set("four", 4);
    cache.flushAll();
    expect(cache.get<number>("four")).toBeUndefined();
  });

  it("coalesces concurrent change notifications into a latest follow-up write", async () => {
    let value = 1;
    let releaseFirst!: () => void;
    const firstWriteBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const snapshots: number[] = [];
    const write = vi.fn(async () => {
      snapshots.push(value);
      if (snapshots.length === 1) await firstWriteBlocked;
    });
    const writer = new CoalescedWriter(write);

    const first = writer.request();
    value = 2;
    const second = writer.request();
    value = 3;
    const third = writer.request();
    releaseFirst();
    await Promise.all([first, second, third]);
    await writer.flush();

    expect(snapshots).toEqual([1, 3]);
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("does not throw write errors into the caller and still accepts later writes", async () => {
    const onError = vi.fn();
    const write = vi.fn().mockRejectedValueOnce(new Error("database unavailable"));
    const writer = new CoalescedWriter(write, onError);

    await expect(writer.request()).resolves.toBeUndefined();
    await writer.request();

    expect(onError).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("lets newer instance starts take the owner lease", () => {
    const current = { instanceId: "deploy-a", startedAt: 100 };
    const newer = { instanceId: "deploy-b", startedAt: 101 };

    expect(shouldTakeOwnerLease(null, current)).toBe(true);
    expect(shouldTakeOwnerLease(current, newer)).toBe(true);
    expect(shouldTakeOwnerLease(newer, current)).toBe(false);
    expect(shouldTakeOwnerLease(current, current)).toBe(true);
    expect(isOwnerLease(current, newer)).toBe(false);
    expect(isOwnerLease(current, current)).toBe(true);
  });
});

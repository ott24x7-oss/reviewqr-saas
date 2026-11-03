/** Small, dependency-free state helpers for the Baileys connection. */

type TimedValue<T> = { value: T; expiresAt: number };

export class RetryMessageCache<T> {
  private readonly entries = new Map<string, TimedValue<T>>();

  constructor(
    private readonly maxEntries = 500,
    private readonly ttlMs = 24 * 60 * 60 * 1000,
    private readonly now: () => number = Date.now
  ) {}

  set(id: string, value: T) {
    if (!id || this.maxEntries <= 0 || this.ttlMs <= 0) return;
    const now = this.now();
    this.prune(now);
    this.entries.delete(id);
    this.entries.set(id, { value, expiresAt: now + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  get(id: string): T | undefined {
    const now = this.now();
    this.prune(now);
    return this.entries.get(id)?.value;
  }

  private prune(now: number) {
    for (const [id, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(id);
    }
  }
}

/** Baileys CacheStore-compatible bounded map with an expiry for retry counters. */
export class BoundedMapCache {
  private readonly entries = new Map<string, TimedValue<unknown>>();

  constructor(
    private readonly maxEntries = 500,
    private readonly ttlMs = 60 * 60 * 1000,
    private readonly now: () => number = Date.now
  ) {}

  get<T>(key: string): T | undefined {
    const now = this.now();
    this.prune(now);
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T) {
    if (!key || this.maxEntries <= 0 || this.ttlMs <= 0) return;
    const now = this.now();
    this.prune(now);
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  del(key: string) {
    this.entries.delete(key);
  }

  flushAll() {
    this.entries.clear();
  }

  private prune(now: number) {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}

/** Coalesces bursts of changes into one active write and one latest follow-up. */
export class CoalescedWriter {
  private pending = false;
  private running: Promise<void> | null = null;

  constructor(
    private readonly write: () => Promise<void>,
    private readonly onError: (error: unknown) => void = () => {}
  ) {}

  request(): Promise<void> {
    this.pending = true;
    return this.running ?? this.startDrain();
  }

  async flush(): Promise<void> {
    while (this.pending || this.running) {
      if (!this.running) this.startDrain();
      const active = this.running;
      if (active) await active;
    }
  }

  private startDrain(): Promise<void> {
    const active = this.drain();
    this.running = active;
    void active.then(
      () => this.finishDrain(active),
      () => this.finishDrain(active)
    );
    return active;
  }

  private finishDrain(active: Promise<void>) {
    if (this.running === active) this.running = null;
    if (this.pending) this.startDrain();
  }

  private async drain() {
    while (this.pending) {
      this.pending = false;
      try {
        await this.write();
      } catch (error) {
        try {
          this.onError(error);
        } catch {
          // Logging must never turn a persistence failure into a Baileys error.
        }
      }
    }
  }
}

export type OwnerLease = { instanceId: string; startedAt: number };

export function shouldTakeOwnerLease(current: OwnerLease | null, candidate: OwnerLease) {
  if (!current) return true;
  if (current.instanceId === candidate.instanceId && current.startedAt === candidate.startedAt) {
    return true;
  }
  return candidate.startedAt > current.startedAt;
}

export function isOwnerLease(current: OwnerLease | null, candidate: OwnerLease) {
  return (
    current?.instanceId === candidate.instanceId && current.startedAt === candidate.startedAt
  );
}

import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const rows: Array<{ id: string; identifier: string; tokenHash: string; purpose: string; expires: Date }> = [];
  const prisma = {
    emailOtp: {
      create: vi.fn(async ({ data }: { data: Omit<(typeof rows)[number], "id"> }) => {
        const row = { ...data, id: `proof_${rows.length + 1}` };
        rows.push(row);
        return row;
      }),
      findFirst: vi.fn(async ({ where }: { where: Partial<(typeof rows)[number]> }) => {
        return rows.find((row) => Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value)) ?? null;
      }),
      deleteMany: vi.fn(async ({ where }: { where: Record<string, any> }) => {
        const index = rows.findIndex((row) =>
          Object.entries(where).every(([key, value]) => {
            if (key === "expires" && value && typeof value === "object" && "gt" in value) {
              return row.expires.getTime() > new Date(value.gt).getTime();
            }
            return row[key as keyof typeof row] === value;
          })
        );
        if (index < 0) return { count: 0 };
        rows.splice(index, 1);
        return { count: 1 };
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const index = rows.findIndex((row) => row.id === where.id);
        if (index < 0) throw new Error("missing row");
        return rows.splice(index, 1)[0];
      })
    }
  };
  return { rows, prisma };
});

vi.mock("../../lib/db", () => ({ prisma: database.prisma }));

import { consumeSignupProof, consumeSignupProofToken, issueSignupProof } from "../../lib/otp";

beforeEach(() => {
  database.rows.splice(0);
  vi.clearAllMocks();
});

describe("signup proof tokens", () => {
  it("stores only a hash, binds the proof to its phone, and allows one consume", async () => {
    const token = await issueSignupProof("9811111111");
    const row = database.rows[0];

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(row.tokenHash).not.toBe(token);
    expect(await consumeSignupProof("9822222222", token)).toBeNull();
    expect(await consumeSignupProof("9811111111", token)).toBe("9811111111");
    expect(await consumeSignupProof("9811111111", token)).toBeNull();
  });

  it("rejects expired tokens and atomically claims a live link by its stored phone", async () => {
    const expired = await issueSignupProof("9811111111");
    database.rows[0].expires = new Date(Date.now() - 1);
    expect(await consumeSignupProofToken(expired)).toBeNull();

    const live = await issueSignupProof("9822222222");
    expect(await consumeSignupProofToken(live)).toBe("9822222222");
    expect(await consumeSignupProofToken(live)).toBeNull();
  });
});

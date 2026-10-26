import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, isEncryptionEnabled } from "../../lib/crypto";

const originalKey = process.env.APP_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.APP_ENCRYPTION_KEY;
  else process.env.APP_ENCRYPTION_KEY = originalKey;
});

describe("secret encryption", () => {
  it("keeps the legacy plaintext behavior when no key is configured", () => {
    delete process.env.APP_ENCRYPTION_KEY;

    expect(isEncryptionEnabled()).toBe(false);
    expect(encryptSecret("ABCDE1234F")).toBe("ABCDE1234F");
    expect(decryptSecret("ABCDE1234F")).toBe("ABCDE1234F");
  });

  it("encrypts and decrypts values with the configured key", () => {
    process.env.APP_ENCRYPTION_KEY = "stable-test-encryption-key";

    const encrypted = encryptSecret("ABCDE1234F");

    expect(isEncryptionEnabled()).toBe(true);
    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain("ABCDE1234F");
    expect(decryptSecret(encrypted)).toBe("ABCDE1234F");
  });

  it("continues to read legacy plaintext after a key is configured", () => {
    process.env.APP_ENCRYPTION_KEY = "stable-test-encryption-key";

    expect(decryptSecret("legacy-value")).toBe("legacy-value");
  });

  it("fails closed when encrypted data is opened without the key", () => {
    process.env.APP_ENCRYPTION_KEY = "stable-test-encryption-key";
    const encrypted = encryptSecret("bank-account-value");
    delete process.env.APP_ENCRYPTION_KEY;

    expect(decryptSecret(encrypted)).toBe("");
  });
});

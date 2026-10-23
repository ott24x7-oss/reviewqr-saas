-- Weekly email is opt-in. New rows start off.
ALTER TABLE "ReportPreference" ALTER COLUMN "emailOptIn" SET DEFAULT false;

-- Rows still on the previous default were never changed by the owner.
UPDATE "ReportPreference"
SET "emailOptIn" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "emailOptIn" = true
  AND "whatsappOptIn" = false
  AND "unsubscribedAt" IS NULL;

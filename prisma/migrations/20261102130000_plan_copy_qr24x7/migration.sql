-- Update the seeded free-plan lines only while they still use the previous name.
-- Custom descriptions, prices, and every other column stay as they are.
UPDATE "Plan"
SET "descriptionEn" = 'Try QR24x7 risk-free',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "descriptionEn" = 'Try ReviewQR risk-free';

UPDATE "Plan"
SET "descriptionHi" = 'QR24x7 बिना जोखिम आज़माएँ',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "descriptionHi" = 'ReviewQR बिना जोखिम आज़माएँ';

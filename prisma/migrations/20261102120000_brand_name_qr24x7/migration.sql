-- Update the stored platform name only when it is still the previous default.
-- Custom names, taglines, and every other column stay as they are.
UPDATE "PlatformBranding"
SET "brandName" = 'QR24x7'
WHERE "brandName" = 'ReviewQR';

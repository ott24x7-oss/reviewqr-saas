-- Reads for a daily rollup filter QrScan by code and time.
CREATE INDEX IF NOT EXISTS "QrScan_qrCodeId_createdAt_idx" ON "QrScan"("qrCodeId", "createdAt");

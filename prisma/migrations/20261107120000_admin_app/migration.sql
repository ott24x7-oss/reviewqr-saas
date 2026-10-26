-- Admin app sessions, device approval, audit detail, and notification preferences.
-- Nullable columns and new tables only. Existing rows stay valid.

CREATE TYPE "AdminDeviceStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);

ALTER TABLE "RefreshSession" ADD COLUMN "audience" TEXT NOT NULL DEFAULT 'app';
ALTER TABLE "RefreshSession" ADD COLUMN "adminDeviceId" TEXT;

ALTER TABLE "AuditLog" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "reason" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "before" JSONB;
ALTER TABLE "AuditLog" ADD COLUMN "after" JSONB;

CREATE TABLE "AdminDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "pushToken" TEXT,
    "status" "AdminDeviceStatus" NOT NULL DEFAULT 'PENDING',
    "lastSeenAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminNotifyPref" (
    "userId" TEXT NOT NULL,
    "paidPayment" BOOLEAN NOT NULL DEFAULT true,
    "failedPayment" BOOLEAN NOT NULL DEFAULT true,
    "signup" BOOLEAN NOT NULL DEFAULT true,
    "agentPending" BOOLEAN NOT NULL DEFAULT true,
    "printProof" BOOLEAN NOT NULL DEFAULT true,
    "payoutDue" BOOLEAN NOT NULL DEFAULT true,
    "supportTicket" BOOLEAN NOT NULL DEFAULT true,
    "whatsappDown" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "AdminNotifyPref_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "RefreshSession_adminDeviceId_idx" ON "RefreshSession"("adminDeviceId");
CREATE INDEX "AuditLog_deviceId_idx" ON "AuditLog"("deviceId");
CREATE INDEX "AdminDevice_userId_status_idx" ON "AdminDevice"("userId", "status");
CREATE INDEX "AdminDevice_status_createdAt_idx" ON "AdminDevice"("status", "createdAt");

ALTER TABLE "AdminDevice" ADD CONSTRAINT "AdminDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminDevice" ADD CONSTRAINT "AdminDevice_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_adminDeviceId_fkey" FOREIGN KEY ("adminDeviceId") REFERENCES "AdminDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminNotifyPref" ADD CONSTRAINT "AdminNotifyPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

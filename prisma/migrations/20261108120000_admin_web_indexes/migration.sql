-- Additive indexes for admin list filters. No data changes.
CREATE INDEX "User_role_deletedAt_idx" ON "User"("role", "deletedAt");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE INDEX "Subscription_status_endsAt_idx" ON "Subscription"("status", "endsAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

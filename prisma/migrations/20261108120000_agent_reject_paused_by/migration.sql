-- Admin rejection is its own status, and a pause remembers who made it.
-- Additive only. Existing rows keep their status; pausedBy starts empty, so
-- only an admin can resume an agent that was paused before this change.

ALTER TYPE "AgentStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "AgentProfile" ADD COLUMN "pausedBy" TEXT;

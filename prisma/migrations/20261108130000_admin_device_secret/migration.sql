-- A device is reused at sign-in only with the secret it was issued.
-- Nullable column only. Devices created before this have no secret, so their
-- next sign-in opens a new PENDING device that an admin must approve.

ALTER TABLE "AdminDevice" ADD COLUMN "secretHash" TEXT;

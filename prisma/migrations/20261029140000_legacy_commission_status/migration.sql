-- Historical shop commissions are not payable until an admin decides.
-- The new value is committed in this migration so the next one can use it.
ALTER TYPE "CommissionStatus" ADD VALUE IF NOT EXISTS 'LEGACY_UNSETTLED';

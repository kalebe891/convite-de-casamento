
-- Remove partial unique indexes (from soft delete)
DROP INDEX IF EXISTS idx_invitations_unique_code_active;
DROP INDEX IF EXISTS idx_invitations_guest_wedding_active;

-- Restore normal unique constraints
CREATE UNIQUE INDEX idx_invitations_unique_code ON invitations (unique_code);

-- Remove soft delete columns
ALTER TABLE invitations DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE invitations DROP COLUMN IF EXISTS deleted_by;

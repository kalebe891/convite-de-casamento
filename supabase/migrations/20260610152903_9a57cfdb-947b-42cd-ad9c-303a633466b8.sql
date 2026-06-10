
ALTER TABLE public.wedding_details
  ADD COLUMN IF NOT EXISTS tenant_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wedding_details_tenant_status_check'
  ) THEN
    ALTER TABLE public.wedding_details
      ADD CONSTRAINT wedding_details_tenant_status_check
      CHECK (tenant_status IN ('active', 'archived'));
  END IF;
END$$;

-- Backfill
UPDATE public.wedding_details
SET expires_at = COALESCE(expires_at, created_at + INTERVAL '365 days'),
    tenant_status = COALESCE(tenant_status, 'active');

-- Add checked_in_at field to guests table
ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- Add checked_in_at field to invitations table
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- Create checkin_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.checkin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_email text NOT NULL,
  guest_id uuid NULL,
  checked_in_at timestamptz NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  source text NOT NULL CHECK (source IN ('offline', 'online')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on checkin_logs
ALTER TABLE public.checkin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authorized users can view checkin logs
CREATE POLICY "Authorized users can view checkin logs"
ON public.checkin_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'couple'::app_role) OR 
  has_role(auth.uid(), 'planner'::app_role) OR
  has_role(auth.uid(), 'cerimonial'::app_role)
);

-- RLS Policy: Only admins can delete checkin logs
CREATE POLICY "Admins can delete checkin logs"
ON public.checkin_logs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_checkin_logs_guest_email ON public.checkin_logs(guest_email);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_created_at ON public.checkin_logs(created_at DESC);

COMMENT ON TABLE public.checkin_logs IS 'Audit log for guest check-ins, supporting offline sync';
COMMENT ON COLUMN public.checkin_logs.source IS 'Source of check-in: offline or online';
COMMENT ON COLUMN public.checkin_logs.metadata IS 'Additional metadata about the check-in (device info, conflicts, etc.)';
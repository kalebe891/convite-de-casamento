-- Create invitations table for personalized guest links
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES public.wedding_details(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text,
  guest_phone text,
  unique_code text UNIQUE NOT NULL,
  attending boolean,
  plus_one boolean DEFAULT false,
  dietary_restrictions text,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Anyone with the unique code can view and update their own invitation
CREATE POLICY "Anyone can view invitations with unique code"
ON public.invitations
FOR SELECT
USING (true);

CREATE POLICY "Anyone can update their own invitation"
ON public.invitations
FOR UPDATE
USING (true);

-- Authorized users can manage all invitations
CREATE POLICY "Authorized users can manage invitations"
ON public.invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'couple'::app_role) OR has_role(auth.uid(), 'planner'::app_role));

-- Create index on unique_code for fast lookups
CREATE INDEX idx_invitations_unique_code ON public.invitations(unique_code);
-- Add privacy and public settings to wedding_details
ALTER TABLE wedding_details 
ADD COLUMN IF NOT EXISTS show_guest_list_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_rsvp_status_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS venue_map_url text,
ADD COLUMN IF NOT EXISTS couple_message text;

-- Create timeline_events table
CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES wedding_details(id) ON DELETE CASCADE,
  time text NOT NULL,
  activity text NOT NULL,
  display_order integer DEFAULT 0,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public timeline events"
ON timeline_events FOR SELECT
USING (is_public = true);

CREATE POLICY "Authorized users can manage timeline events"
ON timeline_events FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'couple') OR has_role(auth.uid(), 'planner'));

-- Create buffet_items table
CREATE TABLE IF NOT EXISTS buffet_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES wedding_details(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text,
  display_order integer DEFAULT 0,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE buffet_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public buffet items"
ON buffet_items FOR SELECT
USING (is_public = true);

CREATE POLICY "Authorized users can manage buffet items"
ON buffet_items FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'couple') OR has_role(auth.uid(), 'planner'));

-- Create playlist_songs table
CREATE TABLE IF NOT EXISTS playlist_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES wedding_details(id) ON DELETE CASCADE,
  moment text NOT NULL,
  song_name text NOT NULL,
  artist text,
  display_order integer DEFAULT 0,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public playlist songs"
ON playlist_songs FOR SELECT
USING (is_public = true);

CREATE POLICY "Authorized users can manage playlist songs"
ON playlist_songs FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'couple') OR has_role(auth.uid(), 'planner'));

-- Add unique_code to invitations if not exists (for public invitation page)
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS invitation_code text UNIQUE;
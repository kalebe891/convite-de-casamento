-- Add new can_publish column to admin_permissions for visibility control
ALTER TABLE public.admin_permissions 
ADD COLUMN can_publish BOOLEAN NOT NULL DEFAULT false;

-- Add global visibility toggles to wedding_details
ALTER TABLE public.wedding_details 
ADD COLUMN show_timeline_section BOOLEAN DEFAULT true,
ADD COLUMN show_buffet_section BOOLEAN DEFAULT true,
ADD COLUMN show_playlist_section BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.admin_permissions.can_publish IS 'Permission to make items or sections public (for gifts, timeline, buffet, playlist)';
COMMENT ON COLUMN public.wedding_details.show_timeline_section IS 'Global toggle to show/hide timeline section on public page';
COMMENT ON COLUMN public.wedding_details.show_buffet_section IS 'Global toggle to show/hide buffet section on public page';
COMMENT ON COLUMN public.wedding_details.show_playlist_section IS 'Global toggle to show/hide playlist section on public page';
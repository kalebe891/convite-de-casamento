-- Add missing columns to events table for EventsSection component
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS maps_url text;
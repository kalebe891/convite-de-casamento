DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'wedding_details'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wedding_details;
  END IF;
END $$;

DO $$
DECLARE
  v_relreplident char;
BEGIN
  SELECT c.relreplident INTO v_relreplident
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'wedding_details';

  IF v_relreplident IS DISTINCT FROM 'f' THEN
    EXECUTE 'ALTER TABLE public.wedding_details REPLICA IDENTITY FULL';
  END IF;
END $$;
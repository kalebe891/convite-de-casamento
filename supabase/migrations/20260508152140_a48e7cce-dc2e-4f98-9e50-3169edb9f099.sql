
-- 1. Slug
ALTER TABLE public.wedding_details
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- 2. Popular slug atual
UPDATE public.wedding_details
SET slug = 'beatriz-e-diogo'
WHERE slug IS NULL;

-- 3. Índice slug
CREATE INDEX IF NOT EXISTS idx_wedding_details_slug
  ON public.wedding_details(slug);

-- 4. theme_id
ALTER TABLE public.wedding_details
  ADD COLUMN IF NOT EXISTS theme_id text DEFAULT 'default';

-- 4.1 event_type
ALTER TABLE public.wedding_details
  ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'wedding';

-- 5. Tabela user_weddings
CREATE TABLE IF NOT EXISTS public.user_weddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wedding_id uuid NOT NULL REFERENCES public.wedding_details(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, wedding_id)
);

-- 6. RLS
ALTER TABLE public.user_weddings ENABLE ROW LEVEL SECURITY;

-- 7. Policies
DROP POLICY IF EXISTS "Users can view their own wedding links" ON public.user_weddings;
CREATE POLICY "Users can view their own wedding links"
  ON public.user_weddings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage user_weddings" ON public.user_weddings;
CREATE POLICY "Admins can manage user_weddings"
  ON public.user_weddings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Índices
CREATE INDEX IF NOT EXISTS idx_user_weddings_user_id
  ON public.user_weddings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_weddings_wedding_id
  ON public.user_weddings(wedding_id);

-- 9. Função user_has_wedding_access
CREATE OR REPLACE FUNCTION public.user_has_wedding_access(_user_id uuid, _wedding_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_weddings
      WHERE user_id = _user_id AND wedding_id = _wedding_id
    );
$$;

-- 10. Função get_user_wedding_ids
CREATE OR REPLACE FUNCTION public.get_user_wedding_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.wedding_details
  WHERE public.has_role(_user_id, 'admin')
  UNION
  SELECT wedding_id FROM public.user_weddings
  WHERE user_id = _user_id;
$$;

-- 11. Backfill: vincular todos usuários atuais ao(s) casamento(s) existente(s)
INSERT INTO public.user_weddings (user_id, wedding_id, role)
SELECT ur.user_id, wd.id, ur.role
FROM public.user_roles ur
CROSS JOIN public.wedding_details wd
ON CONFLICT (user_id, wedding_id) DO NOTHING;

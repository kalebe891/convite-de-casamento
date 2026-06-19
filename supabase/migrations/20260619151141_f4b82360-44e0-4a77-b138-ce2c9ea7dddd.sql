
-- gift_pix_selections: registra intenção de contribuição PIX por convidado
CREATE TABLE public.gift_pix_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL,
  guest_id uuid NOT NULL,
  gift_item_id uuid NOT NULL REFERENCES public.gift_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_id, gift_item_id)
);

CREATE INDEX idx_gift_pix_selections_wedding ON public.gift_pix_selections(wedding_id);
CREATE INDEX idx_gift_pix_selections_guest ON public.gift_pix_selections(guest_id);

-- Sem GRANT para anon: escrita pública acontece via Edge Function rsvp-respond (service_role).
GRANT SELECT ON public.gift_pix_selections TO authenticated;
GRANT ALL ON public.gift_pix_selections TO service_role;

ALTER TABLE public.gift_pix_selections ENABLE ROW LEVEL SECURITY;

-- Admins/usuários com acesso ao wedding podem visualizar
CREATE POLICY "Users can view pix selections of their weddings"
  ON public.gift_pix_selections
  FOR SELECT
  TO authenticated
  USING (public.user_has_wedding_access(auth.uid(), wedding_id));

-- Sem políticas de INSERT/UPDATE/DELETE para anon ou authenticated:
-- todas as gravações públicas ocorrem via Edge Function rsvp-respond (service_role bypassa RLS).
-- Admin pode gerenciar via service_role / Edge Function dedicada se necessário no futuro.

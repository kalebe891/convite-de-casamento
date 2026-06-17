ALTER TABLE public.gift_items
  ADD COLUMN IF NOT EXISTS gift_kind text NOT NULL DEFAULT 'traditional',
  ADD COLUMN IF NOT EXISTS pix_mode text NULL,
  ADD COLUMN IF NOT EXISTS pix_copy_paste_code text NULL,
  ADD COLUMN IF NOT EXISTS qr_image_url text NULL,
  ADD COLUMN IF NOT EXISTS suggested_amount numeric(12,2) NULL;

ALTER TABLE public.gift_items
  DROP CONSTRAINT IF EXISTS gift_items_gift_kind_check;
ALTER TABLE public.gift_items
  ADD CONSTRAINT gift_items_gift_kind_check CHECK (gift_kind IN ('traditional','pix_manual'));

ALTER TABLE public.gift_items
  DROP CONSTRAINT IF EXISTS gift_items_pix_mode_check;
ALTER TABLE public.gift_items
  ADD CONSTRAINT gift_items_pix_mode_check CHECK (pix_mode IS NULL OR pix_mode IN ('free','fixed'));
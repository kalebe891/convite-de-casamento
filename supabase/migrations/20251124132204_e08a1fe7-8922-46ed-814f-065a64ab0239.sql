-- Criar tabela gift_items para lista de presentes
CREATE TABLE public.gift_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID REFERENCES public.wedding_details(id),
  gift_name TEXT NOT NULL,
  description TEXT,
  link TEXT,
  display_order INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  is_purchased BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gift_items ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view public gift items
CREATE POLICY "Anyone can view public gift items"
ON public.gift_items
FOR SELECT
TO anon, authenticated
USING (is_public = true);

-- Policy: Authorized users can manage gift items
CREATE POLICY "Authorized users can manage gift items"
ON public.gift_items
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'couple'::app_role) OR 
  has_role(auth.uid(), 'planner'::app_role)
);
-- Alterar tabela guests para usar phone como identificador único
-- Remover constraint unique de email (se existir) e tornar phone obrigatório e único

-- Primeiro, remover a constraint unique do email se existir
ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_email_key;

-- Tornar phone NOT NULL (primeiro precisamos garantir que todos os registros tenham phone)
-- Se houver registros sem phone, vamos precisar tratá-los
UPDATE public.guests SET phone = email WHERE phone IS NULL;

-- Agora tornar phone NOT NULL e UNIQUE
ALTER TABLE public.guests ALTER COLUMN phone SET NOT NULL;
ALTER TABLE public.guests ADD CONSTRAINT guests_phone_key UNIQUE (phone);

-- Email pode continuar existindo mas não precisa ser único
ALTER TABLE public.guests ALTER COLUMN email DROP NOT NULL;
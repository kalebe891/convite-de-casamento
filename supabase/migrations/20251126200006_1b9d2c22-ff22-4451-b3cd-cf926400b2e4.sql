-- Remover política antiga restritiva
DROP POLICY IF EXISTS "Anyone can view public gift items" ON gift_items;

-- Criar nova política que permite leitura pública de todos os presentes
CREATE POLICY "Anyone can view gift items"
ON gift_items
FOR SELECT
USING (true);
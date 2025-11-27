-- Remover política antiga que permite UPDATE livre
DROP POLICY IF EXISTS "Guests can update gifts to select them" ON gift_items;

-- Nova política: permite UPDATE apenas quando o convite não tem presente selecionado
CREATE POLICY "Guests can select gifts only once per token"
ON gift_items
FOR UPDATE
USING (
  selected_by_invitation_id IS NULL
)
WITH CHECK (
  selected_by_invitation_id IS NOT NULL
);
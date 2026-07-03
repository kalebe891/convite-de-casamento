/**
 * Helper centralizado para classificação de presentes por `gift_kind`.
 *
 * Fonte da verdade: coluna `gift_items.gift_kind` no banco.
 * Valores canônicos observados:
 *   - 'traditional' (padrão)
 *   - 'pix_manual'
 *
 * Toda a aplicação DEVE usar `isPixGift` para determinar se um presente é PIX.
 * Não espalhar comparações literais (`g.gift_kind === "pix_manual"`) pelo código.
 */

export const GIFT_KIND_PIX = "pix_manual" as const;
export const GIFT_KIND_TRADITIONAL = "traditional" as const;

export type GiftKind = typeof GIFT_KIND_PIX | typeof GIFT_KIND_TRADITIONAL;

export interface GiftKindLike {
  gift_kind?: string | null;
}

export const isPixGift = (gift: GiftKindLike | null | undefined): boolean =>
  gift?.gift_kind === GIFT_KIND_PIX;

export const isTraditionalGift = (gift: GiftKindLike | null | undefined): boolean =>
  !isPixGift(gift);

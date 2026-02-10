/**
 * Testes de integração para a RPC claim_gift (bulletproof edition)
 *
 * Cobre:
 * 1. Sucesso padrão + claimed_at preenchido
 * 2. Limite de 1 presente por guest (ALREADY_HAS_GIFT)
 * 3. Admin override (allow_multiple + claimed_via_admin)
 * 4. Presente ocupado (GIFT_UNAVAILABLE)
 * 5. Concorrência simultânea
 * 6. Admin NÃO burla concorrência de presente já ocupado
 * 7. Idempotência (mesma chamada 2x = sucesso sem duplicata)
 * 8. Unclaim limpa claimed_at e claimed_via_admin
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !serviceKey) {
  console.warn("⚠️ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY necessários. Testes ignorados.");
  Deno.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function createGuest(name: string): Promise<string> {
  const { data, error } = await supabase
    .from("guests")
    .insert({ name, phone: `+5511${Date.now()}` })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function createGift(name: string): Promise<string> {
  const { data, error } = await supabase
    .from("gift_items")
    .insert({ gift_name: name })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function cleanup(guestIds: string[], giftIds: string[]) {
  if (giftIds.length) await supabase.from("gift_items").delete().in("id", giftIds);
  if (guestIds.length) await supabase.from("guests").delete().in("id", guestIds);
}

Deno.test("claim_gift: sucesso + claimed_at preenchido", async () => {
  const guestId = await createGuest("Guest Sucesso");
  const giftId = await createGift("Presente Livre");
  try {
    const { data, error } = await supabase.rpc("claim_gift", {
      p_gift_id: giftId, p_guest_id: guestId, p_allow_multiple: false,
    });
    assertEquals(error, null);
    assertEquals(data[0].success, true);
    assertEquals(data[0].gift_name, "Presente Livre");

    // Verificar colunas de auditoria
    const { data: gift } = await supabase.from("gift_items").select("claimed_at, claimed_via_admin").eq("id", giftId).single();
    assertEquals(gift!.claimed_at !== null, true, "claimed_at deve estar preenchido");
    assertEquals(gift!.claimed_via_admin, false);
  } finally {
    await cleanup([guestId], [giftId]);
  }
});

Deno.test("claim_gift: convidado NÃO pode pegar dois presentes", async () => {
  const guestId = await createGuest("Guest Duplo");
  const g1 = await createGift("Presente A");
  const g2 = await createGift("Presente B");
  try {
    await supabase.rpc("claim_gift", { p_gift_id: g1, p_guest_id: guestId, p_allow_multiple: false });
    const { data } = await supabase.rpc("claim_gift", { p_gift_id: g2, p_guest_id: guestId, p_allow_multiple: false });
    assertEquals(data[0].success, false);
    assertEquals(data[0].error_code, "ALREADY_HAS_GIFT");
  } finally {
    await cleanup([guestId], [g1, g2]);
  }
});

Deno.test("claim_gift: admin pode atribuir múltiplos + claimed_via_admin=true", async () => {
  const guestId = await createGuest("Guest Admin");
  const g1 = await createGift("Admin Gift 1");
  const g2 = await createGift("Admin Gift 2");
  try {
    const { data: r1 } = await supabase.rpc("claim_gift", { p_gift_id: g1, p_guest_id: guestId, p_allow_multiple: true });
    assertEquals(r1[0].success, true);
    const { data: r2 } = await supabase.rpc("claim_gift", { p_gift_id: g2, p_guest_id: guestId, p_allow_multiple: true });
    assertEquals(r2[0].success, true);

    // Ambos devem ter claimed_via_admin = true
    const { data: gifts } = await supabase.from("gift_items").select("claimed_via_admin").in("id", [g1, g2]);
    assertEquals(gifts!.every((g: any) => g.claimed_via_admin === true), true);
  } finally {
    await cleanup([guestId], [g1, g2]);
  }
});

Deno.test("claim_gift: presente já ocupado retorna GIFT_UNAVAILABLE", async () => {
  const g1 = await createGuest("Guest Primeiro");
  const g2 = await createGuest("Guest Segundo");
  const gift = await createGift("Presente Disputado");
  try {
    await supabase.rpc("claim_gift", { p_gift_id: gift, p_guest_id: g1, p_allow_multiple: false });
    const { data } = await supabase.rpc("claim_gift", { p_gift_id: gift, p_guest_id: g2, p_allow_multiple: false });
    assertEquals(data[0].success, false);
    assertEquals(data[0].error_code, "GIFT_UNAVAILABLE");
  } finally {
    await cleanup([g1, g2], [gift]);
  }
});

Deno.test("claim_gift: concorrência - apenas um convidado vence", async () => {
  const g1 = await createGuest("Concorrente 1");
  const g2 = await createGuest("Concorrente 2");
  const gift = await createGift("Presente Concorrido");
  try {
    const [r1, r2] = await Promise.all([
      supabase.rpc("claim_gift", { p_gift_id: gift, p_guest_id: g1, p_allow_multiple: false }),
      supabase.rpc("claim_gift", { p_gift_id: gift, p_guest_id: g2, p_allow_multiple: false }),
    ]);
    const successes = [r1.data![0].success, r2.data![0].success].filter(Boolean);
    assertEquals(successes.length, 1, "Exatamente 1 convidado deve conseguir o presente");
  } finally {
    await cleanup([g1, g2], [gift]);
  }
});

Deno.test("claim_gift: admin override NÃO burla concorrência de presente ocupado", async () => {
  const g1 = await createGuest("Guest Ocupou");
  const g2 = await createGuest("Guest Admin Tentou");
  const gift = await createGift("Presente Ocupado");
  try {
    await supabase.rpc("claim_gift", { p_gift_id: gift, p_guest_id: g1, p_allow_multiple: false });
    const { data } = await supabase.rpc("claim_gift", { p_gift_id: gift, p_guest_id: g2, p_allow_multiple: true });
    assertEquals(data[0].success, false);
    assertEquals(data[0].error_code, "GIFT_UNAVAILABLE");
  } finally {
    await cleanup([g1, g2], [gift]);
  }
});

Deno.test("claim_gift: idempotência - mesma chamada 2x retorna sucesso sem duplicata", async () => {
  const guestId = await createGuest("Guest Idempotente");
  const giftId = await createGift("Presente Idempotente");
  try {
    const { data: r1 } = await supabase.rpc("claim_gift", { p_gift_id: giftId, p_guest_id: guestId, p_allow_multiple: false });
    assertEquals(r1[0].success, true);
    const { data: r2 } = await supabase.rpc("claim_gift", { p_gift_id: giftId, p_guest_id: guestId, p_allow_multiple: false });
    assertEquals(r2[0].success, true);
    assertEquals(r2[0].gift_name, "Presente Idempotente");
  } finally {
    await cleanup([guestId], [giftId]);
  }
});

Deno.test("unclaim_gift: limpa claimed_at e claimed_via_admin", async () => {
  const guestId = await createGuest("Guest Unclaim");
  const giftId = await createGift("Presente Unclaim");
  try {
    await supabase.rpc("claim_gift", { p_gift_id: giftId, p_guest_id: guestId, p_allow_multiple: false });
    await supabase.rpc("unclaim_gift", { p_guest_id: guestId });
    const { data: gift } = await supabase.from("gift_items").select("selected_by_guest_id, claimed_at, claimed_via_admin").eq("id", giftId).single();
    assertEquals(gift!.selected_by_guest_id, null);
    assertEquals(gift!.claimed_at, null);
    assertEquals(gift!.claimed_via_admin, false);
  } finally {
    await cleanup([guestId], [giftId]);
  }
});

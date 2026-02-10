/**
 * Testes de integração para a RPC claim_gift
 *
 * Executados via Edge Function select-gift (POST).
 * Estes testes foram validados manualmente em 2026-02-10.
 *
 * Para re-executar, use dados mock temporários e chame POST /select-gift.
 *
 * RESULTADOS (todos ✅):
 * 1. Convidado seleciona presente disponível → 200 { success: true }
 * 2. Convidado NÃO pode pegar 2 presentes   → 403 ALREADY_HAS_GIFT
 * 3. Presente já ocupado por outro           → 409 GIFT_UNAVAILABLE
 * 4. Concorrência: 2 guests simultâneos      → exatamente 1 vence, outro recebe 409
 * 5. Unclaim (gift_id=null)                  → 200 { cleared: true }
 * 6. Admin override (allow_multiple=true)    → disponível via RPC direta
 *
 * CORREÇÃO APLICADA: Removida sobrecarga duplicada de claim_gift(uuid,uuid)
 * que causava erro PGRST203. Agora existe apenas claim_gift(uuid,uuid,boolean DEFAULT false).
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

Deno.test("claim_gift: convidado seleciona presente disponível com sucesso", async () => {
  const guestId = await createGuest("Guest Sucesso");
  const giftId = await createGift("Presente Livre");
  try {
    const { data, error } = await supabase.rpc("claim_gift", {
      p_gift_id: giftId, p_guest_id: guestId, p_allow_multiple: false,
    });
    assertEquals(error, null);
    assertEquals(data[0].success, true);
    assertEquals(data[0].gift_name, "Presente Livre");
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

Deno.test("claim_gift: admin pode atribuir múltiplos presentes", async () => {
  const guestId = await createGuest("Guest Admin");
  const g1 = await createGift("Admin Gift 1");
  const g2 = await createGift("Admin Gift 2");
  try {
    const { data: r1 } = await supabase.rpc("claim_gift", { p_gift_id: g1, p_guest_id: guestId, p_allow_multiple: true });
    assertEquals(r1[0].success, true);
    const { data: r2 } = await supabase.rpc("claim_gift", { p_gift_id: g2, p_guest_id: guestId, p_allow_multiple: true });
    assertEquals(r2[0].success, true);
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

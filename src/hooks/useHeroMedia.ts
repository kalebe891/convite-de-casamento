import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook compartilhado para dados de mídia do Hero (foto principal + horário
 * do primeiro evento). Extraído para permitir que variantes visuais do Hero
 * consumam os mesmos dados sem replicar fetches.
 */
export function useHeroMedia(weddingId: string | undefined | null) {
  const [mainPhoto, setMainPhoto] = useState<string | null>(null);
  const [firstEventTime, setFirstEventTime] = useState<string | null>(null);

  useEffect(() => {
    if (!weddingId) return;

    let cancelled = false;
    (async () => {
      const [photoRes, timelineRes] = await Promise.all([
        supabase
          .from("photos")
          .select("photo_url")
          .eq("wedding_id", weddingId)
          .eq("is_main", true)
          .maybeSingle(),
        supabase
          .from("timeline_events")
          .select("time")
          .eq("wedding_id", weddingId)
          .eq("is_public", true)
          .order("display_order", { ascending: true })
          .limit(1),
      ]);

      if (cancelled) return;
      if (!photoRes.error && photoRes.data) setMainPhoto(photoRes.data.photo_url);
      if (!timelineRes.error && timelineRes.data?.[0])
        setFirstEventTime(timelineRes.data[0].time);
    })();

    return () => {
      cancelled = true;
    };
  }, [weddingId]);

  return { mainPhoto, firstEventTime };
}

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WeddingContextMode = "public" | "admin";

export type WeddingDetails = Tables<"wedding_details">;
export type UserWedding = Tables<"user_weddings"> & {
  wedding?: WeddingDetails | null;
};

interface WeddingContextType {
  mode: WeddingContextMode;
  weddingId: string | null;
  wedding: WeddingDetails | null;
  slug: string | null;
  eventType: string | null;
  themeId: string | null;
  userWeddings: UserWedding[];
  loading: boolean;
  error: string | null;
  setCurrentWedding: (id: string) => void;
}

const WeddingContext = createContext<WeddingContextType | undefined>(undefined);

interface ProviderProps {
  mode: WeddingContextMode;
  children: ReactNode;
}

export const WeddingProvider = ({ mode, children }: ProviderProps) => {
  const params = useParams<{ slug?: string }>();
  const routeSlug = params.slug ?? null;

  const [wedding, setWedding] = useState<WeddingDetails | null>(null);
  const [userWeddings, setUserWeddings] = useState<UserWedding[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Public mode: resolve by slug from URL ----
  useEffect(() => {
    if (mode !== "public") return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      if (!routeSlug) {
        if (!cancelled) {
          setWedding(null);
          setActiveId(null);
          setError("missing_slug");
          setLoading(false);
        }
        return;
      }

      const { data, error: qErr } = await supabase
        .from("wedding_details")
        .select("*")
        .eq("slug", routeSlug)
        .maybeSingle();

      if (cancelled) return;

      if (qErr) {
        setError(qErr.message);
        setWedding(null);
        setActiveId(null);
      } else if (!data) {
        setError("not_found");
        setWedding(null);
        setActiveId(null);
      } else {
        setWedding(data);
        setActiveId(data.id);
      }
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [mode, routeSlug]);

  // ---- Admin mode: resolve by logged-in user's user_weddings ----
  useEffect(() => {
    if (mode !== "admin") return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setUserWeddings([]);
          setWedding(null);
          setActiveId(null);
          setError("not_authenticated");
          setLoading(false);
        }
        return;
      }

      // get_user_wedding_ids returns SETOF uuid considering admin role.
      const { data: idsData, error: idsErr } = await supabase.rpc(
        "get_user_wedding_ids",
        { _user_id: user.id }
      );

      if (cancelled) return;
      if (idsErr) {
        setError(idsErr.message);
        setLoading(false);
        return;
      }

      const ids = (idsData ?? [])
        .map((row: any) => (typeof row === "string" ? row : row.get_user_wedding_ids))
        .filter(Boolean);

      if (ids.length === 0) {
        setUserWeddings([]);
        setWedding(null);
        setActiveId(null);
        setError("no_wedding_access");
        setLoading(false);
        return;
      }

      const { data: weddings, error: wErr } = await supabase
        .from("wedding_details")
        .select("*")
        .in("id", ids);

      if (cancelled) return;
      if (wErr) {
        setError(wErr.message);
        setLoading(false);
        return;
      }

      // Build link list (no role info available from RPC; placeholder rows)
      const links: UserWedding[] = (weddings ?? []).map((w) => ({
        id: w.id,
        user_id: user.id,
        wedding_id: w.id,
        role: "member",
        created_at: null as unknown as string,
        wedding: w,
      }));

      setUserWeddings(links);

      // Auto-select: persisted choice if still valid, else first
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem("active_wedding_id")
          : null;
      const chosen =
        stored && weddings?.some((w) => w.id === stored)
          ? stored
          : weddings && weddings.length > 0
          ? weddings[0].id
          : null;

      setActiveId(chosen);
      setWedding(weddings?.find((w) => w.id === chosen) ?? null);
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const setCurrentWedding = useCallback(
    (id: string) => {
      const next = userWeddings.find((uw) => uw.wedding_id === id)?.wedding ?? null;
      setActiveId(id);
      setWedding(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("active_wedding_id", id);
      }
    },
    [userWeddings]
  );

  const value: WeddingContextType = {
    mode,
    weddingId: activeId,
    wedding,
    slug: wedding?.slug ?? routeSlug,
    eventType: wedding?.event_type ?? null,
    themeId: wedding?.theme_id ?? null,
    userWeddings,
    loading,
    error,
    setCurrentWedding,
  };

  return (
    <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>
  );
};

export const useWedding = (): WeddingContextType => {
  const ctx = useContext(WeddingContext);
  if (!ctx) {
    throw new Error("useWedding must be used inside <WeddingProvider>");
  }
  return ctx;
};

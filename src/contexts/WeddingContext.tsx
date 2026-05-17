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
import { isReservedSlug, isValidRouteEventType, urlToDb } from "@/lib/eventType";

export type WeddingContextMode = "public" | "admin" | "tenant-admin";

export type WeddingError =
  | "invalid_event_type"
  | "reserved_slug"
  | "not_found"
  | "unauthenticated"
  | "access_denied"
  | "missing_slug"
  | "no_wedding_access"
  | "unexpected_error"
  | string;

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
  error: WeddingError | null;
  setCurrentWedding: (id: string) => void;
}

const WeddingContext = createContext<WeddingContextType | undefined>(undefined);

interface ProviderProps {
  mode: WeddingContextMode;
  children: ReactNode;
}

export const WeddingProvider = ({ mode, children }: ProviderProps) => {
  const params = useParams<{ slug?: string; eventType?: string }>();
  const routeSlug = params.slug ?? null;
  const routeEventType = params.eventType ?? null;

  const [wedding, setWedding] = useState<WeddingDetails | null>(null);
  const [userWeddings, setUserWeddings] = useState<UserWedding[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<WeddingError | null>(null);

  // ---- Public / Tenant-Admin: resolve by slug + event_type ----
  useEffect(() => {
    if (mode !== "public" && mode !== "tenant-admin") return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setWedding(null);
      setActiveId(null);

      if (!routeSlug) {
        if (!cancelled) {
          setError("missing_slug");
          setLoading(false);
        }
        return;
      }

      if (!isValidRouteEventType(routeEventType)) {
        if (!cancelled) {
          setError("invalid_event_type");
          setLoading(false);
        }
        return;
      }

      if (isReservedSlug(routeSlug)) {
        if (!cancelled) {
          setError("reserved_slug");
          setLoading(false);
        }
        return;
      }

      const dbEventType = urlToDb(routeEventType)!;

      const { data, error: qErr } = await supabase
        .from("wedding_details")
        .select("*")
        .eq("slug", routeSlug)
        .eq("event_type", dbEventType)
        .maybeSingle();

      if (cancelled) return;

      if (qErr) {
        setError("unexpected_error");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("not_found");
        setLoading(false);
        return;
      }

      // tenant-admin: validate auth + access
      if (mode === "tenant-admin") {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          setError("unauthenticated");
          setLoading(false);
          return;
        }

        const { data: hasAccess, error: accessErr } = await supabase.rpc(
          "user_has_wedding_access",
          { _user_id: user.id, _wedding_id: data.id }
        );

        if (cancelled) return;

        if (accessErr) {
          setError("unexpected_error");
          setLoading(false);
          return;
        }

        if (!hasAccess) {
          setError("access_denied");
          setLoading(false);
          return;
        }
      }

      setWedding(data);
      setActiveId(data.id);
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [mode, routeSlug, routeEventType]);

  // ---- Admin (Master) mode: resolve by logged-in user's weddings ----
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
          setError("unauthenticated");
          setLoading(false);
        }
        return;
      }

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

      const links: UserWedding[] = (weddings ?? []).map((w) => ({
        id: w.id,
        user_id: user.id,
        wedding_id: w.id,
        role: "member",
        created_at: null as unknown as string,
        wedding: w,
      }));

      setUserWeddings(links);

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

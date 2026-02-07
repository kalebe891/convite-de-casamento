import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook que busca todos os role_keys cadastrados na tabela role_profiles.
 * Usado para permitir acesso dinâmico ao painel admin para qualquer papel criado.
 */
export const useAllRoles = () => {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from("role_profiles")
          .select("role_key");

        if (error) {
          console.error("❌ [useAllRoles] Error fetching roles:", error);
          setRoles(["admin"]);
        } else {
          const keys = (data || []).map((r) => r.role_key);
          setRoles(keys.length > 0 ? keys : ["admin"]);
        }
      } catch (err) {
        console.error("❌ [useAllRoles] Exception:", err);
        setRoles(["admin"]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  return { roles, loading };
};

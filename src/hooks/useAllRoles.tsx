import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook que busca todos os role_keys cadastrados na tabela role_profiles.
 * Usado para permitir acesso dinâmico ao painel admin para qualquer papel criado.
 *
 * Etapa 1.28.02 — também expõe os labels oficiais (`roleLabels`) para que a UI
 * nunca precise mapear papéis literais (admin/couple/planner) em código.
 */
export const useAllRoles = () => {
  const [roles, setRoles] = useState<string[]>([]);
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from("role_profiles")
          .select("role_key, role_label");

        if (error) {
          console.error("❌ [useAllRoles] Error fetching roles:", error);
          setRoles(["admin"]);
        } else {
          const rows = data || [];
          const keys = rows.map((r) => r.role_key);
          setRoles(keys.length > 0 ? keys : ["admin"]);
          setRoleLabels(
            rows.reduce<Record<string, string>>((acc, r) => {
              acc[r.role_key] = r.role_label ?? r.role_key;
              return acc;
            }, {})
          );
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

  return { roles, roleLabels, loading };
};

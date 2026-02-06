import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import UsersManager from "@/components/admin/UsersManager";
import { usePagePermissions } from "@/hooks/usePagePermissions";

const Usuarios = () => {
  const permissions = usePagePermissions("usuarios");
  const [roleProfiles, setRoleProfiles] = useState<Array<{ role_key: string; role_label: string }>>([]);

  useEffect(() => {
    fetchRoleProfiles();
  }, []);

  const fetchRoleProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("role_profiles")
        .select("role_key, role_label")
        .order("is_system", { ascending: false })
        .order("role_label");

      if (error) throw error;
      setRoleProfiles(data || []);
    } catch (error: any) {
      console.error("Error fetching role profiles:", error);
    }
  };

  if (permissions.loading) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Gerenciar Usuários</h1>
        <p className="text-muted-foreground mt-2">
          Convide e gerencie administradores, membros do casal e cerimonialistas
        </p>
      </div>
      
      <UsersManager 
        roleProfiles={roleProfiles}
        onRoleProfilesChange={fetchRoleProfiles}
        permissions={permissions}
      />
    </div>
  );
};

export default Usuarios;

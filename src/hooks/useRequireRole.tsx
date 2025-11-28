import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "./useAuth";

/**
 * Hook que garante que o usuário tem o papel necessário.
 * Redireciona para /auth se não estiver logado.
 * Redireciona para /acesso-negado se não tiver permissão.
 */
export const useRequireRole = (requiredRole: string | string[]) => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Não autenticado
        navigate("/auth", { replace: true });
      } else if (role !== null) {
        // Verificar se tem permissão
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        
        if (!allowedRoles.includes(role)) {
          // Não tem permissão
          navigate("/acesso-negado", { replace: true });
        }
      }
    }
  }, [user, role, loading, navigate, requiredRole]);

  return { user, role, loading };
};

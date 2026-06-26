import { useAuthorization } from "./useAuthorization";
import { useAuth } from "./useAuth";

/**
 * Hook utilitário para checar se o usuário possui role global "admin".
 * Master Admin = role === "admin" na tabela user_roles.
 *
 * Desde a Etapa 1.24.00 delega para `useAuthorization` (camada centralizada).
 * Mantido para retrocompatibilidade dos componentes existentes.
 */
export const useIsGlobalAdmin = () => {
  const { user } = useAuth();
  const { loading, isGlobalAdmin } = useAuthorization();
  return {
    loading,
    user,
    isGlobalAdmin,
  };
};

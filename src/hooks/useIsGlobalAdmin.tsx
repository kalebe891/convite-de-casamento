import { useAuth } from "./useAuth";

/**
 * Hook utilitário para checar se o usuário possui role global "admin".
 * Master Admin = role === "admin" na tabela user_roles.
 */
export const useIsGlobalAdmin = () => {
  const { user, role, loading } = useAuth();
  return {
    loading,
    user,
    isGlobalAdmin: role === "admin",
  };
};

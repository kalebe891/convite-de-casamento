/**
 * Sanitizes database error messages to prevent information leakage
 * @param error - The error object from Supabase or other sources
 * @returns A safe, user-friendly error message
 */
export function getSafeErrorMessage(error: any): string {
  const errorMsg = error?.message?.toLowerCase() || '';
  
  // Log full error server-side for debugging (only visible in dev console)
  if (process.env.NODE_ENV === 'development') {
    console.error('Database error:', error);
  }
  
  // Map technical errors to user-friendly messages
  if (errorMsg.includes('duplicate') || errorMsg.includes('unique constraint')) {
    return 'Este item já existe no sistema.';
  }
  
  if (errorMsg.includes('foreign key') || errorMsg.includes('violates')) {
    return 'Operação inválida devido a dependências.';
  }
  
  if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
    return 'Você não tem permissão para esta operação.';
  }
  
  if (errorMsg.includes('not found') || errorMsg.includes('no rows')) {
    return 'Registro não encontrado.';
  }
  
  if (errorMsg.includes('invalid') || errorMsg.includes('malformed')) {
    return 'Dados inválidos fornecidos.';
  }
  
  // Generic fallback for any other database errors
  return 'Erro ao processar operação. Tente novamente.';
}

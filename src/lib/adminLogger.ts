import { supabase } from "@/integrations/supabase/client";

interface LogParams {
  action:
    | 'insert'
    | 'update'
    | 'delete'
    | 'checkin'
    | 'undo_checkin'
    | 'gift_received'
    | 'gift_cancelled'
   | 'TENANT_RENEWED'
   | 'TENANT_ARCHIVED'
   | 'TENANT_RESTORED'
   | 'THEME_CORRECTED';
  tableName: string;
  recordId?: string;
  oldData?: any;
  newData?: any;
  affectedName?: string;
  /** Optional explicit wedding id. Falls back to the active tenant stored in localStorage. */
  weddingId?: string | null;
}

const resolveWeddingId = (explicit?: string | null): string | null => {
  if (explicit) return explicit;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("active_wedding_id");
  } catch {
    return null;
  }
};

export const logAdminAction = async ({
  action,
  tableName,
  recordId,
  oldData,
  newData,
  affectedName,
  weddingId,
}: LogParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const wid = resolveWeddingId(weddingId);

    await supabase.from("admin_logs").insert({
      user_id: user.id,
      user_email: user.email,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData || null,
      new_data: newData || null,
      affected_name: affectedName || null,
      wedding_id: wid,
    });
  } catch (error) {
    console.error("Error logging admin action:", error);
  }
};

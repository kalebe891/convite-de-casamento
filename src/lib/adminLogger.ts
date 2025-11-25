import { supabase } from "@/integrations/supabase/client";

interface LogParams {
  action: 'insert' | 'update' | 'delete';
  tableName: string;
  recordId?: string;
  oldData?: any;
  newData?: any;
}

export const logAdminAction = async ({
  action,
  tableName,
  recordId,
  oldData,
  newData,
}: LogParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await supabase.from("admin_logs").insert({
      user_id: user.id,
      user_email: user.email,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData || null,
      new_data: newData || null,
    });
  } catch (error) {
    console.error("Error logging admin action:", error);
  }
};

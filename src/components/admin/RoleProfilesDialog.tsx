import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2, Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import RolePermissionsManager from "./RolePermissionsManager";

interface RoleProfile {
  id: string;
  role_key: string;
  role_label: string;
  is_system: boolean;
}

interface RoleProfilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleChange: () => void;
}

const RoleProfilesDialog = ({ open, onOpenChange, onRoleChange }: RoleProfilesDialogProps) => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleProfile | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ role_key: "", role_label: "" });
  const [viewingPermissionsRole, setViewingPermissionsRole] = useState<RoleProfile | null>(null);

  useEffect(() => {
    if (open) {
      fetchRoles();
    }
  }, [open]);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("role_profiles")
        .select("*")
        .order("is_system", { ascending: false })
        .order("role_label");

      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      console.error("Error fetching roles:", error);
      toast({
        title: "Erro ao carregar papéis",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingRole) {
        // Update existing role
        const { error } = await supabase
          .from("role_profiles")
          .update({
            role_key: formData.role_key,
            role_label: formData.role_label,
          })
          .eq("id", editingRole.id);

        if (error) throw error;

        toast({
          title: "Papel atualizado!",
          description: "O papel foi atualizado com sucesso.",
        });
      } else {
        // Create new role
        const { error } = await supabase
          .from("role_profiles")
          .insert({
            role_key: formData.role_key,
            role_label: formData.role_label,
            is_system: false,
          });

        if (error) throw error;

        toast({
          title: "Papel criado!",
          description: "O novo papel foi criado com sucesso.",
        });
      }

      setFormData({ role_key: "", role_label: "" });
      setEditingRole(null);
      fetchRoles();
      onRoleChange();
    } catch (error: any) {
      console.error("Error saving role:", error);
      toast({
        title: "Erro ao salvar papel",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (role: RoleProfile) => {
    setViewingPermissionsRole(null);
    setEditingRole(role);
    setFormData({ role_key: role.role_key, role_label: role.role_label });
  };

  const handleViewPermissions = (role: RoleProfile) => {
    setEditingRole(null);
    setViewingPermissionsRole(role);
  };

  const handleDelete = async (roleId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("role_profiles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast({
        title: "Papel excluído!",
        description: "O papel foi excluído com sucesso.",
      });

      fetchRoles();
      onRoleChange();
      setDeletingRoleId(null);
    } catch (error: any) {
      console.error("Error deleting role:", error);
      toast({
        title: "Erro ao excluir papel",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ role_key: "", role_label: "" });
    setEditingRole(null);
    setViewingPermissionsRole(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Papéis do Sistema</DialogTitle>
            <DialogDescription>
              Crie, edite ou exclua papéis customizados para o sistema.
            </DialogDescription>
          </DialogHeader>

          {viewingPermissionsRole ? (
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewingPermissionsRole(null)}
              >
                Voltar
              </Button>
              <RolePermissionsManager
                roleKey={viewingPermissionsRole.role_key}
                roleLabel={viewingPermissionsRole.role_label}
              />
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role_key">Chave do Papel</Label>
                  <Input
                    id="role_key"
                    value={formData.role_key}
                    onChange={(e) => setFormData({ ...formData, role_key: e.target.value })}
                    placeholder="ex: photographer"
                    required
                    disabled={loading || editingRole?.role_key === 'admin'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Identificador único (apenas letras minúsculas e underscores)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role_label">Nome do Papel</Label>
                  <Input
                    id="role_label"
                    value={formData.role_label}
                    onChange={(e) => setFormData({ ...formData, role_label: e.target.value })}
                    placeholder="ex: Fotógrafo"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome que será exibido no sistema
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        {editingRole ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        {editingRole ? "Atualizar Papel" : "Criar Papel"}
                      </>
                    )}
                  </Button>
                  {editingRole && (
                    <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-3">Papéis Existentes</h3>
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{role.role_label}</p>
                        <p className="text-xs text-muted-foreground">
                          Chave: {role.role_key}
                          {role.is_system && " • Sistema"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPermissions(role)}
                          disabled={loading}
                          title="Gerenciar permissões"
                        >
                          <Shield className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(role)}
                          disabled={loading || role.role_key === 'admin'}
                          title={role.role_key === 'admin' ? "O papel de administrador não pode ser editado" : "Editar papel"}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingRoleId(role.id)}
                          disabled={loading || role.role_key === 'admin'}
                          title={role.role_key === 'admin' ? "O papel de administrador não pode ser excluído" : "Excluir papel"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRoleId} onOpenChange={() => setDeletingRoleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este papel? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRoleId && handleDelete(deletingRoleId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RoleProfilesDialog;
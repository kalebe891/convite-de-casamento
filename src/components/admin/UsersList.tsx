import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, UserCog, Users as UsersIcon, Trash2, Search, RefreshCw, Settings } from "lucide-react";
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
import RoleProfilesDialog from "./RoleProfilesDialog";

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
}

interface UserRole {
  role: string;
}

interface UserWithRole extends UserProfile {
  roles: UserRole[];
  isEditingName?: boolean;
  editNameValue?: string;
}

interface UsersListProps {
  refreshKey?: number;
  roleProfiles: Array<{ role_key: string; role_label: string }>;
  onRoleProfilesChange: () => void;
}

const UsersList = ({ refreshKey, roleProfiles, onRoleProfilesChange }: UsersListProps) => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles = (profiles || []).map((profile) => ({
        ...profile,
        roles: (userRoles || [])
          .filter((role) => role.user_id === profile.id)
          .map((role) => ({ role: role.role as string })),
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [refreshKey]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // Remove existing roles
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Add new role - cast to any to bypass TypeScript enum restriction
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole as any });

      if (insertError) throw insertError;

      toast({
        title: "Papel atualizado!",
        description: "O papel do usuário foi alterado com sucesso.",
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Erro ao atualizar papel",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: deleteUserId },
      });

      if (error) throw error;

      toast({
        title: "Usuário removido!",
        description: "O usuário foi removido completamente do sistema.",
      });

      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateName = async (userId: string) => {
    if (!editNameValue.trim()) {
      toast({
        title: "Nome inválido",
        description: "O nome não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editNameValue.trim() })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Nome atualizado!",
        description: "O nome do usuário foi alterado com sucesso.",
      });

      setEditingUserId(null);
      setEditNameValue("");
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating name:", error);
      toast({
        title: "Erro ao atualizar nome",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRegenerateToken = async (email: string, name: string) => {
    try {
      // Get user role first
      const user = users.find(u => u.email === email);
      if (!user || !user.roles[0]) {
        toast({
          title: "Erro",
          description: "Não foi possível identificar o papel do usuário.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: {
          email,
          nome: name,
          role: user.roles[0].role,
        },
      });

      if (error) throw error;

      toast({
        title: "Novo token gerado!",
        description: `Um novo link de acesso foi gerado e enviado para ${email}`,
      });
    } catch (error: any) {
      console.error("Error regenerating token:", error);
      toast({
        title: "Erro ao gerar token",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const getRoleLabel = (roleKey: string) => {
    const profile = roleProfiles.find(p => p.role_key === roleKey);
    return profile?.role_label || roleKey;
  };

  const getRoleColor = (roleKey: string): "destructive" | "default" | "secondary" | "outline" => {
    switch (roleKey) {
      case "admin":
        return "destructive";
      case "couple":
        return "default";
      case "planner":
      case "cerimonial":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-3 h-3" />;
      case "couple":
        return <UsersIcon className="w-3 h-3" />;
      case "planner":
      case "cerimonial":
        return <UserCog className="w-3 h-3" />;
      default:
        return <Settings className="w-3 h-3" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>Gerencie os usuários e suas permissões</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRoleDialogOpen(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Gerenciar Papéis
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado ainda."}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Papel Atual</TableHead>
                    <TableHead>Alterar Papel</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const currentRole = user.roles[0]?.role;
                    const isEditing = editingUserId === user.id;
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {isEditing ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                className="max-w-[200px]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateName(user.id);
                                  } else if (e.key === "Escape") {
                                    setEditingUserId(null);
                                    setEditNameValue("");
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleUpdateName(user.id)}
                              >
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingUserId(null);
                                  setEditNameValue("");
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="cursor-pointer hover:text-primary"
                              onClick={() => {
                                setEditingUserId(user.id);
                                setEditNameValue(user.full_name || "");
                              }}
                              title="Clique para editar"
                            >
                              {user.full_name || "Sem nome"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {currentRole ? (
                            <Badge variant={getRoleColor(currentRole)} className="gap-1">
                              {getRoleIcon(currentRole)}
                              {getRoleLabel(currentRole)}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sem papel</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={currentRole || ""}
                            onValueChange={(value) =>
                              handleRoleChange(user.id, value)
                            }
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Selecione um papel" />
                            </SelectTrigger>
                            <SelectContent>
                              {roleProfiles.map((profile) => (
                                <SelectItem key={profile.role_key} value={profile.role_key}>
                                  {profile.role_label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRegenerateToken(user.email || "", user.full_name || "")}
                              disabled={!user.email}
                              className="text-primary hover:text-primary"
                              title="Gerar novo token de acesso"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteUserId(user.id)}
                              className="text-destructive hover:text-destructive"
                              title="Remover usuário"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita e removerá permanentemente o usuário do sistema, incluindo todos os seus dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RoleProfilesDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        onRoleChange={onRoleProfilesChange}
      />
    </>
  );
};

export default UsersList;

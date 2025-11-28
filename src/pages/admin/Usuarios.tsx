import { useState } from "react";
import UsersManager from "@/components/admin/UsersManager";
import PermissionsManager from "@/components/admin/PermissionsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Usuarios = () => {
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Gerenciar Usuários</h1>
        <p className="text-muted-foreground mt-2">
          Convide e gerencie administradores, membros do casal e cerimonialistas
        </p>
      </div>
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="permissions" disabled={!selectedUser}>
            Permissões {selectedUser ? `- ${selectedUser.name}` : ""}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <UsersManager onSelectUser={setSelectedUser} />
        </TabsContent>
        
        <TabsContent value="permissions">
          {selectedUser && (
            <PermissionsManager 
              userId={selectedUser.id} 
              userName={selectedUser.name} 
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Usuarios;

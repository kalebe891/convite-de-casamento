import UsersManager from "@/components/admin/UsersManager";

const Usuarios = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold">Gerenciar Usuários</h1>
        <p className="text-muted-foreground mt-2">
          Convide e gerencie administradores, membros do casal e cerimonialistas
        </p>
      </div>
      
      <UsersManager />
    </div>
  );
};

export default Usuarios;

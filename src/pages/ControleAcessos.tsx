import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Shield, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserWithRole {
  id: string;
  nome: string;
  email: string | null;
  role: "admin" | "gestor" | "operador" | null;
}

const roleLabels: Record<string, { label: string; description: string; color: string }> = {
  admin: {
    label: "Diretoria / Administrativo",
    description: "Acesso completo a todas as áreas",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  gestor: {
    label: "Gestão de Operações",
    description: "Acesso a Clientes e Equipe",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  operador: {
    label: "Operacional",
    description: "Acesso a Clientes e Equipe",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
};

export default function ControleAcessos() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os profiles com suas roles
  const { data: usersWithRoles = [], isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      // Buscar profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .eq("ativo", true)
        .order("nome");

      if (profilesError) throw profilesError;

      // Buscar roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combinar dados
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      return (profiles || []).map(profile => ({
        ...profile,
        role: rolesMap.get(profile.id) as "admin" | "gestor" | "operador" | null,
      }));
    },
  });

  // Mutation para atualizar role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      // Primeiro, deletar role existente se houver
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Inserir nova role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole as "admin" | "gestor" | "operador" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "Acesso atualizado",
        description: "O nível de acesso do usuário foi alterado com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível alterar o nível de acesso.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = useMemo(() => {
    return usersWithRoles.filter(user =>
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [usersWithRoles, searchTerm]);

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Controle de Acessos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os níveis de acesso dos usuários do sistema
          </p>
        </div>

        {/* Legend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Níveis de Acesso
            </CardTitle>
            <CardDescription>
              Cada nível determina quais áreas do sistema o usuário pode visualizar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(roleLabels).map(([key, value]) => (
                <div key={key} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <Badge className={value.color}>{value.label}</Badge>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[250px]">Nível de Acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email || "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role || "operador"}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Diretoria / Administrativo
                              </span>
                            </SelectItem>
                            <SelectItem value="gestor">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                Gestão de Operações
                              </span>
                            </SelectItem>
                            <SelectItem value="operador">
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                Operacional
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

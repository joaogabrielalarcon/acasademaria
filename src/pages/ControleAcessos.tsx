import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Shield, Loader2, UserX, KeyRound } from "lucide-react";
import { CadastroAcessoButton, SenhaProvisoriaDialog, type SenhaGerada } from "@/components/acessos/CadastroAcesso";
import { invokeFunction } from "@/lib/invoke-function";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useIsAdmin, type AppRole, roleLabels } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserWithRole {
  id: string;
  nome: string;
  email: string | null;
  ativo: boolean;
  ultimo_acesso: string | null;
  role: AppRole | null;
}

const roleConfig: Record<AppRole, { color: string; description: string }> = {
  admin: {
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    description: "Acesso total a tudo sem exceção",
  },
  administrativo: {
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    description: "Orçamentos, clientes, fornecedores, projetos, salários",
  },
  gestao_campo: {
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    description: "Escala, diário, registros, máquinas, insumos",
  },
  responsavel_obra: {
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    description: "Projetos alocados, diário de obra, uploads",
  },
  operador_campo: {
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    description: "Somente a escala do dia",
  },
  arquitetura: {
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    description: "Projetos, memorial descritivo, sem valores financeiros",
  },
};

export default function ControleAcessos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [senhaGerada, setSenhaGerada] = useState<SenhaGerada | null>(null);
  const [acaoPendente, setAcaoPendente] = useState<{ tipo: "nova_senha" | "desativar"; userId: string; nome: string } | null>(null);
  const [acaoBusy, setAcaoBusy] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  const { data: usersWithRoles = [], isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, nome, email, ativo, ultimo_acesso")
        .order("nome");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      return (profiles || []).map(profile => ({
        ...profile,
        role: rolesMap.get(profile.id) as AppRole | null,
      }));
    },
    enabled: isAdmin,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({ title: "Acesso atualizado", description: "Nível de acesso alterado com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar", description: "Não foi possível alterar o acesso.", variant: "destructive" });
    },
  });


  const executarAcao = async () => {
    if (!acaoPendente) return;
    setAcaoBusy(true);
    const { data, error } = await invokeFunction<{ senha_provisoria?: string; expira_em?: string; username?: string | null }>(
      "admin-usuarios",
      { acao: acaoPendente.tipo, user_id: acaoPendente.userId },
    );
    setAcaoBusy(false);
    const alvo = acaoPendente;
    setAcaoPendente(null);
    if (error || !data) {
      toast({ title: "Não foi possível concluir", description: error ?? undefined, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
    if (alvo.tipo === "nova_senha" && data.senha_provisoria && data.expira_em) {
      toast({ title: "Nova senha provisória gerada", description: "A senha anterior deixou de valer." });
      setSenhaGerada({ nome: alvo.nome, username: data.username ?? null, senha: data.senha_provisoria, expiraEm: data.expira_em });
    } else {
      toast({ title: "Acesso desativado", description: `${alvo.nome} não consegue mais entrar.` });
    }
  };

  const filteredUsers = useMemo(() => {
    return usersWithRoles.filter(u => {
      const matchesSearch = u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = filterRole === "all" || u.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [usersWithRoles, searchTerm, filterRole]);

  // Redirect non-admins (after all hooks)
  if (!isAdmin && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Gestão de Usuários</h1>
            <p className="text-muted-foreground mt-1">Gerencie acessos e permissões do sistema</p>
          </div>
          <CadastroAcessoButton onSenha={setSenhaGerada} />
        </div>

        {/* Legend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Níveis de Acesso
            </CardTitle>
            <CardDescription>Cada nível determina quais áreas o usuário pode acessar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              {(Object.entries(roleConfig) as [AppRole, typeof roleConfig[AppRole]][]).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1 p-3 rounded-lg border bg-card">
                        <Badge className={value.color}>{roleLabels[key]}</Badge>
                  <p className="text-xs text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              {(Object.entries(roleLabels) as [AppRole, string][]).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[220px]">Nível de Acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(u => (
                    <TableRow key={u.id} className={!u.ativo ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email?.endsWith("@usuarios.mfm.local") ? "Sem e-mail" : u.email || "Sem e-mail"}</TableCell>
                      <TableCell>
                        <Select
                          value={u.role || "operador_campo"}
                          onValueChange={v => updateRoleMutation.mutate({ userId: u.id, newRole: v as AppRole })}
                          disabled={updateRoleMutation.isPending || u.id === user?.id}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(roleLabels) as [AppRole, string][]).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${roleConfig[key].color.split(" ")[0]}`} />
                                  {label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.ativo ? "default" : "secondary"}>
                          {u.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.ultimo_acesso
                          ? format(new Date(u.ultimo_acesso), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "Ainda não entrou"}
                      </TableCell>
                      <TableCell>
                        {u.id !== user?.id && u.role !== "admin" && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setAcaoPendente({ tipo: "nova_senha", userId: u.id, nome: u.nome })}
                              title="Gerar nova senha provisória"
                              aria-label="Gerar nova senha provisória"
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                            {u.ativo && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setAcaoPendente({ tipo: "desativar", userId: u.id, nome: u.nome })}
                                title="Desativar acesso"
                                aria-label="Desativar acesso"
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <SenhaProvisoriaDialog dados={senhaGerada} onClose={() => setSenhaGerada(null)} />
      <AlertDialog open={!!acaoPendente} onOpenChange={(o) => !o && !acaoBusy && setAcaoPendente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {acaoPendente?.tipo === "nova_senha" ? "Gerar nova senha provisória?" : "Desativar acesso?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {acaoPendente?.tipo === "nova_senha"
                ? `A senha atual de ${acaoPendente?.nome} deixa de valer. A nova aparece uma vez e precisa ser trocada no primeiro acesso.`
                : `${acaoPendente?.nome} não vai mais conseguir entrar no sistema nem no conector. Para reativar, gere uma nova senha provisória.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acaoBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); executarAcao(); }} disabled={acaoBusy}>
              {acaoBusy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {acaoPendente?.tipo === "nova_senha" ? "Gerar senha" : "Desativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

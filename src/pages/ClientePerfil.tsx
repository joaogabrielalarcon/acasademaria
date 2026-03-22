import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  FolderKanban,
  Phone,
  Mail,
  Calendar,
  Plus,
  Pencil,
  Building2,
  FileText,
  User,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FeedCliente } from "@/components/FeedCliente";
import { useToast } from "@/hooks/use-toast";
import { useCliente } from "@/hooks/useCliente";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useProjetosCliente, projetoStatusConfig } from "@/hooks/useProjetos";
import { useLocaisCliente, useSaveLocal, useDeleteLocal } from "@/hooks/useLocaisCliente";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-primary/20 text-primary border-primary/30" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-muted" },
  prospecto: { label: "Prospecto", className: "bg-primary/10 text-primary/80 border-primary/20" },
};

// Local form modal
function LocalFormDialog({
  open,
  onOpenChange,
  clienteId,
  existingLocal,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string;
  existingLocal?: any;
}) {
  const [form, setForm] = useState({
    nome: existingLocal?.nome || "",
    endereco_completo: existingLocal?.endereco_completo || "",
    cnpj: existingLocal?.cnpj || "",
    assessores: existingLocal?.assessores || "",
    funcionarios_casa: existingLocal?.funcionarios_casa || "",
    observacoes: existingLocal?.observacoes || "",
  });
  const saveLocal = useSaveLocal();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast({ title: "Nome do local é obrigatório", variant: "destructive" });
      return;
    }
    saveLocal.mutate(
      {
        id: existingLocal?.id,
        cliente_id: clienteId,
        nome: form.nome.trim(),
        endereco_completo: form.endereco_completo || null,
        cnpj: form.cnpj || null,
        assessores: form.assessores || null,
        funcionarios_casa: form.funcionarios_casa || null,
        observacoes: form.observacoes || null,
      } as any,
      {
        onSuccess: () => {
          toast({ title: existingLocal ? "Local atualizado" : "Local criado" });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Erro ao salvar", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {existingLocal ? "Editar Local" : "Novo Local"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Local *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder='Ex: "Casa Boituva", "Apartamento SP"'
            />
          </div>
          <div className="space-y-2">
            <Label>Endereço Completo</Label>
            <Input
              value={form.endereco_completo}
              onChange={(e) => setForm((f) => ({ ...f, endereco_completo: e.target.value }))}
              placeholder="Rua, número, bairro, cidade - UF"
            />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input
              value={form.cnpj}
              onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div className="space-y-2">
            <Label>Assessores</Label>
            <Textarea
              value={form.assessores}
              onChange={(e) => setForm((f) => ({ ...f, assessores: e.target.value }))}
              placeholder="Lista de assessores deste local"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Funcionários da Casa</Label>
            <Textarea
              value={form.funcionarios_casa}
              onChange={(e) => setForm((f) => ({ ...f, funcionarios_casa: e.target.value }))}
              placeholder="Lista de funcionários do local"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="terracota" disabled={saveLocal.isPending}>
              {saveLocal.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Local card with expandable projects
function LocalCard({
  local,
  clienteId,
  isAdmin,
}: {
  local: any;
  clienteId: string;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const deleteLocal = useDeleteLocal();
  const { toast } = useToast();

  // Fetch projects for this local
  const { data: projetos = [] } = useQuery({
    queryKey: ["projetos-local", local.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, titulo, status, tipo, data_previsao, valor_total, created_at")
        .eq("local_id", local.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: expanded,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <>
      <div className="card-botanical overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 text-left flex items-center justify-between hover:bg-primary/5 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              {local.nome}
            </h3>
            {local.endereco_completo && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {local.endereco_completo}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {projetos.length || "0"} projetos
            </Badge>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-primary/10 p-4 space-y-4">
            {/* Local details */}
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              {local.cnpj && (
                <div>
                  <span className="text-muted-foreground">CNPJ:</span>{" "}
                  <span className="text-foreground">{local.cnpj}</span>
                </div>
              )}
              {local.assessores && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Assessores:</span>{" "}
                  <span className="text-foreground">{local.assessores}</span>
                </div>
              )}
              {local.funcionarios_casa && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Funcionários da Casa:</span>{" "}
                  <span className="text-foreground">{local.funcionarios_casa}</span>
                </div>
              )}
              {local.observacoes && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Observações:</span>{" "}
                  <span className="text-foreground">{local.observacoes}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirm(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Excluir
                </Button>
              )}
            </div>

            {/* Projects section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-display font-semibold text-foreground text-sm uppercase tracking-wide">
                  Projetos
                </h4>
                {isAdmin && (
                  <Button variant="terracota" size="sm" asChild>
                    <Link to={`/projetos/novo?cliente_id=${clienteId}&local_id=${local.id}`}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Novo Projeto
                    </Link>
                  </Button>
                )}
              </div>

              {projetos.length > 0 ? (
                <div className="space-y-2">
                  {projetos.map((projeto: any) => {
                    const statusInfo =
                      projetoStatusConfig[projeto.status] || projetoStatusConfig.orcamento;
                    return (
                      <Link
                        key={projeto.id}
                        to={`/projetos/${projeto.id}`}
                        className="block p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{projeto.titulo}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={statusInfo.className}>
                                {statusInfo.label}
                              </Badge>
                              {projeto.data_previsao && (
                                <span className="text-xs text-muted-foreground">
                                  Prev: {new Date(projeto.data_previsao + "T12:00:00").toLocaleDateString("pt-BR")}
                                </span>
                              )}
                            </div>
                          </div>
                          {projeto.valor_total > 0 && (
                            <span className="text-sm font-semibold text-primary">
                              {formatCurrency(projeto.valor_total)}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum projeto neste local</p>
              )}
            </div>
          </div>
        )}
      </div>

      {editOpen && (
        <LocalFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          clienteId={clienteId}
          existingLocal={local}
        />
      )}

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir local?</AlertDialogTitle>
            <AlertDialogDescription>
              O local "{local.nome}" será removido permanentemente junto com a vinculação dos projetos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteLocal.mutate(local.id, {
                  onSuccess: () => toast({ title: "Local excluído" }),
                  onError: () =>
                    toast({ title: "Erro ao excluir", variant: "destructive" }),
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ClientePerfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);

  const [clienteToDelete, setClienteToDelete] = useState(false);
  const [localFormOpen, setLocalFormOpen] = useState(false);

  const { data: cliente, isLoading: loadingCliente, error: clienteError } = useCliente(id);
  const { data: locais = [], isLoading: loadingLocais } = useLocaisCliente(id);
  const { data: projetos = [] } = useProjetosCliente(id);

  // Delete client mutation
  const deleteClienteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({ title: "Cliente excluído" });
      navigate("/clientes");
    },
    onError: () => {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    },
  });

  if (loadingCliente) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (clienteError || !cliente) {
    return (
      <AppLayout>
        <Link
          to="/clientes"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Clientes</span>
        </Link>
        <div className="empty-state py-24">
          <h3 className="font-display text-xl font-semibold mb-2 text-foreground">
            Cliente não encontrado
          </h3>
          <Button variant="terracota" asChild>
            <Link to="/clientes">Ver todos os clientes</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const status = statusConfig[cliente.status] || statusConfig.ativo;

  // Projects not linked to any local (legacy)
  const projetosSemLocal = projetos.filter((p: any) => !p.local_id);

  return (
    <AppLayout>
      {/* Back Button */}
      <Link
        to="/clientes"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para Clientes</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              {cliente.nome}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
              {cliente.telefone && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {cliente.telefone}
                </span>
              )}
              {cliente.email && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {cliente.email}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/clientes/${id}/editar`}>
              <Pencil className="w-4 h-4" />
              Editar
            </Link>
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setClienteToDelete(true)}
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      {/* Tabs: Dados | Locais | Feed */}
      <Tabs defaultValue="locais" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="locais" className="gap-2">
            <MapPin className="w-4 h-4" />
            Locais
          </TabsTrigger>
          <TabsTrigger value="dados" className="gap-2">
            <FileText className="w-4 h-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="feed" className="gap-2">
            <Calendar className="w-4 h-4" />
            Feed
          </TabsTrigger>
        </TabsList>

        {/* Tab Locais */}
        <TabsContent value="locais" className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Locais ({locais.length})
            </h2>
            <Button variant="terracota" size="sm" onClick={() => setLocalFormOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Novo Local
            </Button>
          </div>

          {loadingLocais ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : locais.length > 0 ? (
            <div className="space-y-3">
              {locais.map((local: any) => (
                <LocalCard
                  key={local.id}
                  local={local}
                  clienteId={id!}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 card-botanical">
              <MapPin className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nenhum local cadastrado</p>
              <Button variant="terracota" size="sm" onClick={() => setLocalFormOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar primeiro local
              </Button>
            </div>
          )}

          {/* Legacy projects without local */}
          {projetosSemLocal.length > 0 && (
            <div className="mt-8">
              <h3 className="font-display font-semibold text-foreground mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                Projetos sem local vinculado
              </h3>
              <div className="space-y-2">
                {projetosSemLocal.map((projeto: any) => {
                  const statusInfo =
                    projetoStatusConfig[projeto.status] || projetoStatusConfig.orcamento;
                  return (
                    <Link
                      key={projeto.id}
                      to={`/projetos/${projeto.id}`}
                      className="card-botanical p-3 block hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{projeto.titulo}</p>
                          <Badge variant="outline" className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab Dados */}
        <TabsContent value="dados" className="space-y-6">
          {/* Contact info */}
          <section className="card-botanical p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Informações do Cliente
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp / Telefone</p>
                <p className="text-foreground">{cliente.telefone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground">{cliente.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPF / CNPJ</p>
                <p className="text-foreground">{cliente.cpf_cnpj || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inscrição Estadual</p>
                <p className="text-foreground">{cliente.inscricao_estadual || "-"}</p>
              </div>
            </div>
          </section>

          {/* Proprietários */}
          {cliente.proprietarios && cliente.proprietarios.length > 0 && (
            <section className="card-botanical p-5">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                Proprietários
              </h2>
              <div className="space-y-3">
                {cliente.proprietarios.map((prop: any, i: number) => (
                  <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
                    <span className="font-medium text-foreground">{prop.nome}</span>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {prop.telefone && <span>{prop.telefone}</span>}
                      {prop.email && <span>{prop.email}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Datas Importantes */}
          {cliente.datas_importantes && cliente.datas_importantes.length > 0 && (
            <section className="card-botanical p-5">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Datas Importantes
              </h2>
              <div className="space-y-2">
                {cliente.datas_importantes.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium text-primary">
                      {d.data ? new Date(d.data).toLocaleDateString("pt-BR") : ""}
                    </span>
                    <span className="text-foreground">{d.descricao}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notas */}
          {cliente.notas && (
            <section className="card-botanical p-5">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                Observações
              </h2>
              <p className="text-foreground whitespace-pre-wrap">{cliente.notas}</p>
            </section>
          )}

          {cliente.particularidades && (
            <section className="card-botanical p-5">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                Particularidades
              </h2>
              <p className="text-foreground whitespace-pre-wrap">{cliente.particularidades}</p>
            </section>
          )}
        </TabsContent>

        {/* Tab Feed */}
        <TabsContent value="feed" className="bg-card rounded-xl p-6 border border-primary/20">
          <p className="text-muted-foreground mb-6">
            Todas as movimentações e alterações deste cliente
          </p>
          <FeedCliente clienteId={id || ""} />
        </TabsContent>
      </Tabs>

      {/* New Local Dialog */}
      {localFormOpen && (
        <LocalFormDialog
          open={localFormOpen}
          onOpenChange={setLocalFormOpen}
          clienteId={id!}
        />
      )}

      {/* Delete Client Confirmation */}
      <AlertDialog open={clienteToDelete} onOpenChange={setClienteToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente "{cliente.nome}" e todos os dados relacionados serão removidos
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClienteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

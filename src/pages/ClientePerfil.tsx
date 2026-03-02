import { useState } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  MapPin, 
  FolderKanban,
  Phone, 
  Mail, 
  Calendar,
  Users,
  Plus,
  Pencil,
  Building2,
  FileText,
  User,
  Briefcase,
  AlertCircle,
  Package,
  DollarSign,
  Clock,
  List,
  CalendarDays,
  X,
  Loader2,
  Image as ImageIcon,
  Play,
  Trash2
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarioDiario } from "@/components/CalendarioDiario";
import { FeedCliente } from "@/components/FeedCliente";
import { useToast } from "@/hooks/use-toast";
import { 
  useCliente, 
  useTrechosCliente, 
  usePropostasCliente, 
  useRegistrosComDetalhes 
} from "@/hooks/useCliente";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { useProjetosCliente, projetoStatusConfig } from "@/hooks/useProjetos";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-primary/20 text-primary border-primary/30" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-muted" },
  prospecto: { label: "Prospecto", className: "bg-primary/10 text-primary/80 border-primary/20" },
};

const propostaStatusConfig: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  enviada: { label: "Enviada", className: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  recusada: { label: "Recusada", className: "bg-red-500/20 text-red-700 dark:text-red-300" },
  aprovada: { label: "Aprovada", className: "bg-green-500/20 text-green-700 dark:text-green-300" },
};

const tipoLabels: Record<string, string> = {
  manutenção: "Manutenção",
  manutencao: "Manutenção",
  implantação: "Implantação",
  implantacao: "Implantação",
  entrega: "Entrega",
  visita_tecnica: "Visita Técnica",
  recebimento: "Recebimento",
  solicitacao: "Solicitação",
};

const prioridadeConfig: Record<string, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", className: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  alta: { label: "Alta", className: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  urgente: { label: "Urgente", className: "bg-destructive/20 text-destructive" },
};

const statusSolicitacaoConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  em_analise: { label: "Em Análise", className: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  resolvido: { label: "Resolvido", className: "bg-green-500/20 text-green-700 dark:text-green-300" },
};

export default function ClientePerfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "cadastro";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Auth and permissions
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  
  // Delete states
  const [clienteToDelete, setClienteToDelete] = useState(false);
  const [registroToDelete, setRegistroToDelete] = useState<{ id: string; descricao: string } | null>(null);
  
  // Fetch real data from database
  const { data: cliente, isLoading: loadingCliente, error: clienteError } = useCliente(id);
  const { data: trechos = [] } = useTrechosCliente(id);
  const { data: propostas = [] } = usePropostasCliente(id);
  const { registros, isLoading: loadingRegistros } = useRegistrosComDetalhes(id);
  const { data: projetos = [] } = useProjetosCliente(id);
  
  // Delete mutations
  const deleteClienteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast({
        title: "Cliente excluído",
        description: "O cadastro foi removido permanentemente.",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o cliente. Verifique se há registros vinculados.",
        variant: "destructive",
      });
    },
  });
  
  const deleteRegistroMutation = useMutation({
    mutationFn: async (registroId: string) => {
      const { error } = await supabase
        .from("registros")
        .delete()
        .eq("id", registroId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registros", id] });
      toast({
        title: "Registro excluído",
        description: "O registro foi removido permanentemente.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o registro.",
        variant: "destructive",
      });
    },
  });
  
  const handleEditarRegistro = (registroId: string) => {
    navigate(`/registros/${registroId}/editar`);
  };

  const handleCancelarRegistro = (registroId: string) => {
    toast({
      title: "Registro cancelado",
      description: "O registro foi marcado como cancelado.",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Loading state
  if (loadingCliente) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Error or not found state
  if (clienteError || !cliente) {
    return (
      <AppLayout>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Clientes</span>
        </Link>
        <div className="empty-state py-24">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <Building2 className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-semibold mb-2 text-foreground">
            Cliente não encontrado
          </h3>
          <p className="text-muted-foreground mb-6">
            O cliente solicitado não existe ou foi removido.
          </p>
          <Button variant="terracota" asChild>
            <Link to="/">Ver todos os clientes</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const status = statusConfig[cliente.status] || statusConfig.ativo;

  // Transform registros for CalendarioDiario component
  const registrosParaCalendario = registros.map(r => ({
    id: r.id,
    data: r.data_servico,
    tipo: r.tipo,
    status: r.status,
    trecho: r.trecho || undefined,
    proposta: r.proposta || undefined,
    equipePresente: r.equipePresente,
    executores: r.executores,
    solicitante: r.solicitante || undefined,
    descricao: r.descricao,
    insumos: r.insumos,
    prioridade: r.prioridade || undefined,
    statusSolicitacao: r.statusSolicitacao || undefined,
  }));

  return (
    <AppLayout>
      {/* Back Button */}
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para Clientes</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              {cliente.nome}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
              {(cliente.bairro || cliente.cidade) && (
                <span className="text-sm text-muted-foreground">
                  {[cliente.bairro, cliente.cidade].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/clientes/${id}/editar`}>
              <Pencil className="w-4 h-4" />
              Editar Cadastro
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

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="cadastro" className="gap-2">
            <FileText className="w-4 h-4" />
            Cadastro
          </TabsTrigger>
          <TabsTrigger value="diario" className="gap-2">
            <List className="w-4 h-4" />
            Feed do Cliente
          </TabsTrigger>
          <TabsTrigger value="propostas" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Propostas
          </TabsTrigger>
          <TabsTrigger value="projetos" className="gap-2">
            <FolderKanban className="w-4 h-4" />
            Projetos
          </TabsTrigger>
        </TabsList>

        {/* Tab Cadastro */}
        <TabsContent value="cadastro" className="space-y-6">
          {/* Localização */}
          <section className="card-botanical p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Localização
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Endereço</p>
                <p className="text-foreground">{cliente.endereco || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bairro</p>
                <p className="text-foreground">{cliente.bairro || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cidade / Estado</p>
                <p className="text-foreground">
                  {[cliente.cidade, cliente.estado].filter(Boolean).join(" - ") || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CEP</p>
                <p className="text-foreground">{cliente.cep || "-"}</p>
              </div>
              {cliente.condominio && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Condomínio</p>
                  <p className="text-foreground">{cliente.condominio}</p>
                </div>
              )}
            </div>
          </section>

          {/* Dados Fiscais */}
          <section className="card-botanical p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Dados Fiscais
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">CPF / CNPJ</p>
                <p className="text-foreground">{cliente.cpf_cnpj || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inscrição Estadual</p>
                <p className="text-foreground">{cliente.inscricao_estadual || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="text-foreground">{cliente.telefone || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground">{cliente.email || "-"}</p>
              </div>
            </div>
          </section>

          {/* Proprietários */}
          <section className="card-botanical p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Proprietários
            </h2>
            {cliente.proprietarios.length > 0 ? (
              <div className="space-y-3">
                {cliente.proprietarios.map((prop: any, index: number) => (
                  <div key={index} className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <span className="font-medium text-foreground">{prop.nome}</span>
                      {prop.telefone && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {prop.telefone}
                        </span>
                      )}
                      {prop.email && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {prop.email}
                        </span>
                      )}
                    </div>
                    {(prop.dataNascimento || prop.cpf) && (
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {prop.dataNascimento && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(prop.dataNascimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {prop.cpf && <span>CPF: {prop.cpf}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum proprietário cadastrado</p>
            )}
          </section>

          {/* Funcionários da Casa */}
          <section className="card-botanical p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Funcionários da Casa
            </h2>
            {cliente.funcionarios_casa.length > 0 ? (
              <div className="space-y-3">
                {cliente.funcionarios_casa.map((func: any, index: number) => (
                  <div key={index} className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <span className="font-medium text-foreground">{func.nome}</span>
                      {func.funcao && <Badge variant="outline" className="w-fit">{func.funcao}</Badge>}
                      {func.telefone && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {func.telefone}
                        </span>
                      )}
                    </div>
                    {(func.dataNascimento || func.cpf) && (
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {func.dataNascimento && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(func.dataNascimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {func.cpf && <span>CPF: {func.cpf}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum funcionário cadastrado</p>
            )}
          </section>

          {/* Assessores */}
          <section className="card-botanical p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Assessores
            </h2>
            {cliente.assessores.length > 0 ? (
              <div className="space-y-3">
                {cliente.assessores.map((ass: any, index: number) => (
                  <div key={index} className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <span className="font-medium text-foreground">{ass.nome}</span>
                      {ass.empresa && <Badge variant="outline" className="w-fit">{ass.empresa}</Badge>}
                      {ass.telefone && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {ass.telefone}
                        </span>
                      )}
                    </div>
                    {(ass.dataNascimento || ass.cpf) && (
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {ass.dataNascimento && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(ass.dataNascimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {ass.cpf && <span>CPF: {ass.cpf}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum assessor cadastrado</p>
            )}
          </section>

          {/* Datas Importantes */}
          <section className="card-botanical p-5">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Datas Importantes
            </h2>
            {cliente.datas_importantes.length > 0 ? (
              <div className="space-y-3">
                {cliente.datas_importantes.map((data, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium text-primary">
                      {new Date(data.data).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-foreground">{data.descricao}</span>
                    {data.recorrente && (
                      <Badge variant="outline" className="text-xs">Anual</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma data cadastrada</p>
            )}
          </section>

          {/* Particularidades */}
          {cliente.particularidades && (
            <section className="card-botanical p-5">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                Particularidades
              </h2>
              <p className="text-foreground">{cliente.particularidades}</p>
            </section>
          )}

          {/* Notas */}
          {cliente.notas && (
            <section className="card-botanical p-5">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">
                Observações Gerais
              </h2>
              <p className="text-foreground">{cliente.notas}</p>
            </section>
          )}

          {/* Trechos */}
          <section className="card-botanical p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Trechos do Jardim
              </h2>
              <Button variant="ghost" size="sm">
                <Plus className="w-4 h-4" />
                Novo Trecho
              </Button>
            </div>
            {trechos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {trechos.map((trecho) => (
                  <button
                    key={trecho.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {trecho.nome}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum trecho cadastrado</p>
            )}
          </section>
        </TabsContent>

        {/* Tab Feed do Cliente */}
        <TabsContent value="diario" className="bg-card rounded-xl p-6 -mx-1 border border-primary/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <p className="text-muted-foreground">
              Todas as movimentações e alterações deste cliente
            </p>
          </div>
          <FeedCliente clienteId={id || ''} />
        </TabsContent>

        {/* Tab Propostas */}
        <TabsContent value="propostas">
          {/* Header das Propostas */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              Histórico de propostas comerciais enviadas
            </p>
            <Button variant="terracota" asChild>
              <Link to={`/propostas/nova?cliente=${id}`}>
                <Plus className="w-4 h-4" />
                Nova Proposta
              </Link>
            </Button>
          </div>

          {/* Estatísticas rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="card-botanical p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {propostas.length}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="card-botanical p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {propostas.filter(p => p.status === "aprovada").length}
              </p>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </div>
            <div className="card-botanical p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {propostas.filter(p => p.status === "enviada").length}
              </p>
              <p className="text-xs text-muted-foreground">Aguardando</p>
            </div>
            <div className="card-botanical p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {propostas.filter(p => p.status === "recusada").length}
              </p>
              <p className="text-xs text-muted-foreground">Recusadas</p>
            </div>
          </div>

          {/* Lista de Propostas */}
          {propostas.length > 0 ? (
            <div className="space-y-4">
              {propostas.map((proposta) => {
                const statusInfo = propostaStatusConfig[proposta.status] || propostaStatusConfig.rascunho;
                return (
                  <article 
                    key={proposta.id} 
                    className="card-botanical p-5 hover:shadow-card transition-all cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                          {proposta.data_envio && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(proposta.data_envio).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="font-semibold text-foreground mb-1">
                          {proposta.codigo} / {proposta.titulo}
                        </h3>
                        
                        {proposta.descricao && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {proposta.descricao}
                          </p>
                        )}
                      </div>

                      {proposta.valor && (
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(proposta.valor)}
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Nenhuma proposta encontrada para este cliente</p>
              <Button variant="terracota" asChild>
                <Link to={`/propostas/nova?cliente=${id}`}>
                  <Plus className="w-4 h-4" />
                  Criar primeira proposta
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Tab Projetos */}
        <TabsContent value="projetos">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Projetos</h2>
            {isAdmin && (
              <Button variant="terracota" asChild>
                <Link to={`/projetos/novo?cliente_id=${id}`}>
                  <Plus className="w-4 h-4" />
                  Novo Projeto
                </Link>
              </Button>
            )}
          </div>

          {projetos.length > 0 ? (
            <div className="space-y-3">
              {projetos.map((projeto) => {
                const statusInfo = projetoStatusConfig[projeto.status] || projetoStatusConfig.orcamento;
                return (
                  <Link
                    key={projeto.id}
                    to={`/projetos/${projeto.id}`}
                    className="card-botanical p-4 block hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display font-semibold text-foreground">{projeto.titulo}</h3>
                        {projeto.descricao && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{projeto.descricao}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                          {projeto.data_previsao && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Previsão: {new Date(projeto.data_previsao + "T12:00:00").toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                      {projeto.valor_total != null && projeto.valor_total > 0 && (
                        <p className="text-lg font-bold text-primary">{formatCurrency(projeto.valor_total)}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderKanban className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nenhum projeto encontrado</p>
              {isAdmin && (
                <Button variant="terracota" asChild>
                  <Link to={`/projetos/novo?cliente_id=${id}`}>
                    <Plus className="w-4 h-4" />
                    Criar primeiro projeto
                  </Link>
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Alert de confirmação de exclusão de cliente */}
      <AlertDialog open={clienteToDelete} onOpenChange={setClienteToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente "{cliente.nome}" e todos os dados relacionados serão removidos permanentemente.
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

      {/* Alert de confirmação de exclusão de registro */}
      <AlertDialog open={!!registroToDelete} onOpenChange={() => setRegistroToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro "{registroToDelete?.descricao?.slice(0, 50)}..." será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (registroToDelete) {
                  deleteRegistroMutation.mutate(registroToDelete.id);
                  setRegistroToDelete(null);
                }
              }}
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

import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Users,
  Plus,
  Pencil,
  Image as ImageIcon,
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
  Check
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarioDiario } from "@/components/CalendarioDiario";
import { useToast } from "@/hooks/use-toast";
// Mock data expandido
const mockCliente = {
  id: "1",
  nome: "Família Silveira",
  endereco: "Rua dos Jardins, 450",
  bairro: "Jardins",
  cidade: "São Paulo",
  estado: "SP",
  cep: "01423-001",
  condominio: "",
  telefone: "(11) 99999-1234",
  email: "silveira@email.com",
  cpf_cnpj: "123.456.789-00",
  inscricao_estadual: "",
  status: "ativo",
  notas: "Cliente desde 2019. Preferência por plantas nativas.",
  particularidades: "Cachorros soltos no jardim aos fins de semana. Avisar antes de entrar.",
  proprietarios: [
    { nome: "Roberto Silveira", telefone: "(11) 99999-1234", email: "roberto@email.com" },
    { nome: "Ana Silveira", telefone: "(11) 99999-5678", email: "ana@email.com" },
  ],
  funcionarios_casa: [
    { nome: "José Carlos", funcao: "Caseiro", telefone: "(11) 98888-0000" },
    { nome: "Maria", funcao: "Governanta", telefone: "(11) 98888-1111" },
  ],
  assessores: [
    { nome: "Arq. Paula Mendes", empresa: "PM Arquitetura", telefone: "(11) 97777-0000" },
  ],
  datas_importantes: [
    { data: "2024-03-15", descricao: "Aniversário D. Ana", recorrente: true },
    { data: "2024-07-01", descricao: "Viagem Europa (Jul-Ago)", recorrente: false },
  ],
  trechos: [
    { id: "1", nome: "Jardim Frontal" },
    { id: "2", nome: "Piscina" },
    { id: "3", nome: "Varanda" },
  ],
  registros: [
    {
      id: "1",
      data: "2024-01-12",
      tipo: "manutenção",
      trecho: "Jardim Frontal",
      proposta: { codigo: "2024-015", titulo: "Manutenção Anual" },
      equipePresente: ["João Silva", "Maria Santos", "Pedro Oliveira"],
      executores: ["João Silva", "Maria Santos"],
      solicitante: "D. Ana (Proprietária)",
      descricao: "Poda de formação e limpeza geral",
      insumos: [
        { nome: "Adubo NPK", quantidade: 2, unidade: "kg" },
        { nome: "Terra vegetal", quantidade: 3, unidade: "sacos" },
      ],
    },
    {
      id: "2",
      data: "2024-01-05",
      tipo: "implantação",
      trecho: "Piscina",
      proposta: { codigo: "2024-012", titulo: "Implantação Jardim Lateral" },
      equipePresente: ["Maria Santos", "Pedro Oliveira"],
      executores: ["Maria Santos", "Pedro Oliveira"],
      solicitante: null,
      descricao: "Plantio de novas forrações e palmeiras",
      insumos: [
        { nome: "Palmeira Imperial", quantidade: 2, unidade: "un" },
        { nome: "Forração Amendoim", quantidade: 50, unidade: "mudas" },
      ],
    },
  ],
  propostas: [
    {
      id: "1",
      codigo: "2024-015",
      titulo: "Manutenção Anual",
      status: "aprovada",
      data_envio: "2024-01-10",
      valor: 2500,
      descricao: "Manutenção mensal com poda, adubação e limpeza geral",
    },
    {
      id: "2",
      codigo: "2024-012",
      titulo: "Implantação Jardim Lateral",
      status: "aprovada",
      data_envio: "2024-01-05",
      valor: 45000,
      descricao: "Projeto completo com palmeiras imperiais e forrações",
    },
    {
      id: "3",
      codigo: "2023-089",
      titulo: "Reforma Área Piscina",
      status: "recusada",
      data_envio: "2023-12-01",
      valor: 28000,
      descricao: "Reforma paisagística da área da piscina",
    },
    {
      id: "4",
      codigo: "2024-018",
      titulo: "Vasos Decorativos",
      status: "enviada",
      data_envio: "2024-01-15",
      valor: 5800,
      descricao: "Fornecimento e plantio de vasos ornamentais para varanda",
    },
  ],
};

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-primary/20 text-primary border-primary/30" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-muted" },
  prospecto: { label: "Prospecto", className: "bg-primary/10 text-primary/80 border-primary/20" },
};

const propostaStatusConfig: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  enviada: { label: "Enviada", className: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  aprovada: { label: "Aprovada", className: "bg-green-500/20 text-green-700 dark:text-green-300" },
  recusada: { label: "Recusada", className: "bg-red-500/20 text-red-700 dark:text-red-300" },
};

const tipoLabels: Record<string, string> = {
  manutenção: "Manutenção",
  implantação: "Implantação",
  entrega: "Entrega",
  visita_tecnica: "Visita Técnica",
};

export default function ClientePerfil() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "cadastro";
  const [diarioView, setDiarioView] = useState<'feed' | 'calendario'>('feed');
  const { toast } = useToast();
  const cliente = mockCliente;
  const status = statusConfig[cliente.status];

  const handleEditarRegistro = (registroId: string) => {
    // Navegar para edição
    window.location.href = `/registros/${registroId}/editar`;
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
              <span className="text-sm text-muted-foreground">
                {cliente.bairro}, {cliente.cidade}
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/clientes/${id}/editar`}>
            <Pencil className="w-4 h-4" />
            Editar Cadastro
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="cadastro" className="gap-2">
            <FileText className="w-4 h-4" />
            Cadastro
          </TabsTrigger>
          <TabsTrigger value="diario" className="gap-2">
            <Calendar className="w-4 h-4" />
            Diário
          </TabsTrigger>
          <TabsTrigger value="propostas" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Propostas
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
                <p className="text-foreground">{cliente.endereco}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bairro</p>
                <p className="text-foreground">{cliente.bairro}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cidade / Estado</p>
                <p className="text-foreground">{cliente.cidade} - {cliente.estado}</p>
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
                {cliente.proprietarios.map((prop, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-3 rounded-lg bg-muted/50">
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
                {cliente.funcionarios_casa.map((func, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-3 rounded-lg bg-muted/50">
                    <span className="font-medium text-foreground">{func.nome}</span>
                    <Badge variant="outline" className="w-fit">{func.funcao}</Badge>
                    {func.telefone && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {func.telefone}
                      </span>
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
                {cliente.assessores.map((ass, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-3 rounded-lg bg-muted/50">
                    <span className="font-medium text-foreground">{ass.nome}</span>
                    {ass.empresa && <Badge variant="outline" className="w-fit">{ass.empresa}</Badge>}
                    {ass.telefone && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {ass.telefone}
                      </span>
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
            <div className="flex flex-wrap gap-2">
              {cliente.trechos.map((trecho) => (
                <button
                  key={trecho.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {trecho.nome}
                </button>
              ))}
            </div>
          </section>
        </TabsContent>

        {/* Tab Diário */}
        <TabsContent value="diario" className="bg-card rounded-xl p-6 -mx-1 border border-primary/20">
          {/* Header do Diário */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">
                Histórico de serviços e registros do jardim
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle Feed/Calendário */}
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={diarioView === 'feed' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDiarioView('feed')}
                >
                  <List className="w-4 h-4" />
                  Feed
                </Button>
                <Button
                  variant={diarioView === 'calendario' ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDiarioView('calendario')}
                >
                  <CalendarDays className="w-4 h-4" />
                  Calendário
                </Button>
              </div>
              <Button variant="terracota" asChild>
                <Link to={`/registros/novo?cliente=${id}`}>
                  <Plus className="w-4 h-4" />
                  Novo Registro
                </Link>
              </Button>
            </div>
          </div>

          {/* Conteúdo baseado na visualização */}
          {diarioView === 'calendario' ? (
            <CalendarioDiario registros={cliente.registros} clienteId={id || ''} />
          ) : (
            /* Timeline (Feed) */
            <div className="relative">
              {/* Timeline Line */}
              <div className="timeline-line" />

              {/* Timeline Items */}
              <div className="space-y-4 pl-10">
                {cliente.registros.map((registro) => (
                  <Link 
                    key={registro.id} 
                    to={`/registros/${registro.id}`}
                    className="block"
                  >
                    <article className="card-botanical p-4 relative animate-fade-in hover:shadow-card transition-all">
                      {/* Timeline Dot */}
                      <div className="timeline-dot absolute -left-[2.15rem] top-5" />

                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Photo Placeholder */}
                        <div className="w-full sm:w-24 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="tag-primary text-xs">
                                {tipoLabels[registro.tipo] || registro.tipo}
                              </span>
                              {registro.proposta && (
                                <Badge variant="outline" className="text-xs">
                                  {registro.proposta.codigo}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(registro.data).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          
                          <p className="text-sm font-medium text-foreground mb-1">
                            {registro.trecho}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {registro.descricao}
                          </p>

                          {/* Proposta */}
                          {registro.proposta && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                              <FileText className="w-3.5 h-3.5 text-primary" />
                              <span className="text-primary font-medium">
                                {registro.proposta.codigo} / {registro.proposta.titulo}
                              </span>
                            </div>
                          )}

                          {/* Equipe do Dia */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>Equipe do dia: </span>
                            <span className="text-foreground">{registro.equipePresente.join(", ")}</span>
                          </div>

                          {/* Executores */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <User className="w-3.5 h-3.5" />
                            <span>Executores: </span>
                            <span className="text-foreground">{registro.executores.join(", ")}</span>
                          </div>

                          {/* Solicitante */}
                          {registro.solicitante && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                              <Briefcase className="w-3.5 h-3.5" />
                              <span>Solicitante: </span>
                              <span className="text-foreground">{registro.solicitante}</span>
                            </div>
                          )}

                          {/* Insumos */}
                          {registro.insumos.length > 0 && (
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-3">
                              <Package className="w-3.5 h-3.5 mt-0.5" />
                              <span className="text-foreground">
                                {registro.insumos.map(i => `${i.nome} (${i.quantidade} ${i.unidade})`).join(", ")}
                              </span>
                            </div>
                          )}

                          {/* Ações de editar/cancelar */}
                          <div className="flex gap-2 pt-3 border-t border-border">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-1.5"
                              onClick={(e) => {
                                e.preventDefault();
                                handleEditarRegistro(registro.id);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Editar
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="gap-1.5 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.preventDefault();
                                handleCancelarRegistro(registro.id);
                              }}
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          )}
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
                {cliente.propostas.length}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="card-botanical p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {cliente.propostas.filter(p => p.status === "aprovada").length}
              </p>
              <p className="text-xs text-muted-foreground">Aprovadas</p>
            </div>
            <div className="card-botanical p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {cliente.propostas.filter(p => p.status === "enviada").length}
              </p>
              <p className="text-xs text-muted-foreground">Aguardando</p>
            </div>
            <div className="card-botanical p-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {cliente.propostas.filter(p => p.status === "recusada").length}
              </p>
              <p className="text-xs text-muted-foreground">Recusadas</p>
            </div>
          </div>

          {/* Lista de Propostas */}
          <div className="space-y-4">
            {cliente.propostas.map((proposta) => {
              const statusInfo = propostaStatusConfig[proposta.status];
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
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(proposta.data_envio).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-foreground mb-1">
                        {proposta.codigo} / {proposta.titulo}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {proposta.descricao}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(proposta.valor)}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

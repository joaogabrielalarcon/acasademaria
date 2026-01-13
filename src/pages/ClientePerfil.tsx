import { useParams, Link } from "react-router-dom";
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
  Package
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      responsaveis: ["João Silva"],
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
      responsaveis: ["Maria Santos", "Pedro Oliveira"],
      descricao: "Plantio de novas forrações e palmeiras",
      insumos: [
        { nome: "Palmeira Imperial", quantidade: 2, unidade: "un" },
        { nome: "Forração Amendoim", quantidade: 50, unidade: "mudas" },
      ],
    },
  ],
};

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-primary/20 text-primary border-primary/30" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-muted" },
  prospecto: { label: "Prospecto", className: "bg-primary/10 text-primary/80 border-primary/20" },
};

const tipoLabels: Record<string, string> = {
  manutenção: "Manutenção",
  implantação: "Implantação",
  entrega: "Entrega",
  visita_tecnica: "Visita Técnica",
};

export default function ClientePerfil() {
  const { id } = useParams();
  const cliente = mockCliente; // Would fetch by id
  const status = statusConfig[cliente.status];

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
      <Tabs defaultValue="cadastro" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="cadastro" className="gap-2">
            <FileText className="w-4 h-4" />
            Cadastro
          </TabsTrigger>
          <TabsTrigger value="diario" className="gap-2">
            <Calendar className="w-4 h-4" />
            Diário
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
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/trechos/novo?cliente=${id}`}>
                  <Plus className="w-4 h-4" />
                  Novo Trecho
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {cliente.trechos.map((trecho) => (
                <Link
                  key={trecho.id}
                  to={`/trechos/${trecho.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {trecho.nome}
                </Link>
              ))}
            </div>
          </section>
        </TabsContent>

        {/* Tab Diário */}
        <TabsContent value="diario">
          {/* Header do Diário */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-muted-foreground">
              Histórico de serviços e registros do jardim
            </p>
            <Button variant="terracota" asChild>
              <Link to={`/registros/novo?cliente=${id}`}>
                <Plus className="w-4 h-4" />
                Novo Registro
              </Link>
            </Button>
          </div>

          {/* Timeline */}
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
                          <span className="tag-primary text-xs">
                            {tipoLabels[registro.tipo] || registro.tipo}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(registro.data).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          {registro.trecho}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {registro.descricao}
                        </p>

                        {/* Equipe */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                          <Users className="w-3.5 h-3.5" />
                          {registro.responsaveis.join(", ")}
                        </div>

                        {/* Insumos */}
                        {registro.insumos && registro.insumos.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Package className="w-3.5 h-3.5" />
                            {registro.insumos.map(i => `${i.nome} (${i.quantidade} ${i.unidade})`).join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>

          {cliente.registros.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2 text-foreground">
                Nenhum registro ainda
              </h3>
              <p className="text-muted-foreground mb-4">
                Comece a documentar os serviços realizados neste jardim
              </p>
              <Button variant="terracota" asChild>
                <Link to={`/registros/novo?cliente=${id}`}>
                  <Plus className="w-4 h-4" />
                  Novo Registro
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
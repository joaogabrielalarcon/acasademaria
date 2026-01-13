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
  Image as ImageIcon
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Mock data
const mockCliente = {
  id: "1",
  nome: "Família Silveira",
  endereco: "Rua dos Jardins, 450",
  bairro: "Jardins",
  telefone: "(11) 99999-1234",
  email: "silveira@email.com",
  status: "ativo",
  notas: "Cliente desde 2019. Preferência por plantas nativas.",
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
    },
    {
      id: "2",
      data: "2024-01-05",
      tipo: "implantação",
      trecho: "Piscina",
      responsaveis: ["Maria Santos", "Pedro Oliveira"],
      descricao: "Plantio de novas forrações e palmeiras",
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
        to="/clientes" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para Clientes</span>
      </Link>

      {/* Header */}
      <div className="card-botanical p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                {cliente.nome}
              </h1>
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
            </div>
            
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{cliente.endereco}, {cliente.bairro}</span>
              </div>
              {cliente.telefone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{cliente.telefone}</span>
                </div>
              )}
              {cliente.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{cliente.email}</span>
                </div>
              )}
            </div>

            {cliente.notas && (
              <p className="mt-4 text-sm text-foreground/80 bg-muted/50 rounded-lg p-3">
                {cliente.notas}
              </p>
            )}
          </div>

          <Button variant="outline" asChild>
            <Link to={`/clientes/${id}/editar`}>
              <Pencil className="w-4 h-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Trechos */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Trechos do Jardim</h2>
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
      </div>

      {/* Timeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Histórico de Serviços</h2>
          <Button variant="terracota" size="sm" asChild>
            <Link to={`/registros/novo?cliente=${id}`}>
              <Plus className="w-4 h-4" />
              Novo Registro
            </Link>
          </Button>
        </div>

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
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {registro.descricao}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        {registro.responsaveis.join(", ")}
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { 
  Calendar, 
  MapPin, 
  Users as UsersIcon, 
  Filter,
  Search,
  Image as ImageIcon,
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock data for display
const mockRegistros = [
  {
    id: "1",
    cliente: "Família Silveira",
    bairro: "Jardins",
    trecho: "Jardim Frontal",
    tipo: "manutenção",
    data: "2024-01-12",
    responsaveis: ["João Silva", "Maria Santos"],
    descricao: "Realizada poda de formação nas espécies arbustivas e limpeza geral do canteiro. Aplicação de cobertura morta nas áreas recém-plantadas.",
    foto: null,
  },
  {
    id: "2",
    cliente: "Residência Campos",
    bairro: "Alto de Pinheiros",
    trecho: "Horta",
    tipo: "implantação",
    data: "2024-01-10",
    responsaveis: ["Pedro Oliveira"],
    descricao: "Implantação de canteiro de ervas aromáticas com alecrim, manjericão, hortelã e cebolinha. Sistema de irrigação por gotejamento instalado.",
    foto: null,
  },
  {
    id: "3",
    cliente: "Edifício Aurora",
    bairro: "Moema",
    trecho: "Terraço",
    tipo: "visita_tecnica",
    data: "2024-01-08",
    responsaveis: ["Maria Fernanda"],
    descricao: "Visita de avaliação para projeto de paisagismo no terraço. Cliente interessado em jardim vertical e área de contemplação.",
    foto: null,
  },
];

const tipoLabels: Record<string, string> = {
  manutenção: "Manutenção",
  implantação: "Implantação",
  entrega: "Entrega",
  visita_tecnica: "Visita Técnica",
  reuniao: "Reunião",
  outro: "Outro",
};

function RegistroCard({ registro }: { registro: typeof mockRegistros[0] }) {
  return (
    <Link to={`/registros/${registro.id}`} className="block">
      <article className="card-botanical overflow-hidden animate-fade-in hover:shadow-card transition-all">
        <div className="flex flex-col md:flex-row">
          {/* Photo Section */}
          <div className="md:w-2/5 h-48 md:h-auto bg-muted flex items-center justify-center">
            {registro.foto ? (
              <img 
                src={registro.foto} 
                alt={`${registro.cliente} - ${registro.trecho}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                <ImageIcon className="w-12 h-12" />
                <span className="text-xs">Sem foto</span>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1 p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {registro.cliente}
                </h3>
                <p className="text-sm text-muted-foreground">{registro.bairro}</p>
              </div>
              <span className="tag-primary">
                {tipoLabels[registro.tipo] || registro.tipo}
              </span>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{new Date(registro.data).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{registro.trecho}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UsersIcon className="w-4 h-4" />
                <span>{registro.responsaveis.join(", ")}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-foreground/80 line-clamp-2">
              {registro.descricao}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="empty-state py-24">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
      </div>
      <h3 className="font-display text-xl font-semibold mb-2">
        Nenhum registro ainda
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Comece documentando o primeiro serviço. Cada registro ajuda a construir o histórico do jardim.
      </p>
      <Button variant="terracota" asChild>
        <Link to="/registros/novo">
          <Plus className="w-4 h-4" />
          Novo Registro
        </Link>
      </Button>
    </div>
  );
}

export default function Timeline() {
  const hasRegistros = mockRegistros.length > 0;

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Diário de Serviços
        </h1>
        <p className="text-muted-foreground">
          Acompanhe todas as atividades realizadas nos jardins
        </p>
      </div>

      {/* Filters Bar */}
      <div className="card-botanical p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, descrição..."
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="silveira">Família Silveira</SelectItem>
                <SelectItem value="campos">Residência Campos</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="implantacao">Implantação</SelectItem>
                <SelectItem value="visita">Visita Técnica</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {hasRegistros ? (
        <div className="space-y-4">
          {mockRegistros.map((registro) => (
            <RegistroCard key={registro.id} registro={registro} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      {/* FAB - New Record */}
      <Link to="/registros/novo" className="fab lg:hidden">
        <Plus className="w-6 h-6" />
      </Link>

      {/* Desktop CTA */}
      <div className="hidden lg:block fixed bottom-8 right-8">
        <Button variant="terracota" size="lg" asChild>
          <Link to="/registros/novo">
            <Plus className="w-5 h-5" />
            Novo Registro
          </Link>
        </Button>
      </div>
    </AppLayout>
  );
}

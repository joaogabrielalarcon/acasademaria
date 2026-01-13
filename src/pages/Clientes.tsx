import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, MapPin, FileText, Building2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

// Mock data
const mockClientes = [
  {
    id: "1",
    nome: "Família Silveira",
    bairro: "Jardins",
    status: "ativo",
    registrosCount: 24,
  },
  {
    id: "2",
    nome: "Residência Campos",
    bairro: "Alto de Pinheiros",
    status: "ativo",
    registrosCount: 12,
  },
  {
    id: "3",
    nome: "Edifício Aurora",
    bairro: "Moema",
    status: "prospecto",
    registrosCount: 2,
  },
  {
    id: "4",
    nome: "Casa Montenegro",
    bairro: "Morumbi",
    status: "inativo",
    registrosCount: 45,
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-primary/20 text-primary border-primary/30" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-muted" },
  prospecto: { label: "Prospecto", className: "bg-primary/10 text-primary/80 border-primary/20" },
};

function ClienteCard({ cliente }: { cliente: typeof mockClientes[0] }) {
  const status = statusConfig[cliente.status];

  return (
    <Link to={`/clientes/${cliente.id}`} className="block">
      <article className="card-botanical p-5 h-full animate-fade-in hover:shadow-card transition-all group">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
          <Building2 className="w-6 h-6 text-primary" />
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {cliente.nome}
            </h3>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{cliente.bairro}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-primary/10">
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileText className="w-3.5 h-3.5" />
              <span>{cliente.registrosCount} registros</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="empty-state py-24 col-span-full">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Building2 className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="font-display text-xl font-semibold mb-2 text-foreground">
        Nenhum cliente cadastrado
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Cadastre o primeiro cliente para começar a documentar os serviços de paisagismo.
      </p>
      <Button variant="terracota" asChild>
        <Link to="/clientes/novo">
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Link>
      </Button>
    </div>
  );
}

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredClientes = mockClientes.filter((cliente) => {
    const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.bairro.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || cliente.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Clientes
          </h1>
          <p className="text-muted-foreground">
            Gerencie os clientes e seus jardins
          </p>
        </div>
        <Button variant="terracota" asChild>
          <Link to="/clientes/novo">
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
            <SelectItem value="prospecto">Prospectos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filteredClientes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClientes.map((cliente) => (
            <ClienteCard key={cliente.id} cliente={cliente} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </AppLayout>
  );
}

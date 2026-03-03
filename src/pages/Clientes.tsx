import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, MapPin, Loader2 } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-primary/20 text-primary border-primary/30" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-muted" },
  prospecto: { label: "Prospecto", className: "bg-primary/10 text-primary/80 border-primary/20" },
};

interface Cliente {
  id: string;
  nome: string;
  endereco: string | null;
  bairro: string | null;
  condominio: string | null;
  cidade: string | null;
  cep: string | null;
  status: string;
}

function ClienteCard({ cliente }: { cliente: Cliente }) {
  const status = statusConfig[cliente.status] || statusConfig.ativo;

  // Monta o endereço completo
  const enderecoCompleto = [
    cliente.endereco,
    cliente.bairro,
    cliente.condominio,
    cliente.cidade,
    cliente.cep,
  ].filter(Boolean).join(" • ");

  return (
    <Link to={`/clientes/${cliente.id}`} className="block">
      <article className="card-botanical p-5 h-full animate-fade-in hover:shadow-card transition-all group">
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {cliente.nome}
            </h3>
            {enderecoCompleto && (
              <div className="flex items-start gap-1.5 text-sm text-muted-foreground mt-2">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{enderecoCompleto}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-primary/10">
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
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
        <MapPin className="w-10 h-10 text-muted-foreground" />
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
  const [visibleCount, setVisibleCount] = useState(20);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, endereco, bairro, condominio, cidade, cep, status")
        .order("nome");
      
      if (error) throw error;
      return data as Cliente[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const filteredClientes = clientes.filter((cliente) => {
    const matchesSearch = cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.bairro?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || cliente.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Reset visible count when filters change
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setVisibleCount(20);
  };
  const handleStatus = (value: string) => {
    setStatusFilter(value);
    setVisibleCount(20);
  };

  const visibleClientes = filteredClientes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredClientes.length;

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
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatus}>
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

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredClientes.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleClientes.map((cliente) => (
              <ClienteCard key={cliente.id} cliente={cliente} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={() => setVisibleCount((c) => c + 20)}>
                Carregar mais ({filteredClientes.length - visibleCount} restantes)
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState />
      )}
    </AppLayout>
  );
}

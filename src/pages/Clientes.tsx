import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Phone, Mail, MapPin, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const statusConfig: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-primary/20 text-primary border-primary/30" },
  inativo: { label: "Inativo", className: "bg-muted text-muted-foreground border-muted" },
  prospecto: { label: "Prospecto", className: "bg-primary/10 text-primary/80 border-primary/20" },
};

interface ClienteComLocais {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  status: string;
  locais_count: number;
}

function ClienteCard({ cliente }: { cliente: ClienteComLocais }) {
  const status = statusConfig[cliente.status] || statusConfig.ativo;

  return (
    <Link to={`/clientes/${cliente.id}`} className="block">
      <article className="card-botanical p-5 h-full animate-fade-in hover:shadow-card transition-all group">
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {cliente.nome}
            </h3>
            <div className="space-y-1.5 mt-2">
              {cliente.telefone && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{cliente.telefone}</span>
                </div>
              )}
              {cliente.email && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{cliente.email}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{cliente.locais_count} {cliente.locais_count === 1 ? "local" : "locais"}</span>
              </div>
            </div>
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
        Cadastre o primeiro cliente para começar.
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
  const [visibleCount, setVisibleCount] = useState(20);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes-com-locais"],
    queryFn: async () => {
      // Fetch clients
      const { data: clientesData, error: cErr } = await supabase
        .from("clientes")
        .select("id, nome, telefone, email, status")
        .order("nome");
      if (cErr) throw cErr;

      // Fetch locais count per client
      const { data: locaisData, error: lErr } = await supabase
        .from("locais_cliente")
        .select("cliente_id");
      if (lErr) throw lErr;

      const countMap = new Map<string, number>();
      locaisData.forEach((l: any) => {
        countMap.set(l.cliente_id, (countMap.get(l.cliente_id) || 0) + 1);
      });

      return (clientesData || []).map((c: any) => ({
        ...c,
        locais_count: countMap.get(c.id) || 0,
      })) as ClienteComLocais[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Get phone from proprietarios for clients without direct telefone
  const filteredClientes = clientes.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setVisibleCount(20);
  };

  const visibleClientes = filteredClientes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredClientes.length;

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Clientes
          </h1>
          <p className="text-muted-foreground">
            Gerencie clientes, locais e projetos
          </p>
        </div>
        <Button variant="terracota" asChild>
          <Link to="/clientes/novo">
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

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

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrcamentoRow {
  id: string;
  codigo: string;
  status: string;
  data_criacao: string | null;
  local_endereco: string | null;
  cidade: string | null;
  estado: string | null;
  valor_negociado_final: number | null;
}

const statusColors: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  em_cotacao: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  aguardando_aprovacao: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  aprovado: "bg-primary/15 text-primary border-primary/30",
  expirado: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/15 text-destructive border-destructive/30",
  revisao: "bg-amber-500/15 text-amber-700 border-amber-500/30",
};

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  em_cotacao: "Em Cotação",
  aguardando_aprovacao: "Aguardando Aprovação",
  aprovado: "Aprovado",
  expirado: "Expirado",
  cancelado: "Cancelado",
  revisao: "Em Revisão",
};

export default function Orcamentos() {
  const { data: orcamentos = [], isLoading } = useQuery({
    queryKey: ["orcamentos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orcamentos")
        .select("id, codigo, status, data_criacao, local_endereco, cidade, estado, valor_negociado_final")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as OrcamentoRow[];
    },
  });

  const formatCurrency = (v: number | null) =>
    v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-foreground">Orçamentos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Propostas comerciais e cotações
            </p>
          </div>
          <Link to="/orcamentos/novo">
            <Button variant="terracota">
              <Plus className="w-4 h-4" />
              Novo Orçamento
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : orcamentos.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-display text-xl text-foreground mb-2">Nenhum orçamento ainda</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie o primeiro orçamento para começar.
            </p>
            <Link to="/orcamentos/novo">
              <Button variant="terracota">
                <Plus className="w-4 h-4" />
                Criar Orçamento
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-3">
            {orcamentos.map((o) => (
              <Link key={o.id} to={`/orcamentos/${o.id}`}>
                <Card className="p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{o.codigo}</span>
                        <Badge variant="outline" className={statusColors[o.status] || ""}>
                          {statusLabels[o.status] || o.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {o.local_endereco || "Sem endereço"}
                        {o.cidade && ` · ${o.cidade}${o.estado ? `/${o.estado}` : ""}`}
                      </p>
                      {o.data_criacao && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Criado em {format(new Date(o.data_criacao), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="font-bold text-foreground">{formatCurrency(o.valor_negociado_final)}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

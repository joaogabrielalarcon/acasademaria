import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
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
  created_at: string | null;
  data_criacao: string | null;
  local_endereco: string | null;
  cidade: string | null;
  estado: string | null;
  valor_negociado_final: number | null;
}

const FILTROS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "rascunho", label: "Rascunho" },
  { value: "em_cotacao", label: "Em cotação" },
  { value: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { value: "aprovado", label: "Aprovado" },
  { value: "nao_aprovado", label: "Não aprovado" },
];

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  em_cotacao: "Em Cotação",
  aguardando_aprovacao: "Aguardando Aprovação",
  aprovado: "Aprovado",
  expirado: "Expirado",
  cancelado: "Não Aprovado",
  nao_aprovado: "Não Aprovado",
  revisao: "Em Revisão",
};

export default function Orcamentos() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<string>("todos");

  const { data: orcamentos = [], isLoading } = useQuery({
    queryKey: ["orcamentos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orcamentos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as OrcamentoRow[];
    },
  });

  const isNaoAprovado = (s: string) => s === "nao_aprovado" || s === "cancelado";

  const filtrados =
    filtro === "todos"
      ? orcamentos
      : filtro === "nao_aprovado"
        ? orcamentos.filter((o) => isNaoAprovado(o.status))
        : orcamentos.filter((o) => o.status === filtro);

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
          <Button variant="terracota" onClick={() => navigate("/orcamentos/novo")}>
            <Plus className="w-4 h-4" />
            Novo Orçamento
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <Button
              key={f.value}
              variant={filtro === f.value ? "terracota" : "outline"}
              size="sm"
              onClick={() => setFiltro(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtrados.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-display text-xl text-foreground mb-2">Nenhum orçamento encontrado</h3>
            <Button variant="terracota" onClick={() => navigate("/orcamentos/novo")}>
              <Plus className="w-4 h-4" />
              Criar primeiro orçamento
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtrados.map((o) => (
              <Link key={o.id} to={`/orcamentos/${o.id}`}>
                <Card className="p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{o.codigo}</span>
                        <Badge variant="outline">
                          {statusLabels[o.status] || o.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {o.local_endereco || "Sem endereço"}
                        {o.cidade && ` · ${o.cidade}${o.estado ? `/${o.estado}` : ""}`}
                      </p>
                      {(o.data_criacao || o.created_at) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Criado em {format(new Date(o.data_criacao || o.created_at!), "dd/MM/yyyy", { locale: ptBR })}
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

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, FileText, Users, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRegistrosCliente } from "@/hooks/useCliente";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ExecucaoTabProps {
  projetoId: string;
  clienteId: string;
  propostaIds?: string[]; // propostas vinculadas ao projeto (futuro)
}

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

const statusConfig: Record<string, { label: string; className: string }> = {
  realizado: { label: "Realizado", className: "bg-green-500/20 text-green-700" },
  pendente: { label: "Pendente", className: "bg-amber-500/20 text-amber-700" },
  cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground" },
};

export function ExecucaoTab({ projetoId, clienteId }: ExecucaoTabProps) {
  // Fetch registros linked to this project (via proposta_id or tags)
  // For now, fetch all registros of the client and filter
  const { data: registros = [], isLoading } = useRegistrosCliente(clienteId);

  // Get colaboradores for names
  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores_basico")
        .select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  const colaboradorMap = new Map(colaboradores.map((c) => [c.id, c.nome]));

  // Summary stats
  const stats = useMemo(() => {
    const realizados = registros.filter((r) => r.status === "realizado").length;
    const pendentes = registros.filter((r) => r.status === "pendente").length;
    const porTipo: Record<string, number> = {};
    registros.forEach((r) => {
      porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1;
    });
    return { total: registros.length, realizados, pendentes, porTipo };
  }, [registros]);

  const formatDate = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-botanical p-4">
          <p className="text-sm text-muted-foreground">Total de Registros</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="card-botanical p-4">
          <p className="text-sm text-muted-foreground">Realizados</p>
          <p className="text-2xl font-bold text-green-700">{stats.realizados}</p>
        </div>
        <div className="card-botanical p-4">
          <p className="text-sm text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold text-amber-700">{stats.pendentes}</p>
        </div>
      </div>

      {/* Types breakdown */}
      {Object.keys(stats.porTipo).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.porTipo).map(([tipo, count]) => (
            <Badge key={tipo} variant="outline" className="text-sm">
              {tipoLabels[tipo] || tipo}: {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Timeline */}
      {registros.length > 0 ? (
        <div className="space-y-3">
          {registros.slice(0, 20).map((registro) => {
            const st = statusConfig[registro.status] || statusConfig.realizado;
            return (
              <Link
                key={registro.id}
                to={`/registros/${registro.id}`}
                className="card-botanical p-4 block hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={st.className}>
                        {st.label}
                      </Badge>
                      <Badge variant="outline">
                        {tipoLabels[registro.tipo] || registro.tipo}
                      </Badge>
                    </div>
                    <p className="text-foreground font-medium line-clamp-2">{registro.descricao}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(registro.data_servico)}
                      </span>
                      {registro.equipe_presente_ids && registro.equipe_presente_ids.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {registro.equipe_presente_ids.map((eId) => colaboradorMap.get(eId) || "").filter(Boolean).slice(0, 3).join(", ")}
                          {registro.equipe_presente_ids.length > 3 && ` +${registro.equipe_presente_ids.length - 3}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {registros.length > 20 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Mostrando 20 de {registros.length} registros
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum registro de execução encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Os registros de serviço deste cliente aparecerão aqui.
          </p>
        </div>
      )}
    </div>
  );
}

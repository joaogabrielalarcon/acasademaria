import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoPrecosProps {
  tipo: "planta" | "insumo";
  itemId: string;
}

interface HistoricoPreco {
  id: string;
  preco_anterior: number | null;
  preco_novo: number | null;
  data_alteracao: string;
  fornecedor_id: string | null;
  usuario_id: string | null;
  observacao: string | null;
}

export function HistoricoPrecos({ tipo, itemId }: HistoricoPrecosProps) {
  const column = tipo === "planta" ? "planta_id" : "insumo_id";

  const { data: historico = [], isLoading } = useQuery({
    queryKey: ["historico-precos", tipo, itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_precos")
        .select("*")
        .eq("tipo_item", tipo)
        .eq(column, itemId)
        .order("data_alteracao", { ascending: false });

      if (error) throw error;
      return data as HistoricoPreco[];
    },
    enabled: !!itemId,
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  const fornMap = new Map(fornecedores.map((f) => [f.id, f.nome]));
  const profileMap = new Map(profiles.map((p) => [p.id, p.nome]));

  if (isLoading) {
    return <p className="text-sm text-foreground/50 py-4">Carregando histórico...</p>;
  }

  if (historico.length === 0) {
    return (
      <p className="text-sm text-foreground/60 py-4">
        Nenhum registro de preço encontrado.
      </p>
    );
  }

  return (
    <div className="card-botanical overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Preço Anterior</TableHead>
            <TableHead>Preço Novo</TableHead>
            <TableHead>Responsável</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {historico.map((h) => (
            <TableRow key={h.id}>
              <TableCell>
                {format(new Date(h.data_alteracao), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                {h.fornecedor_id ? fornMap.get(h.fornecedor_id) || "-" : "-"}
              </TableCell>
              <TableCell>
                {h.preco_anterior != null
                  ? `R$ ${h.preco_anterior.toFixed(2)}`
                  : "-"}
              </TableCell>
              <TableCell>
                {h.preco_novo != null
                  ? `R$ ${h.preco_novo.toFixed(2)}`
                  : "-"}
              </TableCell>
              <TableCell>
                {h.usuario_id ? profileMap.get(h.usuario_id) || "-" : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

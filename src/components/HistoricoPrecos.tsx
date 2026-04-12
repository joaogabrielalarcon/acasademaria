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
  item_id: string;
  item_tipo: string;
  fornecedor_id: string | null;
  preco: number;
  data_orcamento: string;
  registrado_por: string | null;
  observacoes: string | null;
}

export function HistoricoPrecos({ tipo, itemId }: HistoricoPrecosProps) {
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ["historico-precos", tipo, itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_precos")
        .select("*")
        .eq("item_tipo", tipo)
        .eq("item_id", itemId)
        .order("data_orcamento", { ascending: false });

      if (error) throw error;
      return data as unknown as HistoricoPreco[];
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

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  const fornMap = new Map(fornecedores.map((f) => [f.id, f.nome]));
  const colabMap = new Map(colaboradores.map((c) => [c.id, c.nome]));

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
            <TableHead>Preço</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Observações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {historico.map((h) => (
            <TableRow key={h.id}>
              <TableCell>
                {format(new Date(h.data_orcamento), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                {h.fornecedor_id ? fornMap.get(h.fornecedor_id) || "-" : "-"}
              </TableCell>
              <TableCell>
                {`R$ ${h.preco.toFixed(2)}`}
              </TableCell>
              <TableCell>
                {h.registrado_por ? colabMap.get(h.registrado_por) || "-" : "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {h.observacoes || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

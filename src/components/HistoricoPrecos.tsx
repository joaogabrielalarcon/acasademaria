import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Users } from "lucide-react";
import { useFornecedores } from "@/hooks/useFornecedores";
import { toast } from "sonner";

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

// NOTE: Em versão futura, a Mafe terá capacidade de registrar cotações
// via texto ou voz — o usuário descreve o preço e a IA preenche os campos
// automaticamente, confirmando com o usuário antes de salvar.

export function HistoricoPrecos({ tipo, itemId }: HistoricoPrecosProps) {
  const [showForm, setShowForm] = useState(false);
  const [showPorFornecedor, setShowPorFornecedor] = useState(false);
  const [formData, setFormData] = useState({
    fornecedor_id: "",
    preco: "",
    data_orcamento: "",
    observacoes: "",
  });

  const queryClient = useQueryClient();
  const { data: fornecedores = [] } = useFornecedores();

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("historico_precos").insert({
        item_id: itemId,
        item_tipo: tipo,
        fornecedor_id: formData.fornecedor_id || null,
        preco: parseFloat(formData.preco),
        data_orcamento: formData.data_orcamento,
        observacoes: formData.observacoes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historico-precos", tipo, itemId] });
      toast.success("Cotação registrada!");
      setShowForm(false);
      setFormData({ fornecedor_id: "", preco: "", data_orcamento: "", observacoes: "" });
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const handleSubmitCotacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fornecedor_id) { toast.error("Fornecedor é obrigatório"); return; }
    if (!formData.preco || parseFloat(formData.preco) <= 0) { toast.error("Preço é obrigatório"); return; }
    if (!formData.data_orcamento) { toast.error("Data do orçamento é obrigatória"); return; }
    saveMutation.mutate();
  };

  // Último orçamento
  const ultimo = historico[0];

  // Preço mais recente por fornecedor
  const porFornecedor = historico.reduce<Record<string, HistoricoPreco>>((acc, h) => {
    if (h.fornecedor_id && !acc[h.fornecedor_id]) {
      acc[h.fornecedor_id] = h;
    }
    return acc;
  }, {});

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4">Carregando histórico...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Último orçamento */}
      <div className="rounded-lg border border-border bg-card p-4">
        {ultimo ? (
          <p className="text-sm text-foreground">
            <span className="font-medium">Último orçamento:</span>{" "}
            <span className="font-bold">R$ {ultimo.preco.toFixed(2)}</span>
            {" — "}
            {ultimo.fornecedor_id ? fornMap.get(ultimo.fornecedor_id) || "Fornecedor" : "—"}
            {" — "}
            {format(new Date(ultimo.data_orcamento), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma cotação registrada ainda</p>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" /> Registrar Cotação
        </Button>
        {Object.keys(porFornecedor).length > 0 && (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowPorFornecedor(!showPorFornecedor)}>
            <Users className="w-3.5 h-3.5" /> Ver por fornecedor
          </Button>
        )}
      </div>

      {/* Tabela comparativa por fornecedor */}
      {showPorFornecedor && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Último Preço</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(porFornecedor).map((h) => (
                <TableRow key={h.fornecedor_id}>
                  <TableCell className="font-medium">
                    {h.fornecedor_id ? fornMap.get(h.fornecedor_id) || "-" : "-"}
                  </TableCell>
                  <TableCell>R$ {h.preco.toFixed(2)}</TableCell>
                  <TableCell>
                    {format(new Date(h.data_orcamento), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Lista de histórico */}
      {historico.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Preço</TableHead>
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
                  <TableCell className="font-medium">R$ {h.preco.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">{h.observacoes || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal registrar cotação */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Cotação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitCotacao} className="space-y-4">
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Select value={formData.fornecedor_id} onValueChange={(v) => setFormData({ ...formData, fornecedor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preço R$ *</Label>
              <Input
                type="number"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                placeholder="0.00"
                min={0}
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Data do orçamento *</Label>
              <Input
                type="date"
                value={formData.data_orcamento}
                onChange={(e) => setFormData({ ...formData, data_orcamento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

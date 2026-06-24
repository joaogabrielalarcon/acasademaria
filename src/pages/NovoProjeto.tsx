import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProjeto } from "@/hooks/useProjetos";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import { DraftResumeBanner } from "@/components/DraftResumeBanner";

interface ParcelaConfig {
  valor: string;
  data_vencimento: string;
}

export default function NovoProjeto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const { data: projeto, isLoading: loadingProjeto } = useProjeto(id);

  const [form, setForm] = useState({
    cliente_id: "",
    local_id: "",
    titulo: "",
    descricao: "",
    tipo: "implantacao",
    observacoes: "",
    valor_mensal: "",
    dia_vencimento: "10",
  });

  const [parcelas, setParcelas] = useState<ParcelaConfig[]>([
    { valor: "", data_vencimento: "" },
  ]);

  useEffect(() => {
    if (projeto) {
      setForm({
        cliente_id: projeto.cliente_id,
        local_id: projeto.local_id || "",
        titulo: projeto.titulo,
        descricao: projeto.descricao || "",
        tipo: projeto.tipo || "implantacao",
        observacoes: projeto.observacoes || "",
        valor_mensal: projeto.valor_mensal ? String(projeto.valor_mensal) : "",
        dia_vencimento: String(projeto.dia_vencimento || 10),
      });
      const config = (projeto as any).parcelas_config;
      if (Array.isArray(config) && config.length > 0) {
        setParcelas(config.map((p: any) => ({
          valor: p.valor ? String(p.valor) : "",
          data_vencimento: p.data_vencimento || "",
        })));
      }
    }
  }, [projeto]);

  useEffect(() => {
    if (!isEditing) {
      const params = new URLSearchParams(window.location.search);
      const clienteId = params.get("cliente_id");
      const localId = params.get("local_id");
      if (clienteId) setForm(f => ({ ...f, cliente_id: clienteId }));
      if (localId) setForm(f => ({ ...f, local_id: localId }));
    }
  }, [isEditing]);

  const addParcela = () => setParcelas(p => [...p, { valor: "", data_vencimento: "" }]);
  const removeParcela = (i: number) => setParcelas(p => p.filter((_, idx) => idx !== i));
  const updateParcela = (i: number, field: keyof ParcelaConfig, value: string) => {
    setParcelas(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const isManutencao = form.tipo === "manutencao";

  const totalParcelas = parcelas.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parcelasConfig = !isManutencao
        ? parcelas
            .filter(p => p.valor)
            .map(p => ({
              valor: parseFloat(p.valor) || 0,
              data_vencimento: p.data_vencimento || null,
            }))
        : null;

      const payload: Record<string, any> = {
        cliente_id: form.cliente_id,
        local_id: form.local_id || null,
        titulo: form.titulo,
        descricao: form.descricao || null,
        tipo: form.tipo,
        observacoes: form.observacoes || null,
        valor_mensal: isManutencao && form.valor_mensal ? parseFloat(form.valor_mensal) : null,
        dia_vencimento: isManutencao ? parseInt(form.dia_vencimento) || 10 : 10,
        parcelas_config: parcelasConfig,
        valor_total: !isManutencao ? totalParcelas : null,
      };

      if (isEditing) {
        const { error } = await supabase.from("projetos").update(payload as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projetos").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projetos"] });
      toast({ title: isEditing ? "Projeto atualizado" : "Projeto criado" });
      navigate(form.cliente_id ? `/clientes/${form.cliente_id}?tab=projetos` : "/");
    },
    onError: () => {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_id || !form.titulo || !form.descricao.trim()) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  if (isEditing && loadingProjeto) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Link
        to={form.cliente_id ? `/clientes/${form.cliente_id}?tab=projetos` : "/"}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar</span>
      </Link>

      <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-6">
        {isEditing ? "Editar Projeto" : "Novo Projeto"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <Label>Título *</Label>
          <Input
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            placeholder="Número da proposta"
          />
        </div>

        <div className="space-y-2">
          <Label>Descrição *</Label>
          <Textarea
            value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            placeholder="Detalhes do projeto..."
            rows={3}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo de Projeto</Label>
          <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="implantacao">Implantação</SelectItem>
              <SelectItem value="manutencao">Manutenção</SelectItem>
              <SelectItem value="revitalizacao">Revitalização</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isManutencao && (
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-border bg-muted/30">
            <div className="space-y-2">
              <Label>Valor Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valor_mensal}
                onChange={e => setForm(f => ({ ...f, valor_mensal: e.target.value }))}
                placeholder="Ex: 3500,00"
              />
              <p className="text-xs text-muted-foreground">Valor de cada parcela mensal</p>
            </div>
            <div className="space-y-2">
              <Label>Dia de Vencimento</Label>
              <Input
                type="number"
                min="1"
                max="28"
                value={form.dia_vencimento}
                onChange={e => setForm(f => ({ ...f, dia_vencimento: e.target.value }))}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">Dia do mês para vencimento (1-28)</p>
            </div>
          </div>
        )}

        {!isManutencao && (
          <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Parcelas do Projeto</Label>
              <Button type="button" variant="outline" size="sm" onClick={addParcela}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Parcela
              </Button>
            </div>

            {parcelas.map((parcela, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-end">
                <div className="flex items-center justify-center w-8 h-9 rounded bg-muted text-sm font-medium text-muted-foreground">
                  {i + 1}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={parcela.valor}
                    onChange={e => updateParcela(i, "valor", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vencimento</Label>
                  <Input
                    type="date"
                    value={parcela.data_vencimento}
                    onChange={e => updateParcela(i, "data_vencimento", e.target.value)}
                  />
                </div>
                {parcelas.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeParcela(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            {totalParcelas > 0 && (
              <div className="pt-2 border-t border-border flex justify-between text-sm">
                <span className="text-muted-foreground">{parcelas.filter(p => p.valor).length} parcela(s)</span>
                <span className="font-semibold">Total: R$ {totalParcelas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            value={form.observacoes}
            onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
            rows={3}
          />
        </div>

        <Button type="submit" variant="terracota" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {isEditing ? "Salvar Alterações" : "Criar Projeto"}
        </Button>
      </form>
    </AppLayout>
  );
}

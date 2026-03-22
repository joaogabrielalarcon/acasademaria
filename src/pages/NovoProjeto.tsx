import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useClientesSimples } from "@/hooks/useClientes";
import { useProjeto, projetoStatusConfig } from "@/hooks/useProjetos";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useColaboradores } from "@/hooks/useColaboradores";

export default function NovoProjeto() {
  const { id } = useParams(); // projeto id for editing
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const { data: projeto, isLoading: loadingProjeto } = useProjeto(id);
  const { data: clientes = [] } = useClientesSimples();
  const { data: colaboradores = [] } = useColaboradores();

  const [form, setForm] = useState({
    cliente_id: "",
    local_id: "",
    titulo: "",
    descricao: "",
    status: "orcamento",
    tipo: "implantacao",
    data_inicio: "",
    data_previsao: "",
    responsavel_id: "",
    observacoes: "",
  });

  useEffect(() => {
    if (projeto) {
      setForm({
        cliente_id: projeto.cliente_id,
        local_id: (projeto as any).local_id || "",
        titulo: projeto.titulo,
        descricao: projeto.descricao || "",
        status: projeto.status,
        tipo: (projeto as any).tipo || "implantacao",
        data_inicio: projeto.data_inicio || "",
        data_previsao: projeto.data_previsao || "",
        responsavel_id: projeto.responsavel_id || "",
        observacoes: projeto.observacoes || "",
      });
    }
  }, [projeto]);

  // Pre-fill client from URL search params
  useEffect(() => {
    if (!isEditing) {
      const params = new URLSearchParams(window.location.search);
      const clienteId = params.get("cliente_id");
      if (clienteId) setForm(f => ({ ...f, cliente_id: clienteId }));
    }
  }, [isEditing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        cliente_id: form.cliente_id,
        titulo: form.titulo,
        descricao: form.descricao || null,
        status: form.status,
        tipo: form.tipo,
        data_inicio: form.data_inicio || null,
        data_previsao: form.data_previsao || null,
        responsavel_id: form.responsavel_id || null,
        observacoes: form.observacoes || null,
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
    if (!form.cliente_id || !form.titulo) {
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
        {/* Cliente */}
        <div className="space-y-2">
          <Label>Cliente *</Label>
          <Select value={form.cliente_id} onValueChange={v => setForm(f => ({ ...f, cliente_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <Label>Título *</Label>
          <Input
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            placeholder="Ex: Implantação do jardim frontal"
          />
        </div>

        {/* Descrição */}
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea
            value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            placeholder="Detalhes do projeto..."
            rows={3}
          />
        </div>

        {/* Tipo */}
        <div className="space-y-2">
          <Label>Tipo de Projeto</Label>
          <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="implantacao">Implantação</SelectItem>
              <SelectItem value="manutencao">Manutenção</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(projetoStatusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Datas */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Data de Início</Label>
            <Input
              type="date"
              value={form.data_inicio}
              onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Previsão de Conclusão</Label>
            <Input
              type="date"
              value={form.data_previsao}
              onChange={e => setForm(f => ({ ...f, data_previsao: e.target.value }))}
            />
          </div>
        </div>

        {/* Responsável */}
        <div className="space-y-2">
          <Label>Responsável</Label>
          <Select value={form.responsavel_id} onValueChange={v => setForm(f => ({ ...f, responsavel_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {colaboradores.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Observações */}
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

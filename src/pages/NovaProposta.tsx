import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, X, Calendar, DollarSign, FileText, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClientesSimples } from "@/hooks/useClientes";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import { DraftResumeBanner } from "@/components/DraftResumeBanner";

const statusOptions = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "aprovada", label: "Aprovada" },
  { value: "recusada", label: "Recusada" },
];

export default function NovaProposta() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clienteIdFromUrl = searchParams.get("cliente");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading: loadingClientes } = useClientesSimples();

  const [formData, setFormData] = useState({
    cliente_id: clienteIdFromUrl || "",
    codigo: "",
    titulo: "",
    descricao: "",
    status: "rascunho",
    data_envio: "",
    valor: "",
    observacoes: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente_id || !formData.codigo || !formData.titulo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha cliente, código e título da proposta.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from("propostas").insert({
        cliente_id: formData.cliente_id,
        codigo: formData.codigo,
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        status: formData.status,
        data_envio: formData.data_envio || null,
        valor: formData.valor ? parseFloat(formData.valor) : null,
        observacoes: formData.observacoes || null,
      });

      if (error) throw error;

      toast({
        title: "Proposta salva!",
        description: "A proposta foi criada com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ["propostas", clienteIdFromUrl] });

      if (clienteIdFromUrl) {
        navigate(`/clientes/${clienteIdFromUrl}?tab=propostas`);
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Erro ao salvar proposta:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a proposta.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (clienteIdFromUrl) {
      navigate(`/clientes/${clienteIdFromUrl}`);
    } else {
      navigate("/");
    }
  };

  const generateCodigo = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setFormData(prev => ({ ...prev, codigo: `${year}-${random}` }));
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nova Proposta</h1>
            <p className="text-sm text-muted-foreground">
              Crie uma proposta comercial para o cliente
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente e Código */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Identificação
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingClientes ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : (
                      clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo">Código da Proposta *</Label>
                <div className="flex gap-2">
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="2024-001"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generateCodigo}>
                    Gerar
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="titulo">Título da Proposta *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Manutenção mensal, Implantação jardim frontal..."
                required
              />
            </div>
          </div>

          {/* Status e Datas */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Status e Datas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_envio">Data de Envio</Label>
                <Input
                  id="data_envio"
                  type="date"
                  value={formData.data_envio}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_envio: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                    placeholder="0,00"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Detalhes</h2>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição / Escopo</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva o escopo da proposta, serviços incluídos, periodicidade..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações Internas</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Notas internas sobre a proposta..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="w-4 h-4" />
              Salvar Proposta
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MessageSquare, Loader2, Calendar, User } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { parseISO, isAfter, startOfDay } from "date-fns";
import { useClientesSimples } from "@/hooks/useClientes";
import { useTrechosCliente } from "@/hooks/useCliente";
import { supabase } from "@/integrations/supabase/client";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import { DraftResumeBanner } from "@/components/DraftResumeBanner";

const prioridadeOptions = [
  { value: "baixa", label: "Baixa", className: "text-muted-foreground" },
  { value: "normal", label: "Normal", className: "text-foreground" },
  { value: "alta", label: "Alta", className: "text-amber-600" },
  { value: "urgente", label: "Urgente", className: "text-destructive" },
];

const statusOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvido", label: "Resolvido" },
];

const solicitanteOptions = [
  { value: "proprietario", label: "Proprietário" },
  { value: "funcionario_casa", label: "Funcionário da casa" },
  { value: "assessor", label: "Assessor" },
  { value: "outro", label: "Outro" },
];

export default function NovaSolicitacao() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const clienteIdFromUrl = searchParams.get("cliente") || "";
  const dataFromUrl = searchParams.get("data") || new Date().toISOString().split("T")[0];

  // Dados reais do banco
  const { data: clientesRaw = [], isLoading: loadingClientes } = useClientesSimples();
  const clientes = [...clientesRaw].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  // Form state
  const [selectedCliente, setSelectedCliente] = useState(clienteIdFromUrl);
  const [dataRegistro, setDataRegistro] = useState(dataFromUrl);
  const [descricao, setDescricao] = useState("");
  const [observacoesInternas, setObservacoesInternas] = useState("");
  const [prioridade, setPrioridade] = useState("normal");
  const [statusSolicitacao, setStatusSolicitacao] = useState("pendente");
  const [solicitante, setSolicitante] = useState("");
  const [solicitanteOutro, setSolicitanteOutro] = useState("");
  const [trechoId, setTrechoId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Trechos do cliente selecionado
  const { data: trechos = [] } = useTrechosCliente(selectedCliente || undefined);

  const clienteNome = clientes.find((c) => c.id === selectedCliente)?.nome;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCliente) {
      toast({
        title: "Cliente obrigatório",
        description: "Selecione um cliente para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!descricao.trim()) {
      toast({
        title: "Descrição obrigatória",
        description: "Informe a descrição da solicitação ou observação.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("registros")
        .insert({
          cliente_id: selectedCliente,
          data_servico: dataRegistro,
          tipo: "solicitacao",
          status: "realizado", // O registro em si está completo
          status_solicitacao: statusSolicitacao,
          prioridade,
          descricao: descricao.trim(),
          observacoes_internas: observacoesInternas.trim() || null,
          solicitante: solicitante === "outro" ? solicitanteOutro : solicitante || null,
          trecho_id: trechoId && trechoId !== "geral" ? trechoId : null,
          categorias_ids: [],
          equipe_presente_ids: [],
          executores_ids: [],
          midia: [],
        });

      if (error) throw error;

      toast({
        title: "Solicitação registrada!",
        description: "A solicitação foi salva com sucesso.",
      });

      if (clienteIdFromUrl) {
        navigate(`/clientes/${clienteIdFromUrl}?tab=diario`);
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Erro ao salvar solicitação:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      {/* Back Button */}
      <Link
        to={clienteIdFromUrl ? `/clientes/${clienteIdFromUrl}?tab=diario` : "/"}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>
          Voltar {clienteIdFromUrl && clienteNome ? `para ${clienteNome}` : "para Clientes"}
        </span>
      </Link>

      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            Nova Solicitação / Observação
          </h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Registre solicitações do cliente ou observações importantes
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente *</Label>
            <Select value={selectedCliente} onValueChange={setSelectedCliente}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {loadingClientes ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Data e Trecho */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="data" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data do Registro *
              </Label>
              <Input
                type="date"
                id="data"
                value={dataRegistro}
                onChange={(e) => setDataRegistro(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Trecho / Área</Label>
              <Select value={trechoId} onValueChange={setTrechoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Geral (toda a propriedade)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral (toda a propriedade)</SelectItem>
                  {trechos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Solicitante */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Quem solicitou
            </Label>
            <Select value={solicitante} onValueChange={setSolicitante}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {solicitanteOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {solicitante === "outro" && (
              <Input
                placeholder="Nome do solicitante"
                value={solicitanteOutro}
                onChange={(e) => setSolicitanteOutro(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <RadioGroup
              value={prioridade}
              onValueChange={setPrioridade}
              className="flex flex-wrap gap-4 pt-2"
            >
              {prioridadeOptions.map((p) => (
                <div key={p.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={p.value} id={`prioridade-${p.value}`} />
                  <Label
                    htmlFor={`prioridade-${p.value}`}
                    className={`font-normal cursor-pointer ${p.className}`}
                  >
                    {p.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Status da Solicitação */}
          <div className="space-y-2">
            <Label>Status de Acompanhamento</Label>
            <RadioGroup
              value={statusSolicitacao}
              onValueChange={setStatusSolicitacao}
              className="flex flex-wrap gap-4 pt-2"
            >
              {statusOptions.map((s) => (
                <div key={s.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={s.value} id={`status-${s.value}`} />
                  <Label
                    htmlFor={`status-${s.value}`}
                    className="font-normal cursor-pointer"
                  >
                    {s.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição da Solicitação / Observação *</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o que foi solicitado ou observado..."
              rows={4}
            />
          </div>

          {/* Observações Internas */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações Internas</Label>
            <Textarea
              id="observacoes"
              value={observacoesInternas}
              onChange={(e) => setObservacoesInternas(e.target.value)}
              placeholder="Anotações internas, não visíveis ao cliente..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(clienteIdFromUrl ? `/clientes/${clienteIdFromUrl}?tab=diario` : "/")}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="terracota" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Solicitação"
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

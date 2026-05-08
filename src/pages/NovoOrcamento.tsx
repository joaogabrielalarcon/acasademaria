import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Save,
  Check,
  Copy,
  Upload,
  Sparkles,
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Minus,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIAS_ITEM = [
  "Árvores",
  "Arbustos e Herbáceas",
  "Forrações",
  "Trepadeiras",
  "Palmeiras",
  "Gramado",
  "Vasos",
];

const UNIDADES_ITEM = ["UNID", "M²", "CX", "SACO", "POTE", "TOUCEIRA", "BANDEJA", "ROLO", "METRO"];

interface ItemMemorial {
  nome_popular: string;
  nome_cientifico: string | null;
  porte: string;
  quantidade: number;
  unidade: string;
  categoria: string;
  confianca: "alta" | "media" | "baixa";
}

interface TipoProposta {
  id: string;
  sigla: string;
  nome_completo: string;
}

const ETAPAS = [
  "Cabeçalho",
  "Memorial",
  "Fornecedores",
  "Cotação",
  "Insumos",
  "MO e Fretes",
  "Resumo",
];

const TIPOS_CLIENTE = [
  { value: "residencial", label: "Residencial" },
  { value: "condominio", label: "Condomínio" },
  { value: "resort", label: "Resort" },
  { value: "hotel", label: "Hotel" },
  { value: "comercial", label: "Comercial" },
];

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const REQUIRED_FIELDS: Array<keyof typeof initialForm> = [
  "tipo_proposta_id",
  "cliente_id",
  "local_endereco",
  "tipo_cliente",
  "cidade",
  "estado",
  "area_m2",
  "perfil_markup_id",
];

const initialForm = {
  tipo_proposta_id: "",
  tipo_proposta_sigla: "",
  codigo: "",
  cliente_id: "",
  local_endereco: "",
  tipo_cliente: "",
  cidade: "",
  estado: "",
  area_m2: "",
  perfil_markup_id: "",
  prazo_validade_dias: 20 as number | string,
  obs_interna: "",
  obs_proposta: "",
  data_envio: "",
  responsavel_id: "",
};

export default function NovoOrcamento() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [etapaAtual, setEtapaAtual] = useState(1);
  const [form, setForm] = useState({ ...initialForm });

  // Etapa 2 — Memorial
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfCarregado, setPdfCarregado] = useState(false);
  const [processandoPdf, setProcessandoPdf] = useState(false);
  const [itensMaterial, setItensMaterial] = useState<ItemMemorial[]>([]);
  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos-proposta"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tipos_proposta")
        .select("id, sigla, nome_completo")
        .eq("ativo", true)
        .order("sigla");
      if (error) throw error;
      return (data || []) as TipoProposta[];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-list-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome")
        .eq("status", "ativo")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: perfisMarkup = [] } = useQuery({
    queryKey: ["perfis-markup-ativos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("perfis_markup")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores-ativos-orc"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, user_id")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  // Default responsável = usuário logado
  useEffect(() => {
    (async () => {
      if (form.responsavel_id || isEdit) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const match = (colaboradores as any[]).find((c) => c.user_id === user.id);
      if (match) setForm((p) => ({ ...p, responsavel_id: match.id }));
    })();
  }, [colaboradores, isEdit]);

  const { data: orcamento } = useQuery({
    queryKey: ["orcamento", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("orcamentos")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (orcamento) {
      const sigla = (tipos as TipoProposta[]).find((t) => t.id === orcamento.tipo_proposta_id)?.sigla || "";
      setForm({
        tipo_proposta_id: orcamento.tipo_proposta_id || "",
        tipo_proposta_sigla: sigla,
        codigo: orcamento.codigo || "",
        cliente_id: orcamento.cliente_id || "",
        local_endereco: orcamento.local_endereco || "",
        tipo_cliente: orcamento.tipo_cliente || "",
        cidade: orcamento.cidade || "",
        estado: orcamento.estado || "",
        area_m2: orcamento.area_m2?.toString() || "",
        perfil_markup_id: orcamento.perfil_markup_id || "",
        prazo_validade_dias: orcamento.prazo_validade_dias ?? 20,
        obs_interna: orcamento.obs_interna || "",
        obs_proposta: orcamento.obs_proposta || "",
        data_envio: orcamento.data_envio || "",
        responsavel_id: orcamento.responsavel_id || "",
      });
    }
  }, [orcamento, tipos]);

  // Geração automática do código
  const handleTipoPropostaChange = async (tipoId: string) => {
    const tipo = (tipos as TipoProposta[]).find((t) => t.id === tipoId);
    if (!tipo) return;
    const sigla = tipo.sigla;
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const ano = String(agora.getFullYear()).slice(-2);
    try {
      const { count } = await (supabase as any)
        .from("orcamentos")
        .select("*", { count: "exact", head: true })
        .like("codigo", `${sigla}%${mes}${ano}`);
      const sequencial = String((count || 0) + 1).padStart(2, "0");
      const codigo = `${sigla}${sequencial}${mes}${ano}`;
      setForm((p) => ({ ...p, tipo_proposta_id: tipoId, tipo_proposta_sigla: sigla, codigo }));
    } catch {
      setForm((p) => ({ ...p, tipo_proposta_id: tipoId, tipo_proposta_sigla: sigla }));
    }
  };

  const camposObrigatoriosOk = useMemo(
    () => REQUIRED_FIELDS.every((k) => String((form as any)[k] ?? "").trim() !== ""),
    [form]
  );

  const buildPayload = () => ({
    codigo: form.codigo.trim() || null,
    tipo_proposta_id: form.tipo_proposta_id || null,
    cliente_id: form.cliente_id || null,
    local_endereco: form.local_endereco || null,
    tipo_cliente: form.tipo_cliente || null,
    cidade: form.cidade || null,
    estado: form.estado || null,
    area_m2: form.area_m2 ? parseFloat(form.area_m2) : null,
    perfil_markup_id: form.perfil_markup_id || null,
    prazo_validade_dias: form.prazo_validade_dias ? Number(form.prazo_validade_dias) : null,
    responsavel_id: form.responsavel_id || null,
    data_envio: form.data_envio || null,
    obs_interna: form.obs_interna || null,
    obs_proposta: form.obs_proposta || null,
    status: "rascunho" as const,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (isEdit) {
        const { error } = await (supabase as any).from("orcamentos").update(payload).eq("id", id);
        if (error) throw error;
        return id as string;
      } else {
        const { data, error } = await (supabase as any)
          .from("orcamentos")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      toast({ title: "Rascunho salvo com sucesso" });
      if (!isEdit) navigate(`/orcamentos/${newId}`, { replace: true });
    },
    onError: (e: any) => {
      toast({
        title: "Erro ao salvar",
        description: e?.message || "Verifique os campos",
        variant: "destructive",
      });
    },
  });

  const handleProxima = async () => {
    if (!camposObrigatoriosOk) return;
    try {
      await saveMutation.mutateAsync();
    } catch {
      return;
    }
    setEtapaAtual((e) => Math.min(ETAPAS.length, e + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copiarCodigo = async () => {
    if (!form.codigo) return;
    try {
      await navigator.clipboard.writeText(form.codigo);
      toast({ title: "Código copiado" });
    } catch {}
  };

  const Req = () => <span className="text-destructive ml-0.5">*</span>;

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="font-display text-2xl text-foreground">
                  {isEdit ? "Editar Orçamento" : "Novo Orçamento"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Etapa {etapaAtual} de {ETAPAS.length}
                </p>
              </div>
            </div>
          </div>

          {/* Barra de progresso */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              {ETAPAS.map((nome, idx) => {
                const numero = idx + 1;
                const ativa = numero === etapaAtual;
                const concluida = numero < etapaAtual;
                return (
                  <div key={nome} className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                        ativa && "bg-primary text-primary-foreground border-primary",
                        concluida && "bg-primary/20 text-primary border-primary/40",
                        !ativa && !concluida && "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {concluida ? <Check className="w-4 h-4" /> : numero}
                    </div>
                    <span
                      className={cn(
                        "text-xs whitespace-nowrap",
                        ativa ? "text-foreground font-semibold" : "text-muted-foreground"
                      )}
                    >
                      {nome}
                    </span>
                    {idx < ETAPAS.length - 1 && <div className="w-6 h-px bg-border" />}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Etapa 1 - Cabeçalho */}
          {etapaAtual === 1 && (
            <Card className="p-6 space-y-6">
              <div>
                <h2 className="font-display text-xl text-foreground">Cabeçalho</h2>
                <p className="text-sm text-muted-foreground">Dados básicos do orçamento</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* COLUNA ESQUERDA */}
                <div className="space-y-4">
                  {/* Tipo de Proposta */}
                  <div className="space-y-2">
                    <Label>Tipo de Proposta<Req /></Label>
                    <Select value={form.tipo_proposta_id} onValueChange={handleTipoPropostaChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {(tipos as TipoProposta[]).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.sigla} — {t.nome_completo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Código gerado */}
                  <div className="space-y-2">
                    <Label>Código gerado</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={form.codigo}
                        placeholder="Será gerado ao escolher o tipo"
                        className="bg-muted"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={copiarCodigo} disabled={!form.codigo}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Cliente */}
                  <div className="space-y-2">
                    <Label>Cliente<Req /></Label>
                    <Select
                      value={form.cliente_id}
                      onValueChange={(v) => setForm((c) => ({ ...c, cliente_id: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {(clientes as any[]).map((cl) => (
                          <SelectItem key={cl.id} value={cl.id}>{cl.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Local / Endereço */}
                  <div className="space-y-2">
                    <Label>Local / Endereço<Req /></Label>
                    <Textarea
                      rows={3}
                      value={form.local_endereco}
                      onChange={(e) => setForm((c) => ({ ...c, local_endereco: e.target.value }))}
                    />
                  </div>

                  {/* Tipo de cliente - toggles */}
                  <div className="space-y-2">
                    <Label>Tipo de cliente<Req /></Label>
                    <div className="flex flex-wrap gap-2">
                      {TIPOS_CLIENTE.map((tc) => {
                        const ativo = form.tipo_cliente === tc.value;
                        return (
                          <button
                            key={tc.value}
                            type="button"
                            onClick={() => setForm((c) => ({ ...c, tipo_cliente: tc.value }))}
                            className={cn(
                              "px-3 py-1.5 rounded-md border text-sm transition-colors",
                              ativo
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-foreground border-border hover:bg-muted"
                            )}
                          >
                            {tc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cidade / Estado */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Cidade<Req /></Label>
                      <Input
                        value={form.cidade}
                        onChange={(e) => setForm((c) => ({ ...c, cidade: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado<Req /></Label>
                      <Select
                        value={form.estado}
                        onValueChange={(v) => setForm((c) => ({ ...c, estado: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>
                          {UFS.map((uf) => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA */}
                <div className="space-y-4">
                  {/* Área */}
                  <div className="space-y-2">
                    <Label>Área total (m²)<Req /></Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.area_m2}
                      onChange={(e) => setForm((c) => ({ ...c, area_m2: e.target.value }))}
                    />
                  </div>

                  {/* Perfil de markup */}
                  <div className="space-y-2">
                    <Label>Perfil de markup<Req /></Label>
                    {(perfisMarkup as any[]).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum perfil cadastrado. Crie um em Configurações → Perfis de Markup
                      </p>
                    ) : (
                      <Select
                        value={form.perfil_markup_id}
                        onValueChange={(v) => setForm((c) => ({ ...c, perfil_markup_id: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {(perfisMarkup as any[]).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Prazo validade */}
                  <div className="space-y-2">
                    <Label>Prazo de validade (dias)</Label>
                    <Input
                      type="number"
                      value={form.prazo_validade_dias}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, prazo_validade_dias: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      O prazo conta a partir da data de envio
                    </p>
                  </div>

                  {/* Responsável */}
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select
                      value={form.responsavel_id}
                      onValueChange={(v) => setForm((c) => ({ ...c, responsavel_id: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {(colaboradores as any[]).map((co) => (
                          <SelectItem key={co.id} value={co.id}>{co.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Data envio */}
                  <div className="space-y-2">
                    <Label>Data de envio ao cliente</Label>
                    <Input
                      type="date"
                      value={form.data_envio}
                      onChange={(e) => setForm((c) => ({ ...c, data_envio: e.target.value }))}
                    />
                  </div>

                  {/* Obs interna */}
                  <div className="space-y-2">
                    <Label>Observação interna (não aparece na proposta)</Label>
                    <Textarea
                      rows={3}
                      value={form.obs_interna}
                      onChange={(e) => setForm((c) => ({ ...c, obs_interna: e.target.value }))}
                    />
                  </div>

                  {/* Obs proposta */}
                  <div className="space-y-2">
                    <Label>Observação para o cliente (aparece na proposta)</Label>
                    <Textarea
                      rows={3}
                      value={form.obs_proposta}
                      onChange={(e) => setForm((c) => ({ ...c, obs_proposta: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Etapas 2-7 (placeholders) */}
          {etapaAtual > 1 && (
            <Card className="p-6">
              <h2 className="font-display text-xl text-foreground">{ETAPAS[etapaAtual - 1]}</h2>
              <p className="text-sm text-muted-foreground mt-2">Etapa em desenvolvimento.</p>
            </Card>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setEtapaAtual((e) => Math.max(1, e - 1))}
              disabled={etapaAtual === 1}
            >
              <ArrowLeft className="w-4 h-4" />
              Etapa anterior
            </Button>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar rascunho
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="terracota"
                      onClick={handleProxima}
                      disabled={!camposObrigatoriosOk || etapaAtual === ETAPAS.length || saveMutation.isPending}
                    >
                      Próxima etapa
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {!camposObrigatoriosOk && (
                  <TooltipContent>
                    Preencha todos os campos obrigatórios para continuar
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </AppLayout>
  );
}

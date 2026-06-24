// Chat de cadastro conversacional reutilizável.
// Consome edge function `mafe-cadastro` para extrair campos, listar faltantes
// e detectar duplicados. Grava de fato só após confirmação explícita do operador.
// Suporta texto livre e imagem (foto/print). Sem travessão.

import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, ImagePlus, X, AlertCircle, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import mafeAvatar from "@/assets/flora-avatar.webp";

export type EntidadeCadastro = "fornecedores" | "plantas" | "preco_fornecedor";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entidade: EntidadeCadastro;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  image_base64?: string | null;
}

interface Extraido {
  [k: string]: any;
}

interface Duplicado {
  id: string;
  [k: string]: any;
}

const ENTIDADE_LABEL: Record<EntidadeCadastro, string> = {
  fornecedores: "Fornecedor",
  plantas: "Planta",
  preco_fornecedor: "Preço de fornecedor",
};

// Campos exibidos na revisão (em ordem)
const CAMPOS_UI: Record<EntidadeCadastro, { name: string; label: string; type?: "textarea" }[]> = {
  fornecedores: [
    { name: "nome", label: "Nome" },
    { name: "cidade", label: "Cidade" },
    { name: "estado", label: "UF" },
    { name: "telefone", label: "Telefone" },
    { name: "whatsapp", label: "WhatsApp" },
    { name: "email", label: "E-mail" },
    { name: "mercado", label: "Mercado" },
    { name: "categoria_fornecedor", label: "Categoria" },
    { name: "contato_nome", label: "Contato (atendente)" },
    { name: "observacoes", label: "Observações", type: "textarea" },
  ],
  plantas: [
    { name: "nome_popular", label: "Nome popular" },
    { name: "nome_cientifico", label: "Nome científico" },
    { name: "porte", label: "Porte (m)" },
    { name: "altura_m", label: "Altura (m)" },
    { name: "unidade", label: "Unidade" },
    { name: "embalagem", label: "Embalagem" },
    { name: "categoria", label: "Categoria" },
    { name: "dap_cm", label: "DAP (cm)" },
    { name: "observacoes", label: "Observações", type: "textarea" },
  ],
  preco_fornecedor: [
    { name: "porte", label: "Porte (m)" },
    { name: "unidade", label: "Unidade" },
    { name: "preco", label: "Preço (R$)" },
    { name: "observacoes", label: "Observações", type: "textarea" },
  ],
};

function descreveDuplicado(entidade: EntidadeCadastro, d: Duplicado): string {
  if (entidade === "fornecedores") {
    return [d.nome, d.cidade, d.estado].filter(Boolean).join(" · ");
  }
  return [d.nome_popular, d.nome_cientifico, d.porte && `porte ${d.porte}`]
    .filter(Boolean)
    .join(" · ");
}

export function MafeCadastroChat({ open, onOpenChange, entidade }: Props) {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [extraido, setExtraido] = useState<Extraido | null>(null);
  const [faltantes, setFaltantes] = useState<string[]>([]);
  const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
  const [modo, setModo] = useState<"criar" | "atualizar">("criar");
  const [atualizarId, setAtualizarId] = useState<string | null>(null);

  // Estado específico para preco_fornecedor
  const [lookup, setLookup] = useState<{ fornecedores: any[]; itens: any[]; ultimo_preco: any | null } | null>(null);
  const [fornecedorSel, setFornecedorSel] = useState<any | null>(null);
  const [itemSel, setItemSel] = useState<any | null>(null);
  const [confirmaSalto, setConfirmaSalto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const introMsg = (() => {
    if (entidade === "fornecedores")
      return "Olá! Me conte sobre o fornecedor que você quer cadastrar ou atualizar. Pode escrever livre, mandar uma foto ou um print. Eu organizo os dados e te mostro o que falta antes de gravar.";
    if (entidade === "plantas")
      return "Olá! Me conte sobre a planta. Pode escrever livre, mandar uma foto ou um print. Eu organizo os dados e te mostro o que falta antes de gravar.";
    return "Olá! Me diga qual fornecedor tem qual item por qual preço. Ex: \"Adubos Jarinu tem Ipê amarelo porte 1,80 por R$ 45\". Pode mandar foto ou print. Eu busco no catálogo inteiro, confirmo com você e gravo no histórico de preços.";
  })();

  useEffect(() => {
    if (open) {
      setMessages([{ role: "assistant", content: introMsg }]);
      setInput("");
      setImage(null);
      setExtraido(null);
      setFaltantes([]);
      setDuplicados([]);
      setModo("criar");
      setAtualizarId(null);
      setLookup(null);
      setFornecedorSel(null);
      setItemSel(null);
      setConfirmaSalto(false);
    }
  }, [open, entidade, introMsg]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handlePickImage = () => fileInputRef.current?.click();
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem grande demais", description: "Use até 5 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(f);
  };

  const enviar = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed && !image) return;
    if (loading) return;

    const userMsg: ChatMsg = { role: "user", content: trimmed || "(imagem)", image_base64: image };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setImage(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("mafe-cadastro", {
        body: {
          entidade,
          modo,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
            image_base64: m.image_base64 ?? null,
          })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);

      setExtraido(data.extraido || {});
      setFaltantes(Array.isArray(data.faltantes) ? data.faltantes : []);

      if (entidade === "preco_fornecedor" && data.duplicados && !Array.isArray(data.duplicados)) {
        const lk = data.duplicados as { fornecedores?: any[]; itens?: any[]; ultimo_preco?: any };
        const normLk = {
          fornecedores: Array.isArray(lk.fornecedores) ? lk.fornecedores : [],
          itens: Array.isArray(lk.itens) ? lk.itens : [],
          ultimo_preco: lk.ultimo_preco ?? null,
        };
        setLookup(normLk);
        // auto-seleciona top quando score alto
        if (normLk.fornecedores[0]?._score >= 3 && !fornecedorSel) setFornecedorSel(normLk.fornecedores[0]);
        if (normLk.itens[0]?._score >= 3 && !itemSel) setItemSel(normLk.itens[0]);
        setDuplicados([]);
      } else {
        setDuplicados(Array.isArray(data.duplicados) ? data.duplicados : []);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: String(data.assistant_message || "Anotado.") },
      ]);
    } catch (e: any) {
      toast({
        title: "Falha na Mafe",
        description: e?.message || "Não consegui processar. Tente de novo.",
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Tive um problema para processar. Quer tentar de novo?" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, image, loading, messages, entidade, modo, toast]);

  const updateCampo = (name: string, value: string) => {
    setExtraido((prev) => ({ ...(prev || {}), [name]: value === "" ? null : value }));
    setFaltantes((prev) => prev.filter((f) => f !== name || !value.trim()));
  };

  // Cálculo de salto de preço (> 50% para mais ou menos)
  const precoNovoNum = Number(String(extraido?.preco ?? "").replace(",", "."));
  const precoAntigoNum = Number(lookup?.ultimo_preco?.preco ?? NaN);
  const saltoGrande =
    Number.isFinite(precoNovoNum) && Number.isFinite(precoAntigoNum) && precoAntigoNum > 0
      ? Math.abs(precoNovoNum - precoAntigoNum) / precoAntigoNum > 0.5
      : false;

  const podeSalvar = (() => {
    if (!extraido) return false;
    if (entidade === "fornecedores") return Boolean(String(extraido.nome ?? "").trim());
    if (entidade === "plantas") return Boolean(String(extraido.nome_popular ?? "").trim());
    // preco_fornecedor
    if (!fornecedorSel?.id || !itemSel?.id) return false;
    if (!Number.isFinite(precoNovoNum) || precoNovoNum <= 0) return false;
    if (saltoGrande && !confirmaSalto) return false;
    return true;
  })();

  async function gravarFornecedor(payload: Extraido, idExistente: string | null) {
    const { contato_nome, ...rest } = payload;
    const limpo: Record<string, any> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== null && v !== undefined && String(v).trim() !== "") limpo[k] = v;
    }
    let forId = idExistente;
    if (idExistente) {
      const { error } = await supabase
        .from("fornecedores")
        .update({ ...limpo, updated_by: user?.id })
        .eq("id", idExistente);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("fornecedores")
        .insert([{ ...(limpo as any), status: "ativo", created_by: user?.id }])
        .select("id")
        .single();
      if (error) throw error;
      forId = data.id;
    }
    if (contato_nome && String(contato_nome).trim() && forId) {
      await supabase.from("fornecedor_atendentes").insert([{
        fornecedor_id: forId,
        nome: String(contato_nome).trim(),
        telefone: (payload.telefone || payload.whatsapp || null) as any,
        email: (payload.email || null) as any,
        ativo: true,
        created_by: user?.id,
      }] as any);
    }
    return forId;
  }

  async function gravarPlanta(payload: Extraido, idExistente: string | null) {
    const { categoria, ...rest } = payload;
    const limpo: Record<string, any> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== null && v !== undefined && String(v).trim() !== "") limpo[k] = v;
    }
    // converter números
    if (limpo.altura_m != null) limpo.altura_m = Number(String(limpo.altura_m).replace(",", "."));
    if (limpo.dap_cm != null) limpo.dap_cm = Number(String(limpo.dap_cm).replace(",", "."));
    // resolver categoria por nome (se vier)
    if (categoria && String(categoria).trim()) {
      const { data: cat } = await supabase
        .from("categorias_plantas")
        .select("id")
        .ilike("nome", String(categoria).trim())
        .maybeSingle();
      if (cat?.id) limpo.categoria_id = cat.id;
    }
    if (idExistente) {
      const { error } = await supabase
        .from("plantas")
        .update({ ...limpo, updated_by: user?.id })
        .eq("id", idExistente);
      if (error) throw error;
      return idExistente;
    }
    const { data, error } = await supabase
      .from("plantas")
      .insert([{ ...(limpo as any), ativo: true, created_by: user?.id }])
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  async function gravarPrecoFornecedor() {
    if (!fornecedorSel?.id || !itemSel?.id) throw new Error("Selecione fornecedor e item.");
    const preco = Number(String(extraido?.preco ?? "").replace(",", "."));
    if (!Number.isFinite(preco) || preco <= 0) throw new Error("Preço inválido.");
    const porte = (extraido?.porte ? String(extraido.porte).trim() : null) || itemSel.porte || null;
    const unidade = (extraido?.unidade ? String(extraido.unidade).trim() : null) || itemSel.unidade || null;
    const hoje = new Date().toISOString().slice(0, 10);
    const observacoes = extraido?.observacoes ? String(extraido.observacoes).trim() : null;

    // historico_precos (cronológico do item — fonte usada pelos orçamentos)
    const { error: e1 } = await supabase.from("historico_precos").insert([{
      item_id: itemSel.id,
      item_tipo: itemSel.tipo,
      fornecedor_id: fornecedorSel.id,
      preco,
      porte,
      unidade,
      data_orcamento: hoje,
      registrado_por: user?.id,
      observacoes,
    }] as any);
    if (e1) throw e1;

    // historico_precos_fornecedor (visão por fornecedor — só plantas)
    if (itemSel.tipo === "planta") {
      const { error: e2 } = await supabase.from("historico_precos_fornecedor").insert([{
        fornecedor_id: fornecedorSel.id,
        planta_id: itemSel.id,
        porte,
        unidade,
        preco,
        data_cotacao: hoje,
      }] as any);
      if (e2) console.warn("[preco_fornecedor] aviso historico_precos_fornecedor:", e2.message);
    }
  }

  const handleSalvar = async () => {
    if (!extraido || !podeSalvar || saving) return;
    setSaving(true);
    try {
      let id: string | null = null;
      if (entidade === "fornecedores") {
        id = await gravarFornecedor(extraido, atualizarId);
        qc.invalidateQueries({ queryKey: ["fornecedores"] });
        qc.invalidateQueries({ queryKey: ["fornecedores-todos"] });
      } else if (entidade === "plantas") {
        id = await gravarPlanta(extraido, atualizarId);
        qc.invalidateQueries({ queryKey: ["plantas"] });
      } else {
        await gravarPrecoFornecedor();
        qc.invalidateQueries({ queryKey: ["historico_precos"] });
        qc.invalidateQueries({ queryKey: ["historico-precos-fornecedor"] });
        qc.invalidateQueries({ queryKey: ["plantas"] });
        qc.invalidateQueries({ queryKey: ["insumos"] });
      }
      const isPreco = entidade === "preco_fornecedor";
      toast({
        title: isPreco ? "Preço atualizado" : atualizarId ? "Atualizado" : "Cadastrado",
        description: isPreco
          ? `Novo preço de ${fornecedorSel?.nome} para ${itemSel?.nome} gravado no histórico.`
          : `${ENTIDADE_LABEL[entidade]} ${atualizarId ? "atualizado" : "criado"} com sucesso.`,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isPreco
            ? `Gravei R$ ${precoNovoNum.toFixed(2).replace(".", ",")} para ${itemSel?.nome} em ${fornecedorSel?.nome}. Quer atualizar mais algum?`
            : `${atualizarId ? "Atualizei" : "Cadastrei"} esse registro. Quer continuar com outro?`,
        },
      ]);
      // reset para próximo registro
      setExtraido(null);
      setFaltantes([]);
      setDuplicados([]);
      setAtualizarId(null);
      setModo("criar");
      setLookup(null);
      setFornecedorSel(null);
      setItemSel(null);
      setConfirmaSalto(false);
    } catch (e: any) {
      toast({
        title: "Erro ao salvar",
        description: e?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <img src={mafeAvatar} alt="Mafe" className="w-7 h-7 rounded-full object-cover object-top" />
            Cadastrar {ENTIDADE_LABEL[entidade]} com a Mafe
          </DialogTitle>
          <DialogDescription className="text-xs">
            Escreva livre ou envie uma imagem. A Mafe organiza os campos, mostra duplicados e só grava após sua confirmação.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid md:grid-cols-2 min-h-0">
          {/* Lado conversa */}
          <div className="flex flex-col border-r min-h-0">
            <ScrollArea className="flex-1 p-4">
              <div ref={scrollRef} className="space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.role === "assistant" && (
                      <img src={mafeAvatar} alt="" className="w-6 h-6 rounded-full object-cover object-top shrink-0 mt-1" />
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {m.image_base64 && (
                        <img src={m.image_base64} alt="" className="rounded-md mb-1 max-h-32" />
                      )}
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <img src={mafeAvatar} alt="" className="w-6 h-6 rounded-full object-cover object-top shrink-0" />
                    <div className="bg-muted rounded-xl px-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t p-3 shrink-0 space-y-2">
              {image && (
                <div className="flex items-center gap-2 text-xs bg-muted rounded-md p-2">
                  <img src={image} alt="" className="w-10 h-10 object-cover rounded" />
                  <span className="flex-1 truncate">Imagem anexada</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setImage(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 shrink-0"
                  onClick={handlePickImage}
                  disabled={loading}
                  title="Anexar imagem"
                >
                  <ImagePlus className="w-4 h-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviar();
                    }
                  }}
                  placeholder={`Ex: ${
                    entidade === "fornecedores"
                      ? "Adubos Jarinu, Jarinu/SP, contato João, 11 99999-9999"
                      : "Ipê amarelo, Handroanthus chrysotrichus, porte 1,80, unidade Muda"
                  }`}
                  rows={2}
                  className="resize-none text-sm"
                  disabled={loading}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={enviar}
                  disabled={loading || (!input.trim() && !image)}
                  className="h-9 w-9 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Lado revisão */}
          <div className="flex flex-col min-h-0 bg-muted/30">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {!extraido ? (
                  <div className="text-center text-sm text-muted-foreground py-12 px-4">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Conforme você conversar, os dados extraídos aparecem aqui para revisar antes de gravar.
                  </div>
                ) : (
                  <>
                    {duplicados.length > 0 && (
                      <div className="rounded-md border border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                          <AlertCircle className="w-4 h-4" />
                          Possíveis duplicados
                        </div>
                        <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
                          Já existem registros parecidos. Atualize um deles ou confirme que é novo de propósito.
                        </p>
                        <div className="space-y-1.5">
                          {duplicados.map((d) => (
                            <div
                              key={d.id}
                              className={`flex items-center justify-between gap-2 text-xs rounded border bg-background p-2 ${
                                atualizarId === d.id ? "border-primary ring-1 ring-primary" : "border-border"
                              }`}
                            >
                              <span className="truncate">{descreveDuplicado(entidade, d)}</span>
                              <Button
                                size="sm"
                                variant={atualizarId === d.id ? "default" : "outline"}
                                className="h-7 text-xs"
                                onClick={() => {
                                  setAtualizarId(atualizarId === d.id ? null : d.id);
                                  setModo(atualizarId === d.id ? "criar" : "atualizar");
                                }}
                              >
                                {atualizarId === d.id ? "Selecionado" : "Atualizar este"}
                              </Button>
                            </div>
                          ))}
                        </div>
                        {atualizarId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => { setAtualizarId(null); setModo("criar"); }}
                          >
                            Criar novo mesmo assim
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Revisar dados</h4>
                        {faltantes.length > 0 ? (
                          <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">
                            Faltam: {faltantes.join(", ")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-green-600 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Completo
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        {CAMPOS_UI[entidade].map((c) => {
                          const v = extraido?.[c.name];
                          const val = v == null ? "" : String(v);
                          const faltando = faltantes.includes(c.name);
                          return (
                            <div key={c.name} className="space-y-1">
                              <label className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                                {c.label}
                                {faltando && <span className="text-amber-600 ml-1">obrigatório</span>}
                              </label>
                              {c.type === "textarea" ? (
                                <Textarea
                                  value={val}
                                  onChange={(e) => updateCampo(c.name, e.target.value)}
                                  rows={2}
                                  className={`text-sm ${faltando ? "border-amber-500" : ""}`}
                                />
                              ) : (
                                <Input
                                  value={val}
                                  onChange={(e) => updateCampo(c.name, e.target.value)}
                                  className={`h-8 text-sm ${faltando ? "border-amber-500" : ""}`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            {extraido && (
              <div className="border-t p-3 shrink-0 flex items-center justify-between gap-2 bg-background">
                <div className="text-xs text-muted-foreground">
                  {atualizarId
                    ? "Vai atualizar o registro selecionado."
                    : "Vai criar um registro novo."}
                </div>
                <Button onClick={handleSalvar} disabled={!podeSalvar || saving} size="sm">
                  {saving ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Salvando</>
                  ) : atualizarId ? (
                    "Confirmar atualização"
                  ) : (
                    "Confirmar cadastro"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

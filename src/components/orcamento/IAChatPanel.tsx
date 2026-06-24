// IAChatPanel — Sub-PR 2C
// Painel conversacional Mafe para atualização de cotações por fornecedor.
import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Image as ImageIcon, Send, X, Sparkles, AlertCircle, RotateCcw, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface IAChatItemContexto {
  item_id: string;
  item_tipo: "planta" | "insumo";
  nome_popular: string;
  nome_cientifico?: string | null;
  porte?: string | null;
  preco_atual?: number | null;
  unidade?: string | null;
  ultima_cotacao?: string | null;
  portes_disponiveis?: string[];
}

export interface IAChatProposta {
  item_id: string;
  item_tipo: "planta" | "insumo";
  nome_popular: string;
  porte?: string | null;
  preco_atual?: number | null;
  preco_novo: number;
  observacao?: string;
  selecionada?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  image_base64?: string | null;
  image_mime?: string | null;
  ts: number;
}

interface IAChatPanelProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orcamentoId: string | null;
  fornecedorId: string;
  fornecedorNome: string;
  mercado?: string | null;
  itens: IAChatItemContexto[];
  /** chamado depois de aplicar com sucesso, para refrescar histórico */
  onAplicado?: () => void;
}

const MAX_MENSAGENS = 50;
const MAX_IMG_MB = 4;

function storageKey(orc: string | null, forn: string) {
  return `orc:${orc || "novo"}:ia-chat:${forn}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fmtBRL(n?: number | null) {
  if (n == null || isNaN(Number(n))) return "—";
  return `R$ ${Number(n).toFixed(2).replace(".", ",")}`;
}

function PensandoDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1" aria-label="Mafe está pensando">
      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--terracota,18_60%_50%))] animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--terracota,18_60%_50%))] animate-bounce [animation-delay:120ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--terracota,18_60%_50%))] animate-bounce [animation-delay:240ms]" />
    </span>
  );
}

export function IAChatPanel({
  open,
  onOpenChange,
  orcamentoId,
  fornecedorId,
  fornecedorNome,
  mercado,
  itens,
  onAplicado,
}: IAChatPanelProps) {
  const key = storageKey(orcamentoId, fornecedorId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [propostas, setPropostas] = useState<IAChatProposta[]>([]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; mime: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restaura sessão ao abrir
  useEffect(() => {
    if (!open) return;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        setMessages(parsed.messages || []);
        setPropostas(parsed.propostas || []);
        setConversaId(parsed.conversaId || null);
      } else {
        setMessages([]);
        setPropostas([]);
        setConversaId(null);
      }
      setErro(null);
    } catch {
      setMessages([]); setPropostas([]); setConversaId(null);
    }
  }, [open, key]);

  // Persiste a cada mudança
  useEffect(() => {
    if (!open) return;
    try {
      sessionStorage.setItem(key, JSON.stringify({ messages, propostas, conversaId }));
    } catch { /* quota */ }
  }, [messages, propostas, conversaId, key, open]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, propostas.length]);

  async function handlePickFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Apenas imagens"); return; }
    if (f.size > MAX_IMG_MB * 1024 * 1024) { toast.error(`Imagem maior que ${MAX_IMG_MB}MB`); return; }
    const dataUrl = await fileToDataUrl(f);
    setPendingImage({ dataUrl, mime: f.type });
  }

  async function persistConversa(nextMessages: ChatMessage[], nextPropostas: IAChatProposta[]) {
    try {
      if (conversaId) {
        await (supabase as any).from("cotacao_ia_conversas").update({
          mensagens: nextMessages,
          propostas: nextPropostas,
          total_mensagens: nextMessages.length,
        }).eq("id", conversaId);
      } else {
        const { data, error } = await (supabase as any).from("cotacao_ia_conversas").insert({
          orcamento_id: orcamentoId,
          fornecedor_id: fornecedorId,
          status: "ativa",
          mensagens: nextMessages,
          propostas: nextPropostas,
          total_mensagens: nextMessages.length,
          metadata: { fornecedor_nome: fornecedorNome, mercado: mercado || null },
        }).select("id").single();
        if (!error && data?.id) setConversaId(data.id);
      }
    } catch (e) {
      console.warn("[IAChatPanel] persistConversa", e);
    }
  }

  async function enviar() {
    if (loading) return;
    const text = input.trim();
    if (!text && !pendingImage) return;
    if (messages.length >= MAX_MENSAGENS) {
      toast.error(`Limite de ${MAX_MENSAGENS} mensagens atingido nesta conversa.`);
      return;
    }
    const novaMsg: ChatMessage = {
      role: "user",
      content: text,
      image_base64: pendingImage?.dataUrl || null,
      image_mime: pendingImage?.mime || null,
      ts: Date.now(),
    };
    const nextMessages = [...messages, novaMsg];
    setMessages(nextMessages);
    setInput("");
    setPendingImage(null);
    setLoading(true);
    setErro(null);

    try {
      const { data, error } = await supabase.functions.invoke("cotacao-ia-chat", {
        body: {
          messages: nextMessages.map((m) => ({
            role: m.role, content: m.content,
            image_base64: m.image_base64 || undefined,
            image_mime: m.image_mime || undefined,
          })),
          contexto: {
            fornecedor_id: fornecedorId,
            fornecedor_nome: fornecedorNome,
            mercado: mercado || null,
            itens,
          },
        },
      });
      if (error) throw error;
      const resp = data as { assistant_message?: string; propostas?: IAChatProposta[]; error?: string; message?: string };
      if (resp.error) {
        setErro(resp.message || resp.error);
        return;
      }
      const conteudoIA = (resp.assistant_message || "").trim();
      const propostasIA = Array.isArray(resp.propostas) ? resp.propostas : [];
      if (!conteudoIA && propostasIA.length === 0) {
        setErro(
          "A Mafe não conseguiu interpretar a cotação. Reformule a mensagem ou envie uma imagem mais nítida da tabela.",
        );
        return;
      }
      const assistant: ChatMessage = {
        role: "assistant",
        content:
          conteudoIA ||
          (propostasIA.length > 0
            ? `Identifiquei ${propostasIA.length} ${propostasIA.length === 1 ? "atualização" : "atualizações"} de preço. Revise abaixo antes de aplicar.`
            : ""),
        ts: Date.now(),
      };
      const finalMessages = [...nextMessages, assistant];
      setMessages(finalMessages);
      let nextPropostas = propostas;
      if (propostasIA.length > 0) {
        nextPropostas = propostasIA.map((p) => ({ ...p, selecionada: true }));
        setPropostas(nextPropostas);
      }
      await persistConversa(finalMessages, nextPropostas);
    } catch (e: any) {
      console.error("[IAChatPanel] erro", e);
      setErro(e?.message || "Falha ao falar com a Mafe. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function aplicarSelecionadas() {
    const selecionadas = propostas.filter((p) => p.selecionada && p.preco_novo > 0);
    if (selecionadas.length === 0) {
      toast.info("Nenhuma proposta selecionada.");
      return;
    }
    setAplicando(true);
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const inserts = selecionadas.map((p) => ({
        item_id: p.item_id,
        item_tipo: p.item_tipo,
        fornecedor_id: fornecedorId,
        preco: p.preco_novo,
        porte: p.porte || null,
        data_orcamento: hoje,
        observacoes: p.observacao || "Atualizado via IA Mafe",
        metadata: { origem: "ia_chat", conversa_id: conversaId },
      }));
      const { error } = await (supabase as any).from("historico_precos").insert(inserts);
      if (error) throw error;

      // marca conversa como aplicada
      if (conversaId) {
        await (supabase as any).from("cotacao_ia_conversas").update({
          status: "aplicada",
          atualizacoes_aplicadas: selecionadas,
          total_atualizacoes: selecionadas.length,
          aplicado_em: new Date().toISOString(),
        }).eq("id", conversaId);
      }

      toast.success(`${selecionadas.length} preço(s) atualizado(s).`);
      sessionStorage.removeItem(key);
      setMessages([]); setPropostas([]); setConversaId(null);
      onAplicado?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error("[IAChatPanel] aplicar", e);
      toast.error("Falha ao aplicar atualizações: " + (e?.message || "erro desconhecido"));
    } finally {
      setAplicando(false);
    }
  }

  function descartar() {
    if (!confirm("Descartar essa conversa e todas as propostas?")) return;
    if (conversaId) {
      (supabase as any).from("cotacao_ia_conversas").update({ status: "descartada" }).eq("id", conversaId);
    }
    sessionStorage.removeItem(key);
    setMessages([]); setPropostas([]); setConversaId(null);
    onOpenChange(false);
  }

  const totalSelecionado = propostas.filter((p) => p.selecionada).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="font-display text-lg flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Atualizar com Mafe — {fornecedorNome}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {itens.length} {itens.length === 1 ? "item" : "itens"} neste orçamento{mercado ? ` · ${mercado}` : ""}
          </p>
        </SheetHeader>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground italic text-center py-8">
              Cole aqui a mensagem do fornecedor, anexe um print, ou descreva os preços novos. A Mafe vai propor as atualizações.
            </div>
          )}
          {messages.map((m, idx) => (
            <div key={idx} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "rounded-2xl px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-background border rounded-bl-sm"
              )}>
                {m.image_base64 && (
                  <img src={m.image_base64} alt="" className="rounded-lg mb-2 max-h-48 object-contain" />
                )}
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-background border rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-muted-foreground inline-flex items-center">
                Mafe está pensando<PensandoDots />
              </div>
            </div>
          )}

          {/* Propostas */}
          {propostas.length > 0 && (
            <Card className="p-3 space-y-2 border-primary/40 bg-primary/5">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Propostas de atualização ({propostas.length})</h4>
                <span className="text-xs text-muted-foreground">{totalSelecionado} selecionada(s)</span>
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {propostas.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-background rounded-md p-2 border">
                    <Checkbox
                      checked={!!p.selecionada}
                      onCheckedChange={(v) => setPropostas((prev) =>
                        prev.map((x, ix) => ix === i ? { ...x, selecionada: !!v } : x))}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {p.nome_popular}{p.porte ? ` · ${p.porte}` : ""}
                      </p>
                      <p className="text-muted-foreground">
                        atual {fmtBRL(p.preco_atual)} → novo
                      </p>
                    </div>
                    <Input
                      type="number" step="0.01" min="0"
                      value={p.preco_novo}
                      onChange={(e) => setPropostas((prev) =>
                        prev.map((x, ix) => ix === i ? { ...x, preco_novo: Number(e.target.value) || 0 } : x))}
                      className="h-7 w-24 tabular-nums"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setPropostas([])} disabled={aplicando}>
                  Limpar
                </Button>
                <Button size="sm" variant="terracota" onClick={aplicarSelecionadas} disabled={aplicando || totalSelecionado === 0}>
                  {aplicando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Aplicar {totalSelecionado} selecionada(s)
                </Button>
              </div>
            </Card>
          )}

          {erro && (
            <Card className="p-3 border-destructive/50 bg-destructive/10 flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-destructive font-medium">Algo não funcionou</p>
                <p className="text-xs text-muted-foreground">{erro}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setErro(null); enviar(); }}>
                <RotateCcw className="w-3.5 h-3.5" /> Tentar de novo
              </Button>
            </Card>
          )}
        </div>

        {/* Input area */}
        <div className="border-t p-3 space-y-2 bg-background">
          {pendingImage && (
            <div className="relative inline-block">
              <img src={pendingImage.dataUrl} alt="" className="h-16 rounded border" />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                aria-label="Remover imagem"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { handlePickFile(e.target.files?.[0] || null); e.target.value = ""; }}
            />
            <Button
              type="button" variant="outline" size="icon"
              onClick={() => fileRef.current?.click()}
              disabled={loading || !!pendingImage}
              title="Anexar print (1 imagem por mensagem)"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
              }}
              placeholder="Mensagem ou cole o texto do fornecedor..."
              rows={2}
              disabled={loading}
              className="resize-none"
            />
            <Button
              type="button" variant="terracota" size="icon"
              onClick={enviar}
              disabled={loading || (!input.trim() && !pendingImage)}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{messages.length}/{MAX_MENSAGENS} mensagens</span>
            <button onClick={descartar} className="hover:text-destructive underline-offset-2 hover:underline">
              Descartar conversa
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

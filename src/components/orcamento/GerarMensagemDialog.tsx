import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ItemCotacaoDisparo {
  item_id?: string | null;
  item_tipo?: "planta" | "insumo" | "condicionador_solo" | null;
  nome_popular: string;
  nome_cientifico?: string | null;
  porte?: string | null;
  unidade?: string | null;
  quantidade?: number | null;
  preco_atual?: number | null;
  ultima_cotacao?: string | null;
}

interface GerarMensagemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamentoId?: string | null;
  fornecedorId: string;
  fornecedorNome: string;
  fornecedorTelefone?: string | null;
  fornecedorWhatsapp?: string | null;
  itens: ItemCotacaoDisparo[];
  /** mensagem padrão inicial (ex.: "Olá! Por favor, poderia atualizar..."). */
  mensagemPadrao?: string;
}

const MENSAGEM_DEFAULT =
  "Olá! Tudo bem? Poderia, por favor, atualizar os valores dos itens abaixo? Estamos fechando um orçamento. Obrigado!";

function montaTabela(itens: ItemCotacaoDisparo[]): string {
  const header = "Nome popular | Nome científico | Porte | Qtd | Unid";
  const sep = "---|---|---|---|---";
  const linhas = itens.map(
    (i) =>
      `${i.nome_popular || "-"} | ${i.nome_cientifico || "-"} | ${i.porte || "-"} | ${i.quantidade ?? "-"} | ${i.unidade || "-"}`,
  );
  return [header, sep, ...linhas].join("\n");
}

function montaWaUrl(tel: string | null | undefined, texto: string) {
  const limpo = String(tel || "").replace(/\D/g, "");
  if (limpo.length >= 10) {
    const com55 = limpo.startsWith("55") ? limpo : `55${limpo}`;
    return `https://wa.me/${com55}?text=${encodeURIComponent(texto)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

export function GerarMensagemDialog({
  open,
  onOpenChange,
  orcamentoId,
  fornecedorId,
  fornecedorNome,
  fornecedorTelefone,
  fornecedorWhatsapp,
  itens,
  mensagemPadrao,
}: GerarMensagemDialogProps) {
  const [atendenteId, setAtendenteId] = useState<string>("");
  const [salvarPadrao, setSalvarPadrao] = useState(false);
  const [mensagem, setMensagem] = useState(mensagemPadrao || MENSAGEM_DEFAULT);
  const queryClient = useQueryClient();

  // Atendentes ativos do fornecedor
  const { data: atendentes = [] } = useQuery({
    queryKey: ["fornecedor-atendentes", fornecedorId],
    enabled: open && !!fornecedorId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fornecedor_atendentes")
        .select("id, nome, telefone, funcao, ativo")
        .eq("fornecedor_id", fornecedorId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Atendente padrão do operador atual para esse fornecedor
  const { data: padraoUsuario } = useQuery({
    queryKey: ["operador-atendente-padrao", fornecedorId],
    enabled: open && !!fornecedorId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from("operador_atendente_padrao")
        .select("atendente_id")
        .eq("operador_id", user.id)
        .eq("fornecedor_id", fornecedorId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  // Default: padrão do operador → primeiro atendente → vazio
  useEffect(() => {
    if (!open) return;
    setMensagem(mensagemPadrao || MENSAGEM_DEFAULT);
    setSalvarPadrao(false);
    if (padraoUsuario?.atendente_id && atendentes.some((a: any) => a.id === padraoUsuario.atendente_id)) {
      setAtendenteId(padraoUsuario.atendente_id);
    } else if (atendentes.length > 0) {
      setAtendenteId(atendentes[0].id);
    } else {
      setAtendenteId("");
    }
  }, [open, padraoUsuario, atendentes, mensagemPadrao]);

  const atendenteSelecionado = useMemo(
    () => atendentes.find((a: any) => a.id === atendenteId) as any | undefined,
    [atendentes, atendenteId],
  );

  const tabela = useMemo(() => montaTabela(itens), [itens]);
  const saudacaoAtendente = atendenteSelecionado?.nome
    ? `Olá ${atendenteSelecionado.nome.split(" ")[0]}! `
    : "";
  const textoCompleto = useMemo(() => {
    const corpo = mensagem.replace(/^Olá[^!]*!\s*/i, "").trimStart();
    return `${saudacaoAtendente}${corpo}\n\n${tabela}`;
  }, [mensagem, saudacaoAtendente, tabela]);

  const telefoneAlvo =
    atendenteSelecionado?.telefone || fornecedorWhatsapp || fornecedorTelefone || "";

  const dispatchMutation = useMutation({
    mutationFn: async () => {
      // 1) abre WhatsApp em nova aba
      const url = montaWaUrl(telefoneAlvo, textoCompleto);
      window.open(url, "_blank", "noopener,noreferrer");

      // 2) registra histórico
      const { error: insErr } = await (supabase as any)
        .from("cotacao_disparos")
        .insert({
          orcamento_id: orcamentoId || null,
          fornecedor_id: fornecedorId,
          atendente_id: atendenteSelecionado?.id || null,
          atendente_nome: atendenteSelecionado?.nome || null,
          canal: "whatsapp",
          mensagem: textoCompleto,
          itens_resumo: itens.map((i) => ({
            item_id: i.item_id,
            item_tipo: i.item_tipo,
            nome: i.nome_popular,
            porte: i.porte,
            unidade: i.unidade,
            quantidade: i.quantidade,
          })),
          origem: "manual",
          metadata: { telefone: telefoneAlvo || null },
        });
      if (insErr) throw insErr;

      // 3) salva preferência de atendente padrão se marcado
      if (salvarPadrao && atendenteSelecionado?.id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase as any)
            .from("operador_atendente_padrao")
            .upsert(
              {
                operador_id: user.id,
                fornecedor_id: fornecedorId,
                atendente_id: atendenteSelecionado.id,
              },
              { onConflict: "operador_id,fornecedor_id" },
            );
        }
      }
    },
    onSuccess: () => {
      toast.success("Mensagem enviada e disparo registrado");
      queryClient.invalidateQueries({ queryKey: ["cotacao-disparos"] });
      queryClient.invalidateQueries({ queryKey: ["operador-atendente-padrao"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao registrar disparo"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atualizar cotação · {fornecedorNome}</DialogTitle>
          <DialogDescription>
            {itens.length} {itens.length === 1 ? "item" : "itens"} para pedir atualização. A mensagem
            será enviada via WhatsApp e o disparo ficará registrado no histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Atendente</Label>
            {atendentes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Nenhum atendente cadastrado para este fornecedor. Você ainda pode enviar a mensagem
                pelo número geral do fornecedor.
              </p>
            ) : (
              <Select value={atendenteId} onValueChange={setAtendenteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar atendente" />
                </SelectTrigger>
                <SelectContent>
                  {atendentes.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                      {a.funcao ? ` · ${a.funcao}` : ""}
                      {a.telefone ? ` · ${a.telefone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {atendenteSelecionado && (
              <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <Checkbox
                  checked={salvarPadrao}
                  onCheckedChange={(v) => setSalvarPadrao(!!v)}
                />
                Salvar como meu atendente padrão para {fornecedorNome}
              </label>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="msg-corpo" className="text-xs">Mensagem (editável)</Label>
            <Textarea
              id="msg-corpo"
              rows={3}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Prévia que será enviada</Label>
            <pre className="text-[11px] bg-muted/50 p-3 rounded-md whitespace-pre-wrap font-sans border">
              {textoCompleto}
            </pre>
            <p className="text-[10px] text-muted-foreground">
              Telefone usado: <strong>{telefoneAlvo || "(genérico — você escolhe o contato no WhatsApp)"}</strong>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={dispatchMutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="terracota"
            onClick={() => dispatchMutation.mutate()}
            disabled={dispatchMutation.isPending || itens.length === 0}
          >
            {dispatchMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            Enviar e registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

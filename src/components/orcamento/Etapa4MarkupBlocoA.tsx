import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUserRoles } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Settings, Wand2, Lock } from "lucide-react";
import {
  GerenciarPerfisMarkupDialog,
  CATEGORIAS_MARKUP,
  markupToMargem,
} from "./GerenciarPerfisMarkupDialog";

interface Props {
  orcamentoId: string | undefined;
  perfilSelecionadoId: string;
  onPerfilSelecionado: (id: string) => void;
}

export function Etapa4MarkupBlocoA({ orcamentoId, perfilSelecionadoId, onPerfilSelecionado }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: roles = [] } = useUserRoles(user?.id);
  const podeGerenciar = roles.some((r) =>
    ["admin", "administrativo", "diretor" as any].includes(r.role as any),
  );

  const [gerenciarOpen, setGerenciarOpen] = useState(false);

  const perfisQuery = useQuery({
    queryKey: ["perfis-markup-ativos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("perfis_markup")
        .select("id, nome")
        .eq("ativo", true)
        .eq("arquivado", false)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const markupsQuery = useQuery({
    queryKey: ["orcamento-categorias-markup", orcamentoId],
    queryFn: async () => {
      if (!orcamentoId) return [];
      const { data, error } = await (supabase as any)
        .from("orcamento_categorias_markup")
        .select("*")
        .eq("orcamento_id", orcamentoId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orcamentoId,
  });

  const aplicacao = useMemo(() => {
    const list = (markupsQuery.data as any[]) || [];
    if (list.length === 0) return { tipo: "nenhum" as const, perfilId: null as string | null };
    const algumManual = list.some((l) => l.ajustado_manualmente);
    if (algumManual) return { tipo: "customizado" as const, perfilId: null };
    const perfilIds = Array.from(new Set(list.map((l) => l.perfil_id_aplicado).filter(Boolean)));
    if (perfilIds.length === 1) return { tipo: "perfil" as const, perfilId: perfilIds[0] as string };
    return { tipo: "customizado" as const, perfilId: null };
  }, [markupsQuery.data]);

  const perfilAtualNome =
    aplicacao.tipo === "perfil"
      ? (perfisQuery.data || []).find((p: any) => p.id === aplicacao.perfilId)?.nome
      : null;

  const aplicarPerfil = useMutation({
    mutationFn: async (perfilId: string) => {
      if (!orcamentoId) throw new Error("Salve o orçamento primeiro (Etapa 1).");
      const { data: cats, error } = await (supabase as any)
        .from("perfis_markup_categorias")
        .select("categoria, markup_pct, margem_pct")
        .eq("perfil_id", perfilId);
      if (error) throw error;
      if (!cats || cats.length === 0) throw new Error("Perfil sem categorias configuradas.");

      // Apaga linhas existentes do orçamento e reinsere a partir do perfil
      await (supabase as any).from("orcamento_categorias_markup").delete().eq("orcamento_id", orcamentoId);

      const rows = cats.map((c: any) => {
        const mk = Number(c.markup_pct) || 0;
        const mg = c.margem_pct != null ? Number(c.margem_pct) : markupToMargem(mk);
        return {
          orcamento_id: orcamentoId,
          categoria: c.categoria,
          markup_pct: mk,
          margem_pct: mg,
          perfil_id_aplicado: perfilId,
          ajustado_manualmente: false,
        };
      });
      const { error: insErr } = await (supabase as any)
        .from("orcamento_categorias_markup")
        .insert(rows);
      if (insErr) throw insErr;

      // Atualiza referência no orçamento
      await (supabase as any)
        .from("orcamentos")
        .update({ perfil_markup_id: perfilId })
        .eq("id", orcamentoId);

      onPerfilSelecionado(perfilId);
    },
    onSuccess: () => {
      toast({ title: "Perfil aplicado", description: "Markups das categorias atualizados." });
      qc.invalidateQueries({ queryKey: ["orcamento-categorias-markup", orcamentoId] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-xl text-foreground">Markup e Margens</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione um perfil de markup ou ajuste manualmente por categoria.
            </p>
          </div>
          {podeGerenciar && (
            <Button variant="outline" size="sm" onClick={() => setGerenciarOpen(true)}>
              <Settings className="size-4" /> Gerenciar perfis
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <Label className="text-xs">Perfil de markup</Label>
            <Select value={perfilSelecionadoId || ""} onValueChange={onPerfilSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar perfil..." />
              </SelectTrigger>
              <SelectContent>
                {(perfisQuery.data || []).length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Nenhum perfil cadastrado.
                  </div>
                ) : (
                  (perfisQuery.data || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => aplicarPerfil.mutate(perfilSelecionadoId)}
            disabled={!perfilSelecionadoId || !orcamentoId || aplicarPerfil.isPending}
          >
            {aplicarPerfil.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            Aplicar perfil
          </Button>
        </div>

        <div className="text-sm">
          {aplicacao.tipo === "nenhum" && (
            <span className="text-muted-foreground">
              Nenhum markup aplicado ainda. Selecione um perfil para começar.
            </span>
          )}
          {aplicacao.tipo === "perfil" && perfilAtualNome && (
            <span className="text-foreground">
              Perfil atual: <span className="font-semibold text-primary">{perfilAtualNome}</span>
            </span>
          )}
          {aplicacao.tipo === "customizado" && (
            <span className="text-foreground">
              <span className="font-semibold text-primary">Markup customizado</span>{" "}
              (ajustado manualmente, sem perfil único)
            </span>
          )}
        </div>

        {!podeGerenciar && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="size-3" />
            Apenas Diretoria e Administrativo podem editar perfis e ajustar markup manualmente.
          </div>
        )}
      </Card>

      {/* Bloco B (tabela) e Bloco C (resumo) virão no Sub-PR 3B. */}
      <Card className="p-8 mt-4">
        <p className="text-sm text-muted-foreground text-center">
          Tabela de ajuste por categoria e resumo financeiro consolidado serão habilitados no próximo
          incremento (Sub-PR 3B).
        </p>
      </Card>

      <GerenciarPerfisMarkupDialog open={gerenciarOpen} onOpenChange={setGerenciarOpen} />
    </>
  );
}

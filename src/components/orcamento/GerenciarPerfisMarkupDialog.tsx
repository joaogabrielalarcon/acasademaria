import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Copy, Archive, Loader2, ArrowLeft } from "lucide-react";

export const CATEGORIAS_MARKUP = [
  "Árvores",
  "Arbustos e Herbáceas",
  "Forrações",
  "Horta/Temperos",
  "Palmeiras",
  "Trepadeiras",
  "Ambientação/Projeto",
  "Insumos",
  "Condicionadores de Solo",
  "Vasos/Decoração",
  "Materiais Construtivos",
];

// Conversões bidirecionais markup <-> margem (em %)
export function markupToMargem(markup: number): number {
  if (!isFinite(markup) || markup <= -100) return 0;
  return (markup / (100 + markup)) * 100;
}
export function margemToMarkup(margem: number): number {
  if (!isFinite(margem) || margem >= 100) return 0;
  return (margem / (100 - margem)) * 100;
}

interface PerfilRow {
  id: string;
  nome: string;
  arquivado: boolean;
  qtd: number;
}

interface CategoriaConfig {
  categoria: string;
  markup_pct: number;
  margem_pct: number;
  fonte: "markup" | "margem";
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function GerenciarPerfisMarkupDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [view, setView] = useState<"lista" | "form">("lista");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [linhas, setLinhas] = useState<CategoriaConfig[]>([]);

  const perfisQuery = useQuery({
    queryKey: ["perfis-markup-gerenciar"],
    queryFn: async () => {
      const { data: perfis, error } = await (supabase as any)
        .from("perfis_markup")
        .select("id, nome, arquivado")
        .order("nome");
      if (error) throw error;
      const ids = (perfis || []).map((p: any) => p.id);
      let counts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: cats } = await (supabase as any)
          .from("perfis_markup_categorias")
          .select("perfil_id")
          .in("perfil_id", ids);
        (cats || []).forEach((c: any) => {
          counts[c.perfil_id] = (counts[c.perfil_id] || 0) + 1;
        });
      }
      return (perfis || []).map((p: any) => ({ ...p, qtd: counts[p.id] || 0 })) as PerfilRow[];
    },
    enabled: open,
  });

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setView("lista");
      setEditingId(null);
      setNome("");
      setLinhas([]);
    }
  }, [open]);

  const carregarPerfil = async (id: string) => {
    const { data: p } = await (supabase as any)
      .from("perfis_markup")
      .select("nome")
      .eq("id", id)
      .maybeSingle();
    const { data: cats } = await (supabase as any)
      .from("perfis_markup_categorias")
      .select("categoria, markup_pct, margem_pct")
      .eq("perfil_id", id);
    setNome(p?.nome || "");
    const map = new Map<string, any>();
    (cats || []).forEach((c: any) => map.set(c.categoria, c));
    setLinhas(
      CATEGORIAS_MARKUP.map((cat) => {
        const c = map.get(cat);
        const mk = c ? Number(c.markup_pct) : 0;
        const mg = c?.margem_pct != null ? Number(c.margem_pct) : markupToMargem(mk);
        return { categoria: cat, markup_pct: mk, margem_pct: mg, fonte: "markup" as const };
      }),
    );
  };

  const novo = () => {
    setEditingId(null);
    setNome("");
    setLinhas(
      CATEGORIAS_MARKUP.map((cat) => ({ categoria: cat, markup_pct: 0, margem_pct: 0, fonte: "markup" as const })),
    );
    setView("form");
  };

  const editar = async (id: string) => {
    setEditingId(id);
    await carregarPerfil(id);
    setView("form");
  };

  const duplicar = async (id: string) => {
    setEditingId(null);
    await carregarPerfil(id);
    setNome((n) => `${n} (cópia)`);
    setView("form");
  };

  const atualizarLinha = (idx: number, campo: "markup" | "margem", valor: string) => {
    const v = Number(valor);
    setLinhas((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        if (!isFinite(v) || v < 0) return l;
        if (campo === "markup") {
          return { ...l, markup_pct: v, margem_pct: markupToMargem(v), fonte: "markup" };
        }
        if (v >= 100) return l;
        return { ...l, margem_pct: v, markup_pct: margemToMarkup(v), fonte: "margem" };
      }),
    );
  };

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const nomeTrim = nome.trim();
      if (nomeTrim.length < 2) throw new Error("Informe um nome para o perfil.");

      // Unicidade entre ativos
      const { data: existentes } = await (supabase as any)
        .from("perfis_markup")
        .select("id, nome")
        .eq("arquivado", false);
      const conflito = (existentes || []).some(
        (p: any) => p.nome.toLowerCase() === nomeTrim.toLowerCase() && p.id !== editingId,
      );
      if (conflito) throw new Error("Já existe um perfil ativo com esse nome.");

      let perfilId = editingId;
      if (perfilId) {
        const { error } = await (supabase as any)
          .from("perfis_markup")
          .update({ nome: nomeTrim, updated_at: new Date().toISOString() })
          .eq("id", perfilId);
        if (error) throw error;
        await (supabase as any).from("perfis_markup_categorias").delete().eq("perfil_id", perfilId);
      } else {
        const { data: created, error } = await (supabase as any)
          .from("perfis_markup")
          .insert({ nome: nomeTrim, ativo: true })
          .select("id")
          .single();
        if (error) throw error;
        perfilId = created.id;
      }

      const payload = linhas
        .filter((l) => l.markup_pct > 0 || l.margem_pct > 0)
        .map((l) => ({
          perfil_id: perfilId,
          categoria: l.categoria,
          markup_pct: l.markup_pct,
          margem_pct: l.margem_pct,
        }));
      if (payload.length > 0) {
        const { error } = await (supabase as any).from("perfis_markup_categorias").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Perfil salvo" });
      qc.invalidateQueries({ queryKey: ["perfis-markup-gerenciar"] });
      qc.invalidateQueries({ queryKey: ["perfis-markup-ativos"] });
      setView("lista");
    },
    onError: (e: any) => {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    },
  });

  const arquivarMutation = useMutation({
    mutationFn: async (id: string) => {
      // Verifica se há orçamentos em uso
      const { count } = await (supabase as any)
        .from("orcamento_categorias_markup")
        .select("id", { count: "exact", head: true })
        .eq("perfil_id_aplicado", id);
      const { count: count2 } = await (supabase as any)
        .from("orcamentos")
        .select("id", { count: "exact", head: true })
        .eq("perfil_markup_id", id)
        .in("status", ["rascunho", "em_cotacao"]);
      const emUso = (count || 0) + (count2 || 0);
      if (emUso > 0) {
        // Arquiva em vez de excluir
        const { error } = await (supabase as any)
          .from("perfis_markup")
          .update({ arquivado: true, ativo: false })
          .eq("id", id);
        if (error) throw error;
        return "arquivado";
      }
      // Exclui
      const { error } = await (supabase as any).from("perfis_markup").delete().eq("id", id);
      if (error) throw error;
      return "excluido";
    },
    onSuccess: (acao) => {
      toast({
        title: acao === "arquivado" ? "Perfil arquivado" : "Perfil excluído",
        description:
          acao === "arquivado"
            ? "Perfil em uso por orçamentos foi arquivado e não aparecerá mais nas listas."
            : undefined,
      });
      qc.invalidateQueries({ queryKey: ["perfis-markup-gerenciar"] });
      qc.invalidateQueries({ queryKey: ["perfis-markup-ativos"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {view === "lista" ? "Perfis de Markup" : editingId ? "Editar perfil" : "Novo perfil"}
          </DialogTitle>
        </DialogHeader>

        {view === "lista" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={novo} size="sm">
                <Plus className="size-4" /> Novo perfil
              </Button>
            </div>
            {perfisQuery.isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : (perfisQuery.data || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum perfil cadastrado. Crie um para começar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center w-32">Categorias</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="text-right w-40">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(perfisQuery.data || []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-center">{p.qtd}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.arquivado ? "Arquivado" : "Ativo"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon-sm" variant="ghost" onClick={() => editar(p.id)} title="Editar">
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => duplicar(p.id)} title="Duplicar">
                            <Copy className="size-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Excluir/arquivar perfil "${p.nome}"?`)) arquivarMutation.mutate(p.id);
                            }}
                            title="Arquivar/Excluir"
                          >
                            <Archive className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Button size="sm" variant="ghost" onClick={() => setView("lista")}>
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            <div>
              <Label>Nome do perfil</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Residencial Premium"
              />
            </div>
            <div>
              <Label>Markup e margem por categoria</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Alterar markup atualiza margem e vice-versa. Categorias sem markup não fazem parte do perfil.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="w-32 text-right">Markup %</TableHead>
                    <TableHead className="w-32 text-right">Margem %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((l, idx) => (
                    <TableRow key={l.categoria}>
                      <TableCell>{l.categoria}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={l.markup_pct.toFixed(2)}
                          onChange={(e) => atualizarLinha(idx, "markup", e.target.value)}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={99.99}
                          step={0.01}
                          value={l.margem_pct.toFixed(2)}
                          onChange={(e) => atualizarLinha(idx, "margem", e.target.value)}
                          className="text-right"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setView("lista")}>
                Cancelar
              </Button>
              <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending}>
                {salvarMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Salvar perfil
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo } from "react";
import {
  Phone, MessageCircle, Mail, MapPin, Copy, Info, Loader2, Star,
  Pencil, Save, X, GitMerge, AlertTriangle,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFornecedoresTodos, Fornecedor } from "@/hooks/useFornecedores";
import { MesclarManualDialog } from "@/components/fornecedores/MesclarManualDialog";

interface Props {
  fornecedorId: string;
  nome?: string;
  itemId?: string;
  itemTipo?: "planta" | "insumo";
  onAvaliacaoSalva?: () => void;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

export function FornecedorPopover({ fornecedorId, nome, itemId, itemTipo, onAvaliacaoSalva }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nota, setNota] = useState<number>(0);
  const [comentario, setComentario] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [editando, setEditando] = useState(false);
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [mesclarOpen, setMesclarOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["fornecedor-detalhe", fornecedorId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fornecedores")
        .select("*")
        .eq("id", fornecedorId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: todosFornec = [] } = useFornecedoresTodos();

  const duplicatasPorNome = useMemo<Fornecedor[]>(() => {
    if (!editando || !form?.nome) return [];
    const alvo = norm(form.nome);
    if (alvo.length < 2) return [];
    return todosFornec.filter(
      (f) =>
        f.id !== fornecedorId &&
        (norm(f.nome) === alvo || norm(f.nome_alternativo || "") === alvo),
    );
  }, [editando, form?.nome, todosFornec, fornecedorId]);

  const iniciarEdicao = () => {
    if (!data) return;
    setForm({
      nome: data.nome || "",
      telefone: data.telefone || "",
      whatsapp: data.whatsapp || "",
      email: data.email || "",
      cidade: data.cidade || "",
      estado: data.estado || "",
      mercado: data.mercado || "",
      observacoes: data.observacoes || "",
    });
    setEditando(true);
  };

  const cancelarEdicao = () => {
    setEditando(false);
    setForm(null);
  };

  const salvarEdicao = async () => {
    if (!form?.nome?.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    setSalvandoEdit(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        telefone: form.telefone?.trim() || null,
        whatsapp: form.whatsapp?.trim() || null,
        email: form.email?.trim() || null,
        cidade: form.cidade?.trim() || null,
        estado: form.estado?.trim() || null,
        mercado: form.mercado?.trim() || null,
        observacoes: form.observacoes?.trim() || null,
      };
      const { error } = await (supabase as any)
        .from("fornecedores")
        .update(payload)
        .eq("id", fornecedorId);
      if (error) throw error;
      toast({ title: "Fornecedor atualizado" });
      setEditando(false);
      await Promise.all([
        refetch(),
        qc.invalidateQueries({ queryKey: ["fornecedores"] }),
        qc.invalidateQueries({ queryKey: ["fornecedores-todos"] }),
        qc.invalidateQueries({ queryKey: ["historico-precos"] }),
      ]);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSalvandoEdit(false);
    }
  };

  const copiar = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: `${label} copiado` });
  };

  const cleanPhone = (p?: string | null) => (p || "").replace(/\D/g, "");
  const wa = cleanPhone(data?.whatsapp || data?.telefone);

  const salvarAvaliacao = async () => {
    if (!nota || !itemId || !itemTipo) return;
    setSalvando(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("fornecedor_avaliacoes").insert({
        fornecedor_id: fornecedorId,
        item_id: itemId,
        item_tipo: itemTipo,
        nota,
        comentario: comentario || null,
        criado_por: auth?.user?.id || null,
      });
      if (error) throw error;
      toast({ title: "Avaliação registrada" });
      setNota(0);
      setComentario("");
      onAvaliacaoSalva?.();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) cancelarEdicao(); }}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver dados do fornecedor">
            <Info className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-3 space-y-2 max-h-[80vh] overflow-y-auto" side="top">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin" /></div>
          ) : !data ? (
            <p className="text-xs text-muted-foreground">Fornecedor não encontrado</p>
          ) : editando && form ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Editar fornecedor</p>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelarEdicao} title="Cancelar">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px]">Nome</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="h-8 text-sm"
                  autoFocus
                />
                {duplicatasPorNome.length > 0 && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 space-y-1.5">
                    <div className="flex items-start gap-1.5 text-[11px] text-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        {duplicatasPorNome.length === 1 ? "Já existe um fornecedor" : `Já existem ${duplicatasPorNome.length} fornecedores`} com nome igual:
                      </span>
                    </div>
                    <ul className="text-[11px] pl-5 space-y-0.5">
                      {duplicatasPorNome.slice(0, 3).map((f) => (
                        <li key={f.id} className="text-foreground">
                          <span className="font-medium">{f.nome}</span>
                          {f.cidade && <span className="text-muted-foreground"> · {f.cidade}</span>}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs"
                      onClick={() => { setEditando(false); setMesclarOpen(true); }}
                    >
                      <GitMerge className="w-3 h-3" /> Mesclar com {duplicatasPorNome.length === 1 ? "esse" : "um desses"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px]">WhatsApp</Label>
                  <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="h-8 text-sm" />
                </div>
              </div>

              <div>
                <Label className="text-[11px]">E-mail</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-8 text-sm" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-[11px]">Cidade</Label>
                  <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px]">UF</Label>
                  <Input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} maxLength={2} className="h-8 text-sm uppercase" />
                </div>
              </div>

              <div>
                <Label className="text-[11px]">Mercado</Label>
                <Input value={form.mercado} onChange={(e) => setForm({ ...form, mercado: e.target.value })} className="h-8 text-sm" />
              </div>

              <div>
                <Label className="text-[11px]">Observações</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  className="text-xs min-h-[50px]"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={cancelarEdicao}>
                  Cancelar
                </Button>
                <Button variant="terracota" size="sm" className="flex-1" disabled={salvandoEdit} onClick={salvarEdicao}>
                  {salvandoEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3" /> Salvar</>}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{data.nome}</p>
                  {(data.mercado || data.categoria_fornecedor) && (
                    <p className="text-[11px] text-muted-foreground">
                      {[data.mercado, data.categoria_fornecedor].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={iniciarEdicao} title="Editar fornecedor">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMesclarOpen(true)} title="Mesclar com outro fornecedor">
                    <GitMerge className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {data.telefone && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="flex-1">{data.telefone}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copiar(data.telefone, "Telefone")}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {data.whatsapp && data.whatsapp !== data.telefone && (
                <div className="flex items-center gap-2 text-xs">
                  <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="flex-1">{data.whatsapp}</span>
                </div>
              )}

              {data.email && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">{data.email}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copiar(data.email, "Email")}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {(data.cidade || data.estado) && (
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{[data.cidade, data.estado].filter(Boolean).join(" / ")}</span>
                </div>
              )}

              {data.observacoes && (
                <p className="text-[11px] text-muted-foreground border-t pt-2 whitespace-pre-wrap">{data.observacoes}</p>
              )}

              {wa && (
                <Button
                  variant="terracota"
                  size="sm"
                  className="w-full mt-1"
                  onClick={() => window.open(`https://wa.me/55${wa}`, "_blank")}
                >
                  <MessageCircle className="w-4 h-4" /> Abrir WhatsApp
                </Button>
              )}

              {itemId && itemTipo && (
                <div className="border-t pt-2 mt-1 space-y-2">
                  <p className="text-[11px] font-medium text-foreground">Avaliar fornecedor para este item</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNota(n === nota ? 0 : n)}
                        className="p-0.5"
                        title={`${n} estrela${n > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={cn(
                            "w-5 h-5 transition-colors",
                            n <= nota ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Comentário (opcional)"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    className="text-xs min-h-[50px]"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={!nota || salvando}
                    onClick={salvarAvaliacao}
                  >
                    {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar avaliação"}
                  </Button>
                </div>
              )}
            </>
          )}
        </PopoverContent>
      </Popover>

      {data && (
        <MesclarManualDialog
          open={mesclarOpen}
          onOpenChange={setMesclarOpen}
          principal={data as Fornecedor}
          onMerged={() => {
            qc.invalidateQueries({ queryKey: ["fornecedores"] });
            qc.invalidateQueries({ queryKey: ["fornecedores-todos"] });
            qc.invalidateQueries({ queryKey: ["historico-precos"] });
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

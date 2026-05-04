import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { GrupoDuplicados, FornecedorDuplicadoItem, useMergeFornecedores } from "@/hooks/useFornecedoresDuplicados";
import { Crown, MapPin, Phone, Mail, Building2, Package, Leaf, History, Warehouse, DollarSign, FileText } from "lucide-react";

interface Props {
  grupo: GrupoDuplicados | null;
  onClose: () => void;
}

export function MesclagemFornecedoresDialog({ grupo, onClose }: Props) {
  const merge = useMergeFornecedores();

  const sugestaoPrincipal = useMemo(() => {
    if (!grupo) return null;
    return [...grupo.fornecedores].sort((a, b) => b.total_uso - a.total_uso)[0]?.id ?? null;
  }, [grupo]);

  const [principalId, setPrincipalId] = useState<string | null>(sugestaoPrincipal);
  const [excluir, setExcluir] = useState<Record<string, boolean>>({});

  // Reset on grupo change
  useMemo(() => {
    setPrincipalId(sugestaoPrincipal);
    setExcluir({});
  }, [grupo?.grupo_key, sugestaoPrincipal]);

  if (!grupo) return null;

  const duplicadoIds = grupo.fornecedores
    .filter(f => f.id !== principalId && !excluir[f.id])
    .map(f => f.id);

  const principal = grupo.fornecedores.find(f => f.id === principalId) ?? null;

  const previewMerged = useMemo(() => {
    if (!principal) return null;
    const merged = { ...principal } as any;
    const duplicados = grupo.fornecedores.filter(f => duplicadoIds.includes(f.id));
    const fields: (keyof FornecedorDuplicadoItem)[] = [
      "cnpj","telefone","email","cidade","mercado","nome_alternativo",
    ];
    for (const f of fields) {
      if (!merged[f]) {
        for (const d of duplicados) {
          if ((d as any)[f]) { merged[f] = (d as any)[f]; break; }
        }
      }
    }
    return merged as FornecedorDuplicadoItem;
  }, [principal, grupo, duplicadoIds]);

  const handleMerge = async () => {
    if (!principalId || duplicadoIds.length === 0) return;
    await merge.mutateAsync({ principalId, duplicadoIds });
    onClose();
  };

  return (
    <Dialog open={!!grupo} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Mesclar fornecedores duplicados
            <Badge variant={grupo.confianca === "alta" ? "default" : "secondary"}>
              Confiança {grupo.confianca === "alta" ? "alta" : "média"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Escolha o fornecedor <strong>principal</strong> (que vai sobreviver). Os demais
            terão suas plantas, insumos, históricos e movimentações reapontados para ele e
            serão removidos. Campos vazios do principal serão preenchidos com dados dos duplicados.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={principalId ?? ""} onValueChange={setPrincipalId}>
          <div className="grid gap-3 md:grid-cols-2">
            {grupo.fornecedores.map((f) => {
              const isPrincipal = f.id === principalId;
              const isExcluded = excluir[f.id];
              return (
                <div
                  key={f.id}
                  className={`relative rounded-lg border p-4 transition ${
                    isPrincipal
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : isExcluded
                      ? "border-border bg-muted/40 opacity-60"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={f.id} id={`p-${f.id}`} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor={`p-${f.id}`} className="cursor-pointer">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isPrincipal && <Crown className="w-4 h-4 text-primary" />}
                          <span className="font-display text-lg font-semibold">{f.nome}</span>
                        </div>
                        {f.nome_alternativo && (
                          <div className="text-xs text-muted-foreground mt-0.5">{f.nome_alternativo}</div>
                        )}
                      </Label>

                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {f.cnpj && <div className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" />{f.cnpj}</div>}
                        {f.telefone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{f.telefone}</div>}
                        {f.email && <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5" />{f.email}</div>}
                        {(f.cidade || f.mercado) && (
                          <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{[f.cidade, f.mercado].filter(Boolean).join(" · ")}</div>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <Stat icon={Leaf} label="Plantas" v={f.qtd_plantas} />
                        <Stat icon={Package} label="Insumos" v={f.qtd_insumos} />
                        <Stat icon={History} label="Histórico" v={f.qtd_historico} />
                        <Stat icon={Warehouse} label="Estoque" v={f.qtd_estoque} />
                        <Stat icon={DollarSign} label="Financeiro" v={f.qtd_fin} />
                        <Stat icon={FileText} label="Cotações" v={f.qtd_cotacoes} />
                      </div>

                      {!isPrincipal && (
                        <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <Checkbox
                            checked={!!isExcluded}
                            onCheckedChange={(c) => setExcluir(prev => ({ ...prev, [f.id]: !!c }))}
                          />
                          Não é duplicado — manter separado
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </RadioGroup>

        {previewMerged && duplicadoIds.length > 0 && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 mt-2">
            <div className="text-xs font-semibold uppercase text-primary mb-2">Resultado após mesclagem</div>
            <div className="font-display text-lg">{previewMerged.nome}</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 mt-2 text-sm text-muted-foreground">
              {previewMerged.cnpj && <div><strong className="text-foreground">CNPJ:</strong> {previewMerged.cnpj}</div>}
              {previewMerged.telefone && <div><strong className="text-foreground">Telefone:</strong> {previewMerged.telefone}</div>}
              {previewMerged.email && <div><strong className="text-foreground">Email:</strong> {previewMerged.email}</div>}
              {previewMerged.cidade && <div><strong className="text-foreground">Cidade:</strong> {previewMerged.cidade}</div>}
              {previewMerged.mercado && <div><strong className="text-foreground">Mercado:</strong> {previewMerged.mercado}</div>}
              {previewMerged.nome_alternativo && <div><strong className="text-foreground">Apelido:</strong> {previewMerged.nome_alternativo}</div>}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleMerge}
            disabled={!principalId || duplicadoIds.length === 0 || merge.isPending}
          >
            {merge.isPending
              ? "Mesclando..."
              : `Mesclar ${duplicadoIds.length} em 1`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon: Icon, label, v }: { icon: any; label: string; v: number }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${v > 0 ? "bg-muted/60 text-foreground" : "text-muted-foreground/60"}`}>
      <Icon className="w-3 h-3" />
      <span className="font-medium">{v}</span>
      <span className="text-[10px] uppercase">{label}</span>
    </div>
  );
}

import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Crown, AlertTriangle } from "lucide-react";
import { useFornecedoresTodos, Fornecedor } from "@/hooks/useFornecedores";
import { useMergeFornecedores } from "@/hooks/useFornecedoresDuplicados";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  principal: Fornecedor;
  onMerged?: () => void;
}

const norm = (s?: string | null) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
const onlyDigits = (s?: string | null) => (s || "").replace(/\D/g, "");

export function MesclarManualDialog({ open, onOpenChange, principal, onMerged }: Props) {
  const { data: fornecedores = [] } = useFornecedoresTodos();
  const merge = useMergeFornecedores();
  const [search, setSearch] = useState("");
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [confirmar, setConfirmar] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const principalKeys = useMemo(() => {
    const nome = norm(principal.nome);
    const alt = norm(principal.nome_alternativo);
    const cnpj = onlyDigits(principal.cnpj);
    const tel = onlyDigits((principal as any).telefone);
    const wa = onlyDigits((principal as any).whatsapp);
    return { nome, alt, cnpj, tel, wa };
  }, [principal]);

  const provaveis = useMemo(() => {
    return fornecedores.filter((f) => {
      if (f.id === principal.id) return false;
      const n = norm(f.nome);
      const a = norm(f.nome_alternativo);
      if (principalKeys.nome && (n === principalKeys.nome || a === principalKeys.nome)) return true;
      if (principalKeys.alt && (n === principalKeys.alt || a === principalKeys.alt)) return true;
      if (principalKeys.cnpj && principalKeys.cnpj.length >= 11 && onlyDigits(f.cnpj) === principalKeys.cnpj) return true;
      const ft = onlyDigits((f as any).telefone);
      const fw = onlyDigits((f as any).whatsapp);
      if (principalKeys.tel && principalKeys.tel.length >= 8 && (ft === principalKeys.tel || fw === principalKeys.tel)) return true;
      if (principalKeys.wa && principalKeys.wa.length >= 8 && (ft === principalKeys.wa || fw === principalKeys.wa)) return true;
      return false;
    });
  }, [fornecedores, principal.id, principalKeys]);

  const lista = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = mostrarTodos || term.length > 0
      ? fornecedores.filter((f) => f.id !== principal.id)
      : provaveis;
    return base
      .filter(f => {
        if (!term) return true;
        return (
          f.nome.toLowerCase().includes(term) ||
          (f.nome_alternativo?.toLowerCase().includes(term) ?? false) ||
          (f.cnpj?.toLowerCase().includes(term) ?? false) ||
          (f.cidade?.toLowerCase().includes(term) ?? false)
        );
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .slice(0, 50);
  }, [fornecedores, search, principal.id, mostrarTodos, provaveis]);

  const idsSelecionados = Object.keys(selecionados).filter(k => selecionados[k]);

  const handleConfirm = async () => {
    await merge.mutateAsync({
      principalId: principal.id,
      duplicadoIds: idsSelecionados,
    });
    setConfirmar(false);
    setSelecionados({});
    setSearch("");
    onOpenChange(false);
    onMerged?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelecionados({}); setSearch(""); } onOpenChange(o); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Mesclar fornecedores em "{principal.nome}"</DialogTitle>
            <DialogDescription>
              Selecione os fornecedores que devem ser unificados a <strong>{principal.nome}</strong>.
              Plantas, insumos, histórico e movimentações dos selecionados serão reapontados, e
              campos vazios deste fornecedor serão preenchidos com os dados deles. Os selecionados
              serão removidos ao final.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary shrink-0" />
            <div className="text-sm">
              <strong>{principal.nome}</strong>
              <span className="text-muted-foreground"> será o fornecedor principal (sobrevivente)</span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, apelido, CNPJ ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {search.trim()
                ? `Buscando em todos (${fornecedores.length - 1})`
                : mostrarTodos
                  ? `Mostrando todos (${fornecedores.length - 1})`
                  : `${provaveis.length} provável(eis) duplicata(s) por nome, CNPJ ou telefone`}
            </span>
            {!search.trim() && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setMostrarTodos((v) => !v)}
              >
                {mostrarTodos ? "Ver só prováveis" : "Ver todos"}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto rounded-lg border border-border divide-y">
            {lista.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {!search.trim() && !mostrarTodos
                  ? "Nenhuma duplicata óbvia encontrada. Use a busca ou clique em \"Ver todos\"."
                  : "Nenhum fornecedor encontrado"}
              </div>
            ) : (
              lista.map((f) => {
                const checked = !!selecionados[f.id];
                return (
                  <label
                    key={f.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 transition ${checked ? "bg-primary/5" : ""}`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => setSelecionados(prev => ({ ...prev, [f.id]: !!c }))}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{f.nome}</span>
                        {f.nome_alternativo && (
                          <span className="text-xs text-muted-foreground">({f.nome_alternativo})</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[f.cnpj, f.cidade, f.mercado].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="text-sm text-muted-foreground mr-auto">
              {idsSelecionados.length > 0
                ? `${idsSelecionados.length} fornecedor(es) selecionado(s)`
                : "Nenhum selecionado"}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={() => setConfirmar(true)}
              disabled={idsSelecionados.length === 0 || merge.isPending}
            >
              Mesclar {idsSelecionados.length > 0 ? `${idsSelecionados.length} em 1` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Confirmar mesclagem?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {idsSelecionados.length} fornecedor(es) serão unificados em <strong>{principal.nome}</strong>.
              Todos os vínculos (plantas, insumos, histórico de preços, estoque, financeiro e cotações)
              serão transferidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merge.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={merge.isPending}>
              {merge.isPending ? "Mesclando..." : "Confirmar mesclagem"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

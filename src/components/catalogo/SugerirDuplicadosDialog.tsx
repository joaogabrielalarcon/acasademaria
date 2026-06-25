import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitMerge, Sparkles } from "lucide-react";
import { sugerirDuplicadosCatalogo, DuplicadoPar, MatchTipo } from "@/hooks/useCatalogoMatch";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tipo: MatchTipo;
  /** Callback que recebe o par escolhido para abrir o MesclarItensDialog do chamador. */
  onEscolher: (par: DuplicadoPar) => void;
}

export function SugerirDuplicadosDialog({ open, onOpenChange, tipo, onEscolher }: Props) {
  const { data: pares = [], isLoading } = useQuery({
    queryKey: ["sugestao-duplicados-catalogo", tipo],
    queryFn: () => sugerirDuplicadosCatalogo(tipo, 0.7, 80),
    enabled: open,
    staleTime: 60_000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Possíveis duplicados no catálogo
          </DialogTitle>
          <DialogDescription>
            Pares com nomes muito parecidos. Escolha um para revisar e mesclar manualmente.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Analisando…</div>
        ) : pares.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum par suspeito encontrado.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto divide-y rounded-md border">
            {pares.map((p, i) => (
              <button
                key={`${p.a_id}-${p.b_id}-${i}`}
                type="button"
                onClick={() => onEscolher(p)}
                className="w-full text-left p-3 hover:bg-muted/40 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.a_nome}</div>
                  {p.a_secundario && (
                    <div className="text-xs italic text-muted-foreground truncate">{p.a_secundario}</div>
                  )}
                </div>
                <GitMerge className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.b_nome}</div>
                  {p.b_secundario && (
                    <div className="text-xs italic text-muted-foreground truncate">{p.b_secundario}</div>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {Math.round(p.score * 100)}%
                </Badge>
              </button>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          A mesclagem nunca é automática: você escolhe o principal e confirma.
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useFornecedoresDuplicados, GrupoDuplicados } from "@/hooks/useFornecedoresDuplicados";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MesclagemFornecedoresDialog } from "./MesclagemFornecedoresDialog";
import { AlertCircle, ArrowRight, RefreshCw, Sparkles } from "lucide-react";

export function DuplicadosTab() {
  const { data: grupos = [], isLoading, refetch, isFetching } = useFornecedoresDuplicados();
  const [grupoAberto, setGrupoAberto] = useState<GrupoDuplicados | null>(null);

  const altas = grupos.filter(g => g.confianca === "alta");
  const medias = grupos.filter(g => g.confianca === "media");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Detectamos automaticamente fornecedores possivelmente duplicados.
            Escolha um grupo, defina o principal e mesclar.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Recarregar
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Analisando duplicados...</div>
      ) : grupos.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
          <div className="font-display text-xl">Nenhum duplicado encontrado</div>
          <div className="text-sm text-muted-foreground mt-1">Sua base de fornecedores está limpa.</div>
        </div>
      ) : (
        <>
          {altas.length > 0 && (
            <Section
              titulo="Confiança alta"
              descricao="Mesmo CNPJ ou nome idêntico"
              grupos={altas}
              onAbrir={setGrupoAberto}
              variant="alta"
            />
          )}
          {medias.length > 0 && (
            <Section
              titulo="Confiança média"
              descricao="Nomes muito parecidos"
              grupos={medias}
              onAbrir={setGrupoAberto}
              variant="media"
            />
          )}
        </>
      )}

      <MesclagemFornecedoresDialog grupo={grupoAberto} onClose={() => setGrupoAberto(null)} />
    </div>
  );
}

function Section({
  titulo, descricao, grupos, onAbrir, variant,
}: {
  titulo: string;
  descricao: string;
  grupos: GrupoDuplicados[];
  onAbrir: (g: GrupoDuplicados) => void;
  variant: "alta" | "media";
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h3 className="font-display text-lg font-semibold">{titulo}</h3>
        <Badge variant={variant === "alta" ? "default" : "secondary"}>{grupos.length}</Badge>
        <span className="text-xs text-muted-foreground">{descricao}</span>
      </div>
      <div className="grid gap-3">
        {grupos.map((g) => {
          const totalUso = g.fornecedores.reduce((s, f) => s + f.total_uso, 0);
          return (
            <button
              key={g.grupo_key}
              onClick={() => onAbrir(g)}
              className="text-left rounded-lg border border-border bg-card hover:bg-muted/30 transition p-4 flex items-center gap-4"
            >
              {variant === "alta" && <AlertCircle className="w-5 h-5 text-primary shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-2 items-center">
                  {g.fornecedores.map((f, i) => (
                    <span key={f.id} className="text-sm">
                      <span className="font-medium">{f.nome}</span>
                      {i < g.fornecedores.length - 1 && <span className="text-muted-foreground mx-1">·</span>}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {g.fornecedores.length} fornecedores · {totalUso} vínculos no total
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

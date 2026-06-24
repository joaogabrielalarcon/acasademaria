import { Clock, RotateCcw, X, CloudOff, Cloud, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DraftHandle } from "@/hooks/useAutosaveDraft";

interface Props {
  draft: DraftHandle;
  /** Mensagem extra mostrada quando há rascunho (ex.: avisos sobre anexos). */
  hint?: string;
}

function formatWhen(d: Date | null): string {
  if (!d) return "";
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function DraftResumeBanner({ draft, hint }: Props) {
  if (draft.resumeAvailable) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Você tem um rascunho salvo {formatWhen(draft.resumeUpdatedAt)}.
          </p>
          <p className="text-xs text-muted-foreground">
            {hint ?? "Anexos e arquivos selecionados precisam ser adicionados de novo."}
          </p>
        </div>
        <Button size="sm" variant="terracota" onClick={draft.resume} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Retomar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void draft.discard();
          }}
          className="gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          Descartar
        </Button>
      </div>
    );
  }
  return null;
}

export function DraftStatusBadge({ draft }: Props) {
  const { status, lastSavedAt } = draft;
  if (status === "loading") return null;
  let icon: React.ReactNode = null;
  let text = "";
  if (status === "saving") {
    icon = <Loader2 className="h-3 w-3 animate-spin" />;
    text = "Salvando rascunho...";
  } else if (status === "saved") {
    icon = <Check className="h-3 w-3" />;
    text = `Rascunho salvo ${formatWhen(lastSavedAt)}`;
  } else if (status === "error") {
    icon = <CloudOff className="h-3 w-3" />;
    text = "Salvo local (sem conexão)";
  } else if (lastSavedAt) {
    icon = <Cloud className="h-3 w-3" />;
    text = `Rascunho salvo ${formatWhen(lastSavedAt)}`;
  }
  if (!text) return null;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
      {icon}
      {text}
    </div>
  );
}

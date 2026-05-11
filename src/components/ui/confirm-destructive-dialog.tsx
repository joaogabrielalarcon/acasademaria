import { useState, useEffect, ReactNode } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2 } from "lucide-react";

export interface ConfirmDestructiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Modo de confirmação: 'type-name' exige digitar o nome; 'checkbox' exige marcar uma caixa. */
  mode?: "type-name" | "checkbox";
  /** Nome exato a ser digitado quando mode='type-name'. */
  expectedName?: string;
  /** Texto da checkbox quando mode='checkbox'. Default: "Entendo o impacto desta ação". */
  acknowledgeText?: string;
  /** Prévia detalhada (contadores de relacionamento, lista, etc.). */
  preview?: ReactNode;
  /** Texto do botão de confirmação. */
  confirmLabel?: string;
  /** Variante visual do botão: 'destructive' (exclusão) | 'default' (fusão). */
  confirmVariant?: "destructive" | "default";
  onConfirm: () => Promise<void> | void;
}

/** Diálogo de confirmação dupla com prévia detalhada para ações destrutivas/irreversíveis. */
export function ConfirmDestructiveDialog({
  open,
  onOpenChange,
  title,
  description,
  mode = "type-name",
  expectedName,
  acknowledgeText = "Entendo o impacto desta ação e quero prosseguir.",
  preview,
  confirmLabel = "Confirmar",
  confirmVariant = "destructive",
  onConfirm,
}: ConfirmDestructiveDialogProps) {
  const [typed, setTyped] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTyped("");
      setAcknowledged(false);
      setSubmitting(false);
    }
  }, [open]);

  const canConfirm =
    !submitting &&
    (mode === "type-name"
      ? !!expectedName && typed.trim() === expectedName.trim()
      : acknowledged);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {preview && (
          <div className="border rounded-lg p-3 bg-muted/40 text-sm space-y-1">
            {preview}
          </div>
        )}

        {mode === "type-name" && expectedName && (
          <div className="space-y-2">
            <Label htmlFor="confirm-name" className="text-sm">
              Para confirmar, digite{" "}
              <span className="font-mono font-semibold text-foreground">{expectedName}</span>
            </Label>
            <Input
              id="confirm-name"
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={expectedName}
              autoComplete="off"
            />
          </div>
        )}

        {mode === "checkbox" && (
          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(v) => setAcknowledged(v === true)}
              autoFocus
            />
            <span className="leading-snug">{acknowledgeText}</span>
          </label>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant={confirmVariant === "destructive" ? "destructive" : "terracota"}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

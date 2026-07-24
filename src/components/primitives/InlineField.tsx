import * as React from "react";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InlineFieldProps {
  label: string;
  value?: string | null;
  placeholder?: string;
  onSave?: (v: string) => Promise<void> | void;
  editable?: boolean;
  className?: string;
  emptyLabel?: string;
}

/**
 * InlineField — label CAPS acima + valor Body 600.
 * Vazio: itálico --muted + "informar" em --primary.
 * Editar inline com input shadcn.
 */
export function InlineField({
  label,
  value,
  placeholder,
  onSave,
  editable = true,
  className,
  emptyLabel = "informar",
}: InlineFieldProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setDraft(value ?? ""), [value]);

  const commit = async () => {
    if (!onSave) return setEditing(false);
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1 py-2 group", className)}>
      <span className="type-label">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
            }}
            className="h-9"
          />
          <Button size="icon-sm" variant="ghost" loading={saving} onClick={commit}>
            <Check className="w-4 h-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => { setDraft(value ?? ""); setEditing(false); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : value ? (
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-foreground">{value}</span>
          {editable && onSave && (
            <button
              onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
              aria-label="editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => editable && onSave && setEditing(true)}
          disabled={!editable || !onSave}
          className="text-left text-[15px] italic text-muted-foreground disabled:cursor-default"
        >
          <span className="italic">—</span>
          {editable && onSave && <span className="not-italic text-primary ml-2 text-[13px] font-medium">{emptyLabel}</span>}
        </button>
      )}
    </div>
  );
}

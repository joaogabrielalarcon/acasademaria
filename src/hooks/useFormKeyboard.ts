import { useEffect, RefObject } from "react";

/**
 * Keyboard helpers for forms:
 * - Cmd/Ctrl + Enter triggers submit
 * - Esc triggers onCancel (when provided)
 *
 * Attach the returned ref to the form root (or any container).
 */
export function useFormKeyboard(opts: {
  containerRef: RefObject<HTMLElement>;
  onSubmit?: () => void;
  onCancel?: () => void;
  enabled?: boolean;
}) {
  const { containerRef, onSubmit, onCancel, enabled = true } = opts;

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter -> submit
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && onSubmit) {
        e.preventDefault();
        onSubmit();
        return;
      }
      // Esc -> cancel (only if not closing a select/popover)
      if (e.key === "Escape" && onCancel) {
        const target = e.target as HTMLElement | null;
        // Don't hijack Esc inside open native selects
        if (target?.tagName === "SELECT") return;
        onCancel();
      }
    };

    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [containerRef, onSubmit, onCancel, enabled]);
}

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Autosave universal de rascunhos por usuário.
 * Combina cache local (instantâneo, offline) + tabela form_drafts (multi-dispositivo).
 *
 * Uso típico:
 *   const draft = useAutosaveDraft({
 *     formKey: "novo-orcamento",
 *     scopeKey: clienteId ?? "novo",
 *     schemaVersion: 1,
 *     enabled: !isEdit,
 *     getSnapshot: () => ({ etapaAtual, form, itens, ... }),
 *     applySnapshot: (s) => { setEtapaAtual(s.etapaAtual); ... },
 *   });
 *   // No submit final:
 *   await draft.clearDraft();
 *
 *   // Banner:
 *   <DraftResumeBanner draft={draft} />
 */

export interface AutosaveDraftOptions<T = any> {
  formKey: string;
  scopeKey?: string;
  schemaVersion?: number;
  enabled?: boolean;
  /** Snapshot serializável do estado atual. Retorne null para pular o save. */
  getSnapshot: () => T | null;
  /** Aplica um snapshot recuperado. */
  applySnapshot: (data: T) => void;
  /** Debounce em ms (default 1500). */
  debounceMs?: number;
}

export type DraftStatus = "idle" | "saving" | "saved" | "error" | "loading";

export interface DraftHandle<T = any> {
  status: DraftStatus;
  lastSavedAt: Date | null;
  resumeAvailable: boolean;
  resumeUpdatedAt: Date | null;
  resume: () => void;
  discard: () => Promise<void>;
  clearDraft: () => Promise<void>;
  /** Marca que o snapshot foi recém-aplicado, segurando o próximo save. */
  pauseOnce: () => void;
}

const LS_PREFIX = "draft:";

function lsKey(userId: string, formKey: string, scopeKey: string) {
  return `${LS_PREFIX}${userId}:${formKey}:${scopeKey}`;
}

function safeStringify(value: any): string | null {
  try {
    return JSON.stringify(value, (_k, v) => {
      if (v instanceof File || v instanceof Blob || v instanceof FileList) return undefined;
      if (typeof v === "function") return undefined;
      if (v instanceof Map) return Array.from(v.entries());
      if (v instanceof Set) return Array.from(v.values());
      return v;
    });
  } catch (e) {
    console.warn("[autosave] serialize falhou", e);
    return null;
  }
}

function safeParse<T = any>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const MAX_SIZE = 500 * 1024; // 500KB por rascunho

export function useAutosaveDraft<T = any>(opts: AutosaveDraftOptions<T>): DraftHandle<T> {
  const {
    formKey,
    scopeKey = "",
    schemaVersion = 1,
    enabled = true,
    getSnapshot,
    applySnapshot,
    debounceMs = 1500,
  } = opts;

  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<DraftStatus>("loading");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [resumeAvailable, setResumeAvailable] = useState(false);
  const [resumeUpdatedAt, setResumeUpdatedAt] = useState<Date | null>(null);
  const pendingSnapshotRef = useRef<T | null>(null);
  const debounceRef = useRef<number | null>(null);
  const lastSerializedRef = useRef<string | null>(null);
  const pauseOnceRef = useRef(false);
  const initializedRef = useRef(false);

  // Carrega usuário
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Verifica se há rascunho pra retomar (local + servidor; pega o mais recente)
  useEffect(() => {
    if (!enabled || !userId) {
      setStatus("idle");
      return;
    }
    let mounted = true;
    (async () => {
      setStatus("loading");
      const lsRaw = localStorage.getItem(lsKey(userId, formKey, scopeKey));
      const local = safeParse<{ data: T; schema_version: number; updated_at: string }>(lsRaw);

      let remote: { data: T; schema_version: number; updated_at: string } | null = null;
      try {
        const { data, error } = await (supabase as any)
          .from("form_drafts")
          .select("data, schema_version, updated_at")
          .eq("user_id", userId)
          .eq("form_key", formKey)
          .eq("scope_key", scopeKey)
          .maybeSingle();
        if (!error && data) remote = data as any;
      } catch (e) {
        console.warn("[autosave] load remote falhou", e);
      }

      if (!mounted) return;

      // Escolhe o mais recente válido com mesmo schema
      const candidates = [local, remote]
        .filter((c): c is { data: T; schema_version: number; updated_at: string } => !!c && c.schema_version === schemaVersion)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      const chosen = candidates[0] ?? null;

      if (chosen) {
        setResumeAvailable(true);
        setResumeUpdatedAt(new Date(chosen.updated_at));
        pendingSnapshotRef.current = chosen.data;
      } else {
        setResumeAvailable(false);
      }
      initializedRef.current = true;
      setStatus("idle");
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId, formKey, scopeKey, schemaVersion]);

  const persist = useCallback(
    async (snapshot: T) => {
      if (!userId) return;
      const serialized = safeStringify({
        data: snapshot,
        schema_version: schemaVersion,
        updated_at: new Date().toISOString(),
      });
      if (!serialized) return;
      if (serialized.length > MAX_SIZE) {
        console.warn(`[autosave] rascunho ${formKey} excede ${MAX_SIZE} bytes, pulando.`);
        return;
      }
      if (serialized === lastSerializedRef.current) return;
      lastSerializedRef.current = serialized;

      // Local (síncrono, imediato)
      try {
        localStorage.setItem(lsKey(userId, formKey, scopeKey), serialized);
      } catch (e) {
        console.warn("[autosave] localStorage falhou", e);
      }

      // Remoto
      setStatus("saving");
      try {
        const { error } = await (supabase as any).from("form_drafts").upsert(
          {
            user_id: userId,
            form_key: formKey,
            scope_key: scopeKey,
            schema_version: schemaVersion,
            data: snapshot,
            client_id: getClientId(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,form_key,scope_key" },
        );
        if (error) throw error;
        setLastSavedAt(new Date());
        setStatus("saved");
      } catch (e) {
        console.warn("[autosave] upsert remoto falhou", e);
        setStatus("error");
      }
    },
    [userId, formKey, scopeKey, schemaVersion],
  );

  // Loop de autosave: a cada render, lê snapshot e agenda gravação
  useEffect(() => {
    if (!enabled || !userId || !initializedRef.current) return;
    if (pauseOnceRef.current) {
      pauseOnceRef.current = false;
      return;
    }
    const snap = getSnapshot();
    if (snap == null) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      persist(snap);
    }, debounceMs);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  });

  const resume = useCallback(() => {
    const snap = pendingSnapshotRef.current;
    if (snap == null) return;
    pauseOnceRef.current = true;
    applySnapshot(snap);
    setResumeAvailable(false);
  }, [applySnapshot]);

  const clearDraft = useCallback(async () => {
    if (!userId) return;
    lastSerializedRef.current = null;
    try {
      localStorage.removeItem(lsKey(userId, formKey, scopeKey));
    } catch {}
    try {
      await (supabase as any)
        .from("form_drafts")
        .delete()
        .eq("user_id", userId)
        .eq("form_key", formKey)
        .eq("scope_key", scopeKey);
    } catch (e) {
      console.warn("[autosave] clear remoto falhou", e);
    }
    setResumeAvailable(false);
    setLastSavedAt(null);
    setStatus("idle");
  }, [userId, formKey, scopeKey]);

  const discard = useCallback(async () => {
    pendingSnapshotRef.current = null;
    await clearDraft();
  }, [clearDraft]);

  const pauseOnce = useCallback(() => {
    pauseOnceRef.current = true;
  }, []);

  return {
    status,
    lastSavedAt,
    resumeAvailable,
    resumeUpdatedAt,
    resume,
    discard,
    clearDraft,
    pauseOnce,
  };
}

function getClientId(): string {
  try {
    const k = "draft:client-id";
    let v = localStorage.getItem(k);
    if (!v) {
      v = (crypto as any)?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return "anon";
  }
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import logoMfm from "@/assets/logo-mfm-raiz.png";

// Beta helper — narrowly typed local wrapper for supabase.auth.oauth.
interface AuthorizationDetails {
  client?: { name?: string; client_uri?: string; logo_uri?: string };
  redirect_url?: string;
  redirect_to?: string;
  redirect_uri?: string;
  scopes?: string[];
  scope?: string;
}
interface OauthResult {
  data?: AuthorizationDetails;
  error?: { message: string };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authOauth = (supabase.auth as any).oauth as {
  getAuthorizationDetails: (id: string) => Promise<OauthResult>;
  approveAuthorization: (id: string) => Promise<OauthResult>;
  denyAuthorization: (id: string) => Promise<OauthResult>;
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Solicitação inválida (authorization_id ausente).");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }

      if (!authOauth?.getAuthorizationDetails) {
        setError("O servidor de autorização não está disponível neste ambiente.");
        return;
      }

      const { data, error } = await authOauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data ?? null);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    if (!authOauth) return;
    setBusy(true);
    const { data, error } = approve
      ? await authOauth.approveAuthorization(authorizationId)
      : await authOauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou um destino de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  const scopes = details?.scopes ?? (details?.scope ? details.scope.split(/\s+/).filter(Boolean) : []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src={logoMfm} alt="MFM Paisagismo" className="h-12 object-contain" />
        </div>

        <div className="card-botanical p-6 space-y-4">
          {error ? (
            <>
              <h1 className="font-serif text-xl text-foreground">Não foi possível carregar</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
            </>
          ) : !details ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <h1 className="font-serif text-xl text-foreground">
                Conectar {details.client?.name ?? "aplicativo"} à sua conta
              </h1>
              <p className="text-sm text-muted-foreground">
                {details.client?.name ?? "O aplicativo"} poderá usar este sistema em seu nome, com as
                mesmas permissões que você tem hoje. Nenhuma política de acesso é ignorada.
              </p>

              {scopes.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Escopos solicitados</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {scopes.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => decide(true)}
                  disabled={busy}
                  variant="terracota"
                  className="flex-1"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aprovar"}
                </Button>
                <Button
                  onClick={() => decide(false)}
                  disabled={busy}
                  variant="outline"
                  className="flex-1"
                >
                  Negar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

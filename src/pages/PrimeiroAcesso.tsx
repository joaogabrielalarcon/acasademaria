import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useAccessState } from "@/hooks/useAuth";
import { invokeFunction } from "@/lib/invoke-function";
import logoMfm from "@/assets/logo-mfm-raiz.png";

export default function PrimeiroAcesso() {
  const [params] = useSearchParams();
  const rawNext = params.get("next");
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/primeiro-acesso") ? rawNext : "/";
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: access } = useAccessState(user?.id);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [busy, setBusy] = useState(false);

  const expirada = !!access?.temp_password_expires_at && new Date(access.temp_password_expires_at) < new Date();

  if (access && !access.must_change_password) return <Navigate to={next} replace />;

  const sair = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) {
      toast({ title: "Senha curta", description: "Use pelo menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (senha !== confirma) {
      toast({ title: "As senhas não conferem", description: "Digite a mesma senha nos dois campos.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await invokeFunction("trocar-senha-provisoria", { nova_senha: senha });
    setBusy(false);
    if (error) {
      toast({ title: "Não foi possível trocar", description: error, variant: "destructive" });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["access_state"] });
    toast({ title: "Senha trocada", description: "Tudo liberado. Bem-vinda(o)!" });
    // Full reload so OAuth/consent flows resume cleanly.
    window.location.assign(next);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <img src={logoMfm} alt="MFM Paisagismo" className="h-12 object-contain" />
        </div>
        <div className="card-botanical p-6 space-y-4">
          <div className="space-y-1">
            <h1 className="font-serif text-2xl text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-muted-foreground" aria-hidden />
              Crie a sua senha
            </h1>
            <p className="text-sm text-muted-foreground">
              Você entrou com uma senha provisória. Escolha uma senha sua para liberar o sistema.
            </p>
          </div>

          {expirada ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">Sua senha provisória expirou. Peça uma nova à direção.</p>
              <Button variant="outline" className="w-full" onClick={sair}>Sair</Button>
            </div>
          ) : (
            <form onSubmit={salvar} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="nova">Nova senha</Label>
                <Input id="nova" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} disabled={busy} />
                <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres, diferente da provisória.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirma">Repita a nova senha</Label>
                <Input id="confirma" type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} disabled={busy} />
              </div>
              <Button type="submit" variant="terracota" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar e entrar"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={sair} disabled={busy}>Sair</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoMfm from "@/assets/logo-mfm-raiz.png";

function isStrongPassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const isRecoveryLink = hashParams.get("type") === "recovery";

    if (!isRecoveryLink) {
      setIsRecoverySession(false);
      setCheckingLink(false);
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setIsRecoverySession(true);
        setCheckingLink(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsRecoverySession(Boolean(session));
      setCheckingLink(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a nova senha e a confirmação.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (!isStrongPassword(password)) {
      toast({
        title: "Senha fraca",
        description: "Use pelo menos 8 caracteres com letras e números.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Senha redefinida",
        description: "Sua nova senha foi salva com sucesso.",
      });

      navigate("/", { replace: true });
    } catch (error: any) {
      toast({
        title: "Erro ao redefinir",
        description: error.message || "Não foi possível salvar sua nova senha.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="flex flex-col items-center w-full max-w-md gap-6">
        <div className="flex flex-col items-center">
          <img src={logoMfm} alt="MFM Paisagismo" className="w-[340px] max-w-[80vw] h-auto object-contain" />
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Redefinir senha</CardTitle>
            </div>
            <CardDescription>
              {isRecoverySession
                ? "Cadastre sua nova senha para voltar ao sistema."
                : "Esse link é inválido ou expirou. Solicite um novo e-mail de redefinição."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isRecoverySession ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>

                <Button type="submit" className="w-full" variant="terracota" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar nova senha"
                  )}
                </Button>
              </form>
            ) : (
              <Button variant="terracota" className="w-full" asChild>
                <Link to="/esqueci-senha">Solicitar novo link</Link>
              </Button>
            )}

            <Button variant="ghost" className="w-full mt-3" asChild>
              <Link to="/login">
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

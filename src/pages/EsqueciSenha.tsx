import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoMfm from "@/assets/logo-mfm-raiz.png";

export default function EsqueciSenha() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o e-mail vinculado ao seu acesso.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "E-mail enviado",
        description: "Se o e-mail existir na base, você receberá as instruções de redefinição.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível solicitar a redefinição agora.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="flex flex-col items-center w-full max-w-md gap-6">
        <div className="flex flex-col items-center">
          <img src={logoMfm} alt="MFM Paisagismo" className="w-[340px] max-w-[80vw] h-auto object-contain" />
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Esqueci minha senha</CardTitle>
            </div>
            <CardDescription>
              Informe seu e-mail para receber o link de redefinição de senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || emailSent}
                  autoComplete="email"
                />
              </div>

              <Button type="submit" className="w-full" variant="terracota" disabled={isLoading || emailSent}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : emailSent ? (
                  "E-mail enviado"
                ) : (
                  "Enviar link de redefinição"
                )}
              </Button>
            </form>

            <div className="mt-4 flex flex-col gap-3">
              {emailSent && (
                <p className="text-sm text-muted-foreground">
                  Verifique sua caixa de entrada e também o spam. O link abrirá a tela para cadastrar a nova senha.
                </p>
              )}

              <Button variant="ghost" className="w-full" asChild>
                <Link to="/login">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

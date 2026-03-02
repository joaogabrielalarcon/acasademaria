import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import logoMfm from "@/assets/logo-mfm-raiz.png";

const REMEMBER_KEY = "mfm_remember_user";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Check existing session — if remembered user has active session, redirect
  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && remembered) {
        // User has active session and chose to be remembered
        navigate("/", { replace: true });
      }
      setCheckingSession(false);
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha usuário e senha.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("login-by-username", {
        body: { username, password },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Erro ao fazer login");
      }

      // Definir a sessão manualmente
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // Save or clear remember preference
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, username);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível fazer login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="flex flex-col items-center w-full">
        {/* Logo grande */}
        <div className="flex flex-col items-center mb-8">
          <img src={logoMfm} alt="MFM Paisagismo" className="w-[585px] max-w-[90vw] h-auto object-contain self-end" />
          <p className="font-semibold text-foreground mt-2 tracking-wide whitespace-nowrap text-[clamp(8px,2.5vw,14px)]">Maria Fernanda Marques — Paisagismo e Soluções Ambientais</p>
        </div>

        {/* Formulário compacto */}
        <form onSubmit={handleSubmit} className="card-botanical p-3.5 space-y-2 w-full max-w-[240px]">
          <div className="space-y-1">
            <Label htmlFor="username" className="text-[10px]">Usuário</Label>
            <Input
              id="username"
              type="text"
              placeholder="Seu nome de usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
              className="h-7 text-[11px]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password" className="text-[10px]">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
              className="h-7 text-[11px]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="h-3.5 w-3.5"
            />
            <Label htmlFor="remember" className="text-[10px] font-normal cursor-pointer">
              Lembrar meu usuário
            </Label>
          </div>

          <Button 
            type="submit" 
            className="w-full h-7 text-[11px]" 
            variant="terracota"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <p className="text-center text-[10px] text-muted-foreground mt-3">
          Não tem acesso? Entre em contato com a administração.
        </p>
      </div>
    </div>
  );
}

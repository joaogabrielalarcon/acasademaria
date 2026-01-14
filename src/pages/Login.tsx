import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Leaf, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha email e senha.",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && !nome) {
      toast({
        title: "Campo obrigatório",
        description: "Informe seu nome.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        toast({
          title: "Bem-vindo!",
          description: "Login realizado com sucesso.",
        });
        navigate("/");
      } else {
        const { error } = await signUp(email, password, nome);
        if (error) throw error;
        
        toast({
          title: "Conta criada!",
          description: "Sua conta foi criada. Você já pode usar o sistema.",
        });
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível completar a operação.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo e título */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo variant="compact" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isLogin ? "Entrar no Sistema" : "Criar Conta"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isLogin 
              ? "Acesse sua conta para continuar" 
              : "Preencha os dados para criar sua conta"}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="card-botanical p-6 space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Seu nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            variant="terracota"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isLogin ? "Entrando..." : "Criando conta..."}
              </>
            ) : (
              isLogin ? "Entrar" : "Criar Conta"
            )}
          </Button>
        </form>

        {/* Alternar entre login e cadastro */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin 
              ? "Não tem conta? Criar conta" 
              : "Já tem conta? Fazer login"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

interface Colaborador {
  id: string;
  nome: string;
  user_id: string | null;
}

const BootstrapAdmin = () => {
  const navigate = useNavigate();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [selectedColaborador, setSelectedColaborador] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSystem, setIsCheckingSystem] = useState(true);
  const [hasExistingUsers, setHasExistingUsers] = useState(false);

  useEffect(() => {
    checkSystemAndLoadColaboradores();
  }, []);

  const checkSystemAndLoadColaboradores = async () => {
    try {
      // Verificar se já existe sessão (significa que já tem usuários)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setHasExistingUsers(true);
        setIsCheckingSystem(false);
        return;
      }

      // Carregar colaboradores sem user_id
      const { data: colabs, error } = await supabase
        .from("colaboradores")
        .select("id, nome, user_id")
        .is("user_id", null)
        .eq("ativo", true)
        .order("nome");

      if (error) {
        console.error("Erro ao carregar colaboradores:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os colaboradores.",
        });
      } else {
        setColaboradores(colabs || []);
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setIsCheckingSystem(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedColaborador) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um colaborador.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "As senhas não coincidem.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin", {
        body: {
          email,
          password,
          username: username.toLowerCase(),
          colaboradorId: selectedColaborador,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Sucesso!",
        description: "Administrador criado com sucesso. Você será redirecionado para o login.",
      });

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (error: any) {
      console.error("Erro ao criar admin:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível criar o administrador.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSystem) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasExistingUsers) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Logo className="mx-auto mb-4" />
            <CardTitle>Bootstrap não disponível</CardTitle>
            <CardDescription>
              Já existe pelo menos um usuário no sistema. 
              Use a página de login para acessar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate("/login")} 
              className="w-full"
              variant="terracota"
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Logo className="mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle>Configuração Inicial</CardTitle>
          </div>
          <CardDescription>
            Crie o primeiro administrador do sistema. 
            Este passo só pode ser feito uma vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="colaborador">Colaborador</Label>
              <Select value={selectedColaborador} onValueChange={setSelectedColaborador}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((colab) => (
                    <SelectItem key={colab.id} value={colab.id}>
                      {colab.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {colaboradores.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum colaborador disponível. Cadastre um colaborador primeiro.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Nome de Usuário</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemplo.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a senha"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              variant="terracota"
              disabled={isLoading || colaboradores.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Administrador"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BootstrapAdmin;

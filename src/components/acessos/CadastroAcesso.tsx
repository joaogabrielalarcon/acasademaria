import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/invoke-function";

/** Every existing role except admin (admin accounts are never created here). */
export const PAPEIS_CADASTRAVEIS = [
  { value: "administrativo", label: "Administrativo" },
  { value: "diretor", label: "Diretoria" },
  { value: "gestor", label: "Gestor" },
  { value: "gestao_campo", label: "Coordenação de campo" },
  { value: "responsavel_obra", label: "Responsável de obra" },
  { value: "operador_campo", label: "Operador de campo" },
  { value: "operador", label: "Operador" },
  { value: "arquitetura", label: "Arquitetura" },
] as const;

const SEM_VINCULO = "__nenhum__";
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

export interface SenhaGerada {
  nome: string;
  username: string | null;
  senha: string;
  expiraEm: string;
}

/** Shows the temporary password once. It lives only in memory and is dropped on close. */
export function SenhaProvisoriaDialog({ dados, onClose }: { dados: SenhaGerada | null; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    if (!dados) return;
    await navigator.clipboard.writeText(dados.senha);
    setCopiado(true);
  };
  const fechar = () => {
    setCopiado(false);
    onClose();
  };
  const expira = dados ? new Date(dados.expiraEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
  return (
    <Dialog open={!!dados} onOpenChange={(o) => !o && fechar()}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Senha provisória de {dados?.nome}</DialogTitle>
          <DialogDescription>
            Ela aparece só agora. Copie e repasse pelo canal que preferir. Vale até {expira} e será trocada no primeiro acesso.
          </DialogDescription>
        </DialogHeader>
        {dados && (
          <div className="space-y-3">
            {dados.username && (
              <p className="text-sm text-muted-foreground">
                Usuário: <span className="font-medium text-foreground">{dados.username}</span>
              </p>
            )}
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-base tracking-wider text-foreground select-all">
                {dados.senha}
              </code>
              <Button variant="outline" onClick={copiar} aria-label="Copiar senha">
                {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1">{copiado ? "Copiada" : "Copiar"}</span>
              </Button>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="terracota" onClick={fechar}>Já repassei, fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CadastroAcessoButton({ onSenha }: { onSenha: (d: SenhaGerada) => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [username, setUsername] = useState("");
  const [papel, setPapel] = useState<string>("operador_campo");
  const [colaboradorId, setColaboradorId] = useState<string>(SEM_VINCULO);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores-sem-conta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome")
        .is("user_id", null)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const userOk = USERNAME_RE.test(username);
  const podeSalvar = nome.trim().length >= 2 && userOk && !busy;

  const salvar = async () => {
    setBusy(true);
    const { data, error } = await invokeFunction<{ senha_provisoria: string; expira_em: string; username: string }>(
      "admin-usuarios",
      {
        acao: "criar",
        nome: nome.trim(),
        username,
        role: papel,
        colaborador_id: colaboradorId === SEM_VINCULO ? null : colaboradorId,
      },
    );
    setBusy(false);
    if (error || !data) {
      toast({ title: "Não foi possível cadastrar", description: error ?? undefined, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
    queryClient.invalidateQueries({ queryKey: ["colaboradores-sem-conta"] });
    toast({ title: "Conta criada", description: `${nome.trim()} já pode entrar com a senha provisória.` });
    onSenha({ nome: nome.trim(), username: data.username, senha: data.senha_provisoria, expiraEm: data.expira_em });
    setOpen(false);
    setNome("");
    setUsername("");
    setPapel("operador_campo");
    setColaboradorId(SEM_VINCULO);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="terracota" onClick={() => setOpen(true)}>
        <UserPlus className="w-4 h-4 mr-2" />
        Cadastrar pessoa
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar pessoa</DialogTitle>
          <DialogDescription>
            O sistema cria a conta e mostra uma senha provisória uma única vez.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cad-nome">Nome completo</Label>
            <Input id="cad-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Tânia Pereira" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cad-user">Nome de usuário</Label>
            <Input
              id="cad-user"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
              placeholder="tania.p"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {username && !userOk ? "Use de 3 a 30 caracteres: letras minúsculas, números, ponto ou hífen." : "Único, em minúsculas e sem espaço."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Papel</Label>
            <Select value={papel} onValueChange={setPapel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAPEIS_CADASTRAVEIS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Vínculo com colaborador (opcional)</Label>
            <Select value={colaboradorId} onValueChange={setColaboradorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_VINCULO}>Sem vínculo</SelectItem>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button variant="terracota" onClick={salvar} disabled={!podeSalvar}>
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Criar conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

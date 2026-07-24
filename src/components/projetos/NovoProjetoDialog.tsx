import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "@/hooks/use-toast";
import { useClientesSimples } from "@/hooks/useClientes";
import { useLocaisCliente } from "@/hooks/useLocaisCliente";
import { useColaboradoresAtivosBasico } from "@/hooks/useColaboradores";
import {
  TIPO_OPTIONS,
  TEMPERATURA_OPTIONS,
  useCriarProjeto,
  useCriarClienteRapido,
} from "@/hooks/useProjetosPipeline";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function NovoProjetoDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { data: clientes = [] } = useClientesSimples();
  const { data: colaboradores = [] } = useColaboradoresAtivosBasico();
  const criar = useCriarProjeto();
  const criarCliente = useCriarClienteRapido();

  const [clienteId, setClienteId] = useState<string>("");
  const [clientePopover, setClientePopover] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [novoClienteMode, setNovoClienteMode] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteTipo, setNovoClienteTipo] = useState<"fisica" | "juridica">("fisica");

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("implantacao");
  const [localId, setLocalId] = useState<string>("");
  const [temperatura, setTemperatura] = useState<string>("morno");
  const [origem, setOrigem] = useState("");
  const [responsavelId, setResponsavelId] = useState<string>("");

  const { data: locais = [] } = useLocaisCliente(clienteId || undefined);

  const clienteAtual = useMemo(() => clientes.find((c) => c.id === clienteId), [clientes, clienteId]);

  const reset = () => {
    setClienteId(""); setTitulo(""); setTipo("implantacao"); setLocalId("");
    setTemperatura("morno"); setOrigem(""); setResponsavelId("");
    setNovoClienteMode(false); setNovoClienteNome(""); setBuscaCliente("");
  };

  const podeSalvar = clienteId && titulo.trim() && tipo;

  const handleSalvar = async () => {
    try {
      const projeto = await criar.mutateAsync({
        cliente_id: clienteId,
        titulo: titulo.trim(),
        tipo,
        local_id: localId || null,
        temperatura: temperatura || null,
        origem: origem.trim() || null,
        responsavel_id: responsavelId || null,
      });
      toast({ title: "Projeto criado", description: titulo });
      reset();
      onOpenChange(false);
      navigate(`/projetos/${projeto.id}/painel`);
    } catch (e: any) {
      toast({ title: "Erro ao criar", description: e?.message ?? "Tente novamente", variant: "destructive" });
    }
  };

  const handleCriarCliente = async () => {
    if (!novoClienteNome.trim()) return;
    try {
      const c = await criarCliente.mutateAsync({ nome: novoClienteNome.trim(), tipo_pessoa: novoClienteTipo });
      setClienteId(c.id);
      setNovoClienteMode(false);
      setClientePopover(false);
      toast({ title: "Cliente criado", description: c.nome });
    } catch (e: any) {
      toast({ title: "Erro ao criar cliente", description: e?.message ?? "", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">Novo projeto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cliente */}
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            {!novoClienteMode ? (
              <div className="flex gap-2">
                <Popover open={clientePopover} onOpenChange={setClientePopover}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal">
                      {clienteAtual?.nome ?? "Selecionar cliente…"}
                      <ChevronsUpDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cliente…" value={buscaCliente} onValueChange={setBuscaCliente} />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {clientes.map((c) => (
                            <CommandItem key={c.id} value={c.nome} onSelect={() => { setClienteId(c.id); setClientePopover(false); }}>
                              <Check className={cn("w-4 h-4 mr-2", clienteId === c.id ? "opacity-100" : "opacity-0")} />
                              {c.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="icon" onClick={() => setNovoClienteMode(true)} title="Criar cliente rápido">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
                <Input placeholder="Nome do cliente" value={novoClienteNome} onChange={(e) => setNovoClienteNome(e.target.value)} />
                <Select value={novoClienteTipo} onValueChange={(v) => setNovoClienteTipo(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisica">Pessoa física</SelectItem>
                    <SelectItem value="juridica">Pessoa jurídica</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => { setNovoClienteMode(false); setNovoClienteNome(""); }}>Cancelar</Button>
                  <Button size="sm" onClick={handleCriarCliente} disabled={!novoClienteNome.trim() || criarCliente.isPending}>Criar cliente</Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Título do projeto</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Jardim frontal — casa Alphaville" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Temperatura</Label>
              <Select value={temperatura} onValueChange={setTemperatura}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPERATURA_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Local (opcional)</Label>
              <Select value={localId || "none"} onValueChange={(v) => setLocalId(v === "none" ? "" : v)} disabled={!clienteId || !locais.length}>
                <SelectTrigger><SelectValue placeholder={!clienteId ? "Escolha o cliente" : locais.length ? "Selecionar…" : "Sem locais"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {locais.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.apelido ?? l.endereco ?? "Local"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select value={responsavelId || "none"} onValueChange={(v) => setResponsavelId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {colaboradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Origem (opcional)</Label>
            <Input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Ex.: indicação, site, Instagram" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={!podeSalvar || criar.isPending}>Criar e abrir painel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

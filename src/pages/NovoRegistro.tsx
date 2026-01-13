import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, Plus, Trash2, Package, Users, FileText, Bell } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { parseISO, isAfter, startOfDay, format } from "date-fns";

// Mock data
const mockClientes = [
  { id: "1", nome: "Família Silveira" },
  { id: "2", nome: "Residência Campos" },
  { id: "3", nome: "Edifício Aurora" },
];

const mockTrechos = [
  { id: "1", nome: "Jardim Frontal", clienteId: "1" },
  { id: "2", nome: "Piscina", clienteId: "1" },
  { id: "3", nome: "Horta", clienteId: "2" },
];

const mockColaboradores = [
  { id: "1", nome: "João Silva" },
  { id: "2", nome: "Maria Santos" },
  { id: "3", nome: "Pedro Oliveira" },
  { id: "4", nome: "Maria Fernanda" },
];

const mockPropostas = [
  { id: "1", codigo: "2024-015", titulo: "Manutenção Anual", status: "aprovada", clienteId: "1" },
  { id: "2", codigo: "2024-012", titulo: "Implantação Jardim Lateral", status: "aprovada", clienteId: "1" },
  { id: "3", codigo: "2024-008", titulo: "Reforma Piscina", status: "enviada", clienteId: "1" },
];

const mockInsumos = [
  { id: "1", nome: "Adubo NPK 10-10-10", categoria: "adubo", unidade: "kg" },
  { id: "2", nome: "Terra vegetal", categoria: "substrato", unidade: "sacos" },
  { id: "3", nome: "Calcário dolomítico", categoria: "adubo", unidade: "kg" },
  { id: "4", nome: "Casca de pinus", categoria: "substrato", unidade: "sacos" },
  { id: "5", nome: "Muda de Ipe", categoria: "planta", unidade: "un" },
  { id: "6", nome: "Palmeira Imperial", categoria: "planta", unidade: "un" },
  { id: "7", nome: "Forração Amendoim", categoria: "planta", unidade: "mudas" },
  { id: "8", nome: "Roçadeira", categoria: "ferramenta", unidade: "un" },
  { id: "9", nome: "Soprador", categoria: "maquina", unidade: "un" },
];

// Mock de possíveis solicitantes (proprietários + funcionários da casa)
const mockSolicitantes = [
  { id: "prop-1", nome: "Roberto Silveira", tipo: "proprietario" },
  { id: "prop-2", nome: "Ana Silveira", tipo: "proprietario" },
  { id: "func-1", nome: "José Carlos (Caseiro)", tipo: "funcionario" },
  { id: "func-2", nome: "Maria (Governanta)", tipo: "funcionario" },
];

const tipoOptions = [
  { value: "manutencao", label: "Manutenção" },
  { value: "implantacao", label: "Implantação" },
  { value: "entrega", label: "Entrega" },
  { value: "visita_tecnica", label: "Visita Técnica" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Outro" },
];

const areaOptions = [
  { value: "campo", label: "Campo" },
  { value: "administrativo", label: "Administrativo" },
  { value: "projetos", label: "Projetos" },
  { value: "direcao", label: "Direção" },
];

const alertaOptions = [
  { value: "nenhum", label: "Sem lembrete" },
  { value: "no_dia", label: "No dia" },
  { value: "1_dia", label: "1 dia antes" },
  { value: "3_dias", label: "3 dias antes" },
  { value: "1_semana", label: "1 semana antes" },
];

interface InsumoSelecionado {
  insumoId: string;
  nome: string;
  quantidade: number;
  unidade: string;
}

export default function NovoRegistro() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const clienteIdFromUrl = searchParams.get("cliente") || "";
  const dataFromUrl = searchParams.get("data") || new Date().toISOString().split('T')[0];
  
  const [selectedCliente, setSelectedCliente] = useState(clienteIdFromUrl);
  const [selectedProposta, setSelectedProposta] = useState("");
  const [equipePresente, setEquipePresente] = useState<string[]>([]);
  const [executores, setExecutores] = useState<string[]>([]);
  const [solicitante, setSolicitante] = useState("");
  const [solicitanteOutro, setSolicitanteOutro] = useState("");
  const [insumosSelecionados, setInsumosSelecionados] = useState<InsumoSelecionado[]>([]);
  const [novoInsumoId, setNovoInsumoId] = useState("");
  const [novoInsumoQtd, setNovoInsumoQtd] = useState("");
  const [dataServico, setDataServico] = useState(dataFromUrl);
  const [statusRegistro, setStatusRegistro] = useState<string>("realizado");
  const [alertaOpcao, setAlertaOpcao] = useState("nenhum");

  // Atualizar status baseado na data selecionada
  useEffect(() => {
    const today = startOfDay(new Date());
    const selectedDate = parseISO(dataServico);
    if (isAfter(selectedDate, today)) {
      setStatusRegistro("agendado");
    } else {
      setStatusRegistro("realizado");
    }
  }, [dataServico]);

  const filteredTrechos = mockTrechos.filter(t => t.clienteId === selectedCliente);
  const filteredPropostas = mockPropostas.filter(
    p => p.clienteId === selectedCliente && p.status === "aprovada"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Registro salvo!",
      description: "O registro foi adicionado com sucesso.",
    });
    
    if (clienteIdFromUrl) {
      navigate(`/clientes/${clienteIdFromUrl}`);
    } else {
      navigate("/");
    }
  };

  const toggleEquipePresente = (id: string) => {
    setEquipePresente(prev => {
      if (prev.includes(id)) {
        // Se remover da equipe presente, também remover dos executores
        setExecutores(exec => exec.filter(e => e !== id));
        return prev.filter(r => r !== id);
      }
      return [...prev, id];
    });
  };

  const toggleExecutor = (id: string) => {
    // Só pode ser executor se estiver na equipe presente
    if (!equipePresente.includes(id)) return;
    
    setExecutores(prev => 
      prev.includes(id) 
        ? prev.filter(r => r !== id)
        : [...prev, id]
    );
  };

  const addInsumo = () => {
    if (!novoInsumoId || !novoInsumoQtd) return;
    
    const insumo = mockInsumos.find(i => i.id === novoInsumoId);
    if (!insumo) return;
    
    if (insumosSelecionados.some(i => i.insumoId === novoInsumoId)) {
      toast({
        title: "Insumo já adicionado",
        description: "Este insumo já está na lista.",
        variant: "destructive",
      });
      return;
    }
    
    setInsumosSelecionados([
      ...insumosSelecionados,
      {
        insumoId: insumo.id,
        nome: insumo.nome,
        quantidade: parseFloat(novoInsumoQtd),
        unidade: insumo.unidade,
      }
    ]);
    
    setNovoInsumoId("");
    setNovoInsumoQtd("");
  };

  const removeInsumo = (insumoId: string) => {
    setInsumosSelecionados(insumosSelecionados.filter(i => i.insumoId !== insumoId));
  };

  const clienteNome = mockClientes.find(c => c.id === selectedCliente)?.nome;

  return (
    <AppLayout>
      {/* Back Button */}
      <Link 
        to={clienteIdFromUrl ? `/clientes/${clienteIdFromUrl}` : "/"} 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar {clienteIdFromUrl && clienteNome ? `para ${clienteNome}` : "para Clientes"}</span>
      </Link>

      <div className="max-w-2xl">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
          Novo Registro
        </h1>
        <p className="text-muted-foreground mb-8">
          Documente um serviço realizado no jardim
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seção 1: Localização */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground">
              Localização
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trecho">Trecho</Label>
                <Select disabled={!selectedCliente}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCliente ? "Selecione o trecho" : "Selecione um cliente primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTrechos.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                    <SelectItem value="novo">+ Criar novo trecho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Seção 2: Quando */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground">
              Quando
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data">Data do Serviço *</Label>
                <Input 
                  type="date" 
                  id="data" 
                  value={dataServico}
                  onChange={(e) => setDataServico(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora">Hora</Label>
                <Input type="time" id="hora" />
              </div>
            </div>
            
            {/* Status do Registro */}
            <div className="space-y-2">
              <Label>Status</Label>
              <RadioGroup 
                value={statusRegistro} 
                onValueChange={setStatusRegistro}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="realizado" id="status-realizado" />
                  <Label htmlFor="status-realizado" className="font-normal cursor-pointer flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                    Realizado
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="agendado" id="status-agendado" />
                  <Label htmlFor="status-agendado" className="font-normal cursor-pointer flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    Agendado
                  </Label>
                </div>
              </RadioGroup>
              {statusRegistro === "agendado" && (
                <p className="text-xs text-muted-foreground">
                  Este serviço será exibido como pendente no calendário até ser marcado como realizado.
                </p>
              )}
            </div>

            {/* Lembrete (apenas para agendados) */}
            {statusRegistro === "agendado" && (
              <div className="space-y-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <Label className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  Lembrete
                </Label>
                <Select value={alertaOpcao} onValueChange={setAlertaOpcao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Quando lembrar?" />
                  </SelectTrigger>
                  <SelectContent>
                    {alertaOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Você receberá uma notificação para lembrar deste serviço.
                </p>
              </div>
            )}
          </section>

          {/* Seção 3: Classificação e Proposta */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Classificação
            </h2>

            {/* Proposta Vinculada */}
            <div className="space-y-2">
              <Label htmlFor="proposta">Proposta Vinculada</Label>
              <Select 
                value={selectedProposta} 
                onValueChange={setSelectedProposta}
                disabled={!selectedCliente}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedCliente 
                      ? "Selecione um cliente primeiro" 
                      : filteredPropostas.length === 0 
                        ? "Nenhuma proposta aprovada" 
                        : "Selecione uma proposta (opcional)"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Nenhuma proposta vinculada</SelectItem>
                  {filteredPropostas.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.codigo} / {p.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCliente && filteredPropostas.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Este cliente não possui propostas aprovadas.{" "}
                  <Link to={`/propostas/nova?cliente=${selectedCliente}`} className="text-primary hover:underline">
                    Criar proposta
                  </Link>
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Serviço *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipoOptions.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Área Funcional</Label>
              <RadioGroup defaultValue="campo" className="flex flex-wrap gap-4">
                {areaOptions.map(a => (
                  <div key={a.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={a.value} id={a.value} />
                    <Label htmlFor={a.value} className="font-normal cursor-pointer">
                      {a.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </section>

          {/* Seção 4: Equipe do Dia */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" />
              Equipe
            </h2>
            
            {/* Equipe Presente */}
            <div className="space-y-2">
              <Label>Quem esteve presente na casa?</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione todos que foram ao local no dia
              </p>
              <div className="flex flex-wrap gap-2">
                {mockColaboradores.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleEquipePresente(c.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      equipePresente.includes(c.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
            </div>

            {/* Executores do Serviço */}
            {equipePresente.length > 0 && (
              <div className="space-y-2">
                <Label>Quem executou este serviço específico?</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione quem realizou a atividade registrada
                </p>
                <div className="flex flex-wrap gap-2">
                  {mockColaboradores
                    .filter(c => equipePresente.includes(c.id))
                    .map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleExecutor(c.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          executores.includes(c.id)
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {c.nome}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Solicitante */}
            <div className="space-y-2">
              <Label>Quem solicitou este serviço?</Label>
              <Select value={solicitante} onValueChange={setSolicitante}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o solicitante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Serviço de rotina (sem solicitação)</SelectItem>
                  {mockSolicitantes.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                      {s.tipo === "proprietario" && " (Proprietário)"}
                    </SelectItem>
                  ))}
                  <SelectItem value="outro">Outro (especificar)</SelectItem>
                </SelectContent>
              </Select>
              {solicitante === "outro" && (
                <Input
                  placeholder="Nome do solicitante..."
                  value={solicitanteOutro}
                  onChange={(e) => setSolicitanteOutro(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          </section>

          {/* Seção 5: Insumos */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground flex items-center gap-2">
              <Package className="w-5 h-5" />
              Insumos Utilizados
            </h2>
            
            {/* Adicionar Insumo */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={novoInsumoId} onValueChange={setNovoInsumoId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Buscar insumo..." />
                </SelectTrigger>
                <SelectContent>
                  {mockInsumos.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nome} ({i.unidade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input 
                type="number" 
                placeholder="Qtd" 
                className="w-24"
                value={novoInsumoQtd}
                onChange={(e) => setNovoInsumoQtd(e.target.value)}
                min="0"
                step="0.01"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={addInsumo}
                disabled={!novoInsumoId || !novoInsumoQtd}
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>

            {/* Lista de Insumos Selecionados */}
            {insumosSelecionados.length > 0 ? (
              <div className="space-y-2">
                {insumosSelecionados.map((insumo) => (
                  <div 
                    key={insumo.insumoId} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm text-foreground">
                      {insumo.nome}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-primary">
                        {insumo.quantidade} {insumo.unidade}
                      </span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon-sm"
                        onClick={() => removeInsumo(insumo.insumoId)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum insumo adicionado</p>
            )}

            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
              <Plus className="w-4 h-4" />
              Cadastrar novo insumo
            </Button>
          </section>

          {/* Seção 6: Detalhes */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground">
              Detalhes
            </h2>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea 
                id="descricao" 
                placeholder="Descreva o que foi feito..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações Internas</Label>
              <Textarea 
                id="observacoes" 
                placeholder="Notas internas, não visíveis ao cliente..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="humor">Humor do Jardim</Label>
              <Input 
                id="humor" 
                placeholder="Ex: floração intensa, solo úmido..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input 
                id="tags" 
                placeholder="poda, irrigação, plantio..."
              />
            </div>
          </section>

          {/* Seção 7: Mídia */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground">
              Mídia
            </h2>
            
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                Arraste fotos ou vídeos aqui
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WEBP, MP4, MOV (máx. 10MB cada)
              </p>
              <Button variant="outline" size="sm" className="mt-4">
                Selecionar Arquivos
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Dica: marque as fotos como "Antes" ou "Depois" para facilitar a comparação
            </p>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-primary/20">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" variant="terracota" className="flex-1 sm:flex-none">
              Salvar Registro
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

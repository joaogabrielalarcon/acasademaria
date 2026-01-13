import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, GripVertical } from "lucide-react";
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

export default function NovoRegistro() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedResponsaveis, setSelectedResponsaveis] = useState<string[]>([]);

  const filteredTrechos = mockTrechos.filter(t => t.clienteId === selectedCliente);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Registro salvo!",
      description: "O registro foi adicionado com sucesso.",
    });
    navigate("/");
  };

  const toggleResponsavel = (id: string) => {
    setSelectedResponsaveis(prev => 
      prev.includes(id) 
        ? prev.filter(r => r !== id)
        : [...prev, id]
    );
  };

  return (
    <AppLayout>
      {/* Back Button */}
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para Timeline</span>
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
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora">Hora</Label>
                <Input type="time" id="hora" />
              </div>
            </div>
          </section>

          {/* Seção 3: Classificação */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground">
              Classificação
            </h2>
            
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

            <div className="space-y-2">
              <Label>Responsáveis</Label>
              <div className="flex flex-wrap gap-2">
                {mockColaboradores.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleResponsavel(c.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedResponsaveis.includes(c.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Seção 4: Detalhes */}
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

          {/* Seção 5: Mídia */}
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

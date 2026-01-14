import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Star } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { formatCPFCNPJ, formatCEP, formatPhone, formatIE, capitalizeWords } from "@/hooks/useInputMasks";

interface Proprietario {
  nome: string;
  telefone: string;
  email: string;
  pontoContato: boolean;
}

interface FuncionarioCasa {
  nome: string;
  funcao: string;
  telefone: string;
  pontoContato: boolean;
}

interface Assessor {
  nome: string;
  empresa: string;
  telefone: string;
  pontoContato: boolean;
}

interface DataImportante {
  data: string;
  descricao: string;
}

export default function NovoCliente() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [proprietarios, setProprietarios] = useState<Proprietario[]>([
    { nome: "", telefone: "", email: "", pontoContato: false }
  ]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioCasa[]>([]);
  const [assessores, setAssessores] = useState<Assessor[]>([]);
  const [datasImportantes, setDatasImportantes] = useState<DataImportante[]>([]);

  // Estados para campos formatados
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [condominio, setCondominio] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [cep, setCep] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Cliente cadastrado!",
      description: "O cliente foi adicionado com sucesso.",
    });
    navigate("/");
  };

  // Proprietários
  const addProprietario = () => {
    setProprietarios([...proprietarios, { nome: "", telefone: "", email: "", pontoContato: false }]);
  };
  const removeProprietario = (index: number) => {
    setProprietarios(proprietarios.filter((_, i) => i !== index));
  };
  const updateProprietario = (index: number, field: keyof Proprietario, value: string | boolean) => {
    const updated = [...proprietarios];
    (updated[index] as any)[field] = value;
    setProprietarios(updated);
  };

  // Funcionários
  const addFuncionario = () => {
    setFuncionarios([...funcionarios, { nome: "", funcao: "", telefone: "", pontoContato: false }]);
  };
  const removeFuncionario = (index: number) => {
    setFuncionarios(funcionarios.filter((_, i) => i !== index));
  };
  const updateFuncionario = (index: number, field: keyof FuncionarioCasa, value: string | boolean) => {
    const updated = [...funcionarios];
    (updated[index] as any)[field] = value;
    setFuncionarios(updated);
  };

  // Assessores
  const addAssessor = () => {
    setAssessores([...assessores, { nome: "", empresa: "", telefone: "", pontoContato: false }]);
  };
  const removeAssessor = (index: number) => {
    setAssessores(assessores.filter((_, i) => i !== index));
  };
  const updateAssessor = (index: number, field: keyof Assessor, value: string | boolean) => {
    const updated = [...assessores];
    (updated[index] as any)[field] = value;
    setAssessores(updated);
  };

  // Datas Importantes
  const addDataImportante = () => {
    setDatasImportantes([...datasImportantes, { data: "", descricao: "" }]);
  };
  const removeDataImportante = (index: number) => {
    setDatasImportantes(datasImportantes.filter((_, i) => i !== index));
  };
  const updateDataImportante = (index: number, field: keyof DataImportante, value: string) => {
    const updated = [...datasImportantes];
    updated[index][field] = value;
    setDatasImportantes(updated);
  };

  return (
    <AppLayout>
      {/* Back Button */}
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para Clientes</span>
      </Link>

      <div className="max-w-2xl">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
          Novo Cliente
        </h1>
        <p className="text-muted-foreground mb-8">
          Cadastre um novo cliente e seu jardim
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Seção 1: Identificação */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground">
              Identificação
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome">Nome da Propriedade *</Label>
                <Input 
                  id="nome" 
                  placeholder="Ex: Família Silveira, Residência Campos" 
                  required 
                  value={nome}
                  onChange={(e) => setNome(capitalizeWords(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue="ativo">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="prospecto">Prospecto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf_cnpj">CPF / CNPJ</Label>
                <Input 
                  id="cpf_cnpj" 
                  placeholder="000.000.000-00 ou 00.000.000/0000-00" 
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCPFCNPJ(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
                <Input 
                  id="inscricao_estadual" 
                  placeholder="000.000.000.000"
                  value={inscricaoEstadual}
                  onChange={(e) => setInscricaoEstadual(formatIE(e.target.value))}
                />
              </div>
            </div>
          </section>

          {/* Seção 2: Localização */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground">
              Localização
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input 
                  id="endereco" 
                  placeholder="Rua, número"
                  value={endereco}
                  onChange={(e) => setEndereco(capitalizeWords(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input 
                  id="bairro" 
                  placeholder="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(capitalizeWords(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input 
                  id="cidade" 
                  placeholder="Cidade"
                  value={cidade}
                  onChange={(e) => setCidade(capitalizeWords(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SP">São Paulo</SelectItem>
                    <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                    <SelectItem value="MG">Minas Gerais</SelectItem>
                    <SelectItem value="PR">Paraná</SelectItem>
                    <SelectItem value="SC">Santa Catarina</SelectItem>
                    <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input 
                  id="cep" 
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(formatCEP(e.target.value))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="condominio">Condomínio (opcional)</Label>
                <Input 
                  id="condominio" 
                  placeholder="Nome do condomínio"
                  value={condominio}
                  onChange={(e) => setCondominio(capitalizeWords(e.target.value))}
                />
              </div>
            </div>
          </section>

          {/* Seção 3: Proprietários */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-primary/20 pb-2">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Proprietários
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  <Star className="w-3 h-3 inline text-amber-500" /> = Ponto de contato
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={addProprietario}>
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
            {proprietarios.map((prop, index) => (
              <div key={index} className={`p-4 rounded-lg space-y-3 ${prop.pontoContato ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-muted/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon-sm"
                      onClick={() => updateProprietario(index, "pontoContato", !prop.pontoContato)}
                      title={prop.pontoContato ? "Remover como ponto de contato" : "Marcar como ponto de contato"}
                    >
                      <Star className={`w-4 h-4 ${prop.pontoContato ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                    </Button>
                    <span className="text-sm font-medium text-foreground">Proprietário {index + 1}</span>
                  </div>
                  {proprietarios.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon-sm"
                      onClick={() => removeProprietario(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input 
                    placeholder="Nome"
                    value={prop.nome}
                    onChange={(e) => updateProprietario(index, "nome", capitalizeWords(e.target.value))}
                  />
                  <Input 
                    placeholder="Telefone"
                    value={prop.telefone}
                    onChange={(e) => updateProprietario(index, "telefone", formatPhone(e.target.value))}
                  />
                  <Input 
                    placeholder="Email"
                    value={prop.email}
                    onChange={(e) => updateProprietario(index, "email", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </section>

          {/* Seção 4: Funcionários da Casa */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-primary/20 pb-2">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Funcionários da Casa
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  <Star className="w-3 h-3 inline text-amber-500" /> = Ponto de contato
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={addFuncionario}>
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
            {funcionarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum funcionário adicionado</p>
            ) : (
              funcionarios.map((func, index) => (
                <div key={index} className={`p-4 rounded-lg space-y-3 ${func.pontoContato ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-muted/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon-sm"
                        onClick={() => updateFuncionario(index, "pontoContato", !func.pontoContato)}
                        title={func.pontoContato ? "Remover como ponto de contato" : "Marcar como ponto de contato"}
                      >
                        <Star className={`w-4 h-4 ${func.pontoContato ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                      </Button>
                      <span className="text-sm font-medium text-foreground">Funcionário {index + 1}</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon-sm"
                      onClick={() => removeFuncionario(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input 
                      placeholder="Nome"
                      value={func.nome}
                      onChange={(e) => updateFuncionario(index, "nome", capitalizeWords(e.target.value))}
                    />
                    <Input 
                      placeholder="Função (caseiro, governanta...)"
                      value={func.funcao}
                      onChange={(e) => updateFuncionario(index, "funcao", capitalizeWords(e.target.value))}
                    />
                    <Input 
                      placeholder="Telefone"
                      value={func.telefone}
                      onChange={(e) => updateFuncionario(index, "telefone", formatPhone(e.target.value))}
                    />
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Seção 5: Assessores */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-primary/20 pb-2">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Assessores
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  <Star className="w-3 h-3 inline text-amber-500" /> = Ponto de contato
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={addAssessor}>
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
            {assessores.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum assessor adicionado</p>
            ) : (
              assessores.map((ass, index) => (
                <div key={index} className={`p-4 rounded-lg space-y-3 ${ass.pontoContato ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-muted/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon-sm"
                        onClick={() => updateAssessor(index, "pontoContato", !ass.pontoContato)}
                        title={ass.pontoContato ? "Remover como ponto de contato" : "Marcar como ponto de contato"}
                      >
                        <Star className={`w-4 h-4 ${ass.pontoContato ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                      </Button>
                      <span className="text-sm font-medium text-foreground">Assessor {index + 1}</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon-sm"
                      onClick={() => removeAssessor(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input 
                      placeholder="Nome"
                      value={ass.nome}
                      onChange={(e) => updateAssessor(index, "nome", capitalizeWords(e.target.value))}
                    />
                    <Input 
                      placeholder="Empresa / Função"
                      value={ass.empresa}
                      onChange={(e) => updateAssessor(index, "empresa", capitalizeWords(e.target.value))}
                    />
                    <Input 
                      placeholder="Telefone"
                      value={ass.telefone}
                      onChange={(e) => updateAssessor(index, "telefone", formatPhone(e.target.value))}
                    />
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Seção 7: Datas Importantes */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-primary/20 pb-2">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Datas Importantes
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={addDataImportante}>
                <Plus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>
            {datasImportantes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma data importante adicionada</p>
            ) : (
              datasImportantes.map((data, index) => (
                <div key={index} className="p-4 rounded-lg bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Data {index + 1}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon-sm"
                      onClick={() => removeDataImportante(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input 
                      type="date"
                      value={data.data}
                      onChange={(e) => updateDataImportante(index, "data", e.target.value)}
                    />
                    <Input 
                      placeholder="Descrição (aniversário, viagem...)"
                      value={data.descricao}
                      onChange={(e) => updateDataImportante(index, "descricao", e.target.value)}
                    />
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Seção 8: Observações */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground">
              Observações
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="particularidades">Particularidades</Label>
                <Textarea 
                  id="particularidades" 
                  placeholder="Ex: Cachorros soltos, portão automático, horário de acesso..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Notas Gerais</Label>
                <Textarea 
                  id="notas" 
                  placeholder="Observações sobre o cliente, preferências..."
                  rows={3}
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-primary/20">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" variant="terracota">
              Salvar Cliente
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
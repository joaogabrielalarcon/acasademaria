import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Loader2, Save } from "lucide-react";
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
import { formatCPFCNPJ, formatPhone, capitalizeWords } from "@/hooks/useInputMasks";
import { supabase } from "@/integrations/supabase/client";
import { useCliente } from "@/hooks/useCliente";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import { DraftResumeBanner } from "@/components/DraftResumeBanner";

interface DataImportante {
  data: string;
  descricao: string;
}

export default function NovoCliente() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("ativo");

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [datasImportantes, setDatasImportantes] = useState<DataImportante[]>([]);
  const [notas, setNotas] = useState("");

  const draft = useAutosaveDraft({
    formKey: "novo-cliente",
    scopeKey: "novo",
    enabled: !isEditing,
    getSnapshot: () => ({ nome, status, telefone, email, cpfCnpj, datasImportantes, notas }),
    applySnapshot: (s: any) => {
      if (!s) return;
      if (typeof s.nome === "string") setNome(s.nome);
      if (typeof s.status === "string") setStatus(s.status);
      if (typeof s.telefone === "string") setTelefone(s.telefone);
      if (typeof s.email === "string") setEmail(s.email);
      if (typeof s.cpfCnpj === "string") setCpfCnpj(s.cpfCnpj);
      if (Array.isArray(s.datasImportantes)) setDatasImportantes(s.datasImportantes);
      if (typeof s.notas === "string") setNotas(s.notas);
    },
  });

  const { data: clienteExistente, isLoading: loadingCliente } = useCliente(id);

  useEffect(() => {
    if (clienteExistente && isEditing) {
      setNome(clienteExistente.nome || "");
      setStatus(clienteExistente.status || "ativo");
      setTelefone(clienteExistente.telefone || "");
      setEmail(clienteExistente.email || "");
      setCpfCnpj(clienteExistente.cpf_cnpj || "");
      setNotas(clienteExistente.notas || "");

      if (clienteExistente.datas_importantes && clienteExistente.datas_importantes.length > 0) {
        setDatasImportantes(
          clienteExistente.datas_importantes.map((d: any) => ({
            data: d.data || "",
            descricao: d.descricao || "",
          }))
        );
      }
    }
  }, [clienteExistente, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do proprietário é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const filteredDatas = datasImportantes.filter((d) => d.data || d.descricao);

    const clienteData = {
      nome: nome.trim(),
      status,
      telefone: telefone || null,
      email: email || null,
      cpf_cnpj: cpfCnpj || null,
      datas_importantes: JSON.parse(JSON.stringify(filteredDatas)),
      notas: notas || null,
    };

    try {
      if (isEditing && id) {
        const { error } = await supabase.from("clientes").update(clienteData).eq("id", id);
        if (error) throw error;
        toast({ title: "Cliente atualizado!" });
        navigate(`/clientes/${id}`);
      } else {
        const { error } = await supabase.from("clientes").insert(clienteData);
        if (error) throw error;
        await draft.clearDraft();
        toast({ title: "Cliente cadastrado!" });
        navigate("/clientes");
      }
    } catch (error: any) {
      toast({
        title: isEditing ? "Erro ao atualizar" : "Erro ao cadastrar",
        description: error.message || "Não foi possível salvar o cliente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isEditing && loadingCliente) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Link
        to={isEditing ? `/clientes/${id}` : "/clientes"}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{isEditing ? "Voltar para o Cliente" : "Voltar para Clientes"}</span>
      </Link>

      <div className="max-w-2xl">
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
          {isEditing ? "Editar Cliente" : "Novo Cliente"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isEditing
            ? "Atualize os dados do cliente"
            : "Cadastre o proprietário. Locais e projetos serão vinculados depois."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Identificação */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground">
              Identificação
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome">Nome do Proprietário *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: João da Silva"
                  required
                  value={nome}
                  onChange={(e) => setNome(capitalizeWords(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">WhatsApp / Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
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
                <Label htmlFor="cpf_cnpj">CNPJ / Dados Fiscais</Label>
                <Input
                  id="cpf_cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCPFCNPJ(e.target.value))}
                />
              </div>
            </div>
          </section>

          {/* Datas Importantes */}
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
            <p className="text-xs text-muted-foreground">
              Ex: "Aniversário: 15/03", "Casamento: 20/06"
            </p>
            {datasImportantes.map((item, index) => (
              <div key={index} className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg">
                <div className="flex-1 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Data</Label>
                    <Input
                      type="date"
                      value={item.data}
                      onChange={(e) => updateDataImportante(index, "data", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descrição</Label>
                    <Input
                      value={item.descricao}
                      onChange={(e) => updateDataImportante(index, "descricao", e.target.value)}
                      placeholder="Ex: Aniversário"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 mt-5"
                  onClick={() => removeDataImportante(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </section>

          {/* Observações */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold border-b border-primary/20 pb-2 text-foreground">
              Observações
            </h2>
            <div className="space-y-2">
              <Textarea
                placeholder="Anotações gerais sobre o cliente..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={4}
              />
            </div>
          </section>

          <Button type="submit" variant="terracota" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? "Salvar Alterações" : "Cadastrar Cliente"}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}

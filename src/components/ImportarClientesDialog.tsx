import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportarClientesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClienteRow {
  nome: string;
  status: string;
  telefone?: string;
  email?: string;
  cpf_cnpj?: string;
  inscricao_estadual?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  condominio?: string;
  particularidades?: string;
  notas?: string;
  proprietarios?: any[];
  funcionarios_casa?: any[];
  assessores?: any[];
  datas_importantes?: any[];
}

const HEADER_MAP: Record<string, string> = {
  "Nome *": "nome",
  "Status": "status",
  "Telefone": "telefone",
  "Email": "email",
  "CPF/CNPJ": "cpf_cnpj",
  "Inscrição Estadual": "inscricao_estadual",
  "Endereço": "endereco",
  "Bairro": "bairro",
  "Cidade": "cidade",
  "Estado": "estado",
  "CEP": "cep",
  "Condomínio": "condominio",
  "Particularidades": "particularidades",
  "Notas": "notas",
};

function parseRows(data: any[]): ClienteRow[] {
  return data
    .filter((row) => row["Nome *"]?.toString().trim())
    .map((row) => {
      const cliente: ClienteRow = {
        nome: row["Nome *"]?.toString().trim() || "",
        status: row["Status"]?.toString().trim() || "ativo",
      };

      for (const [header, field] of Object.entries(HEADER_MAP)) {
        if (field === "nome" || field === "status") continue;
        const val = row[header]?.toString().trim();
        if (val) (cliente as any)[field] = val;
      }

      // Proprietários
      const props: any[] = [];
      for (const i of [1, 2]) {
        const nome = row[`Prop ${i} - Nome`]?.toString().trim();
        if (nome) {
          props.push({
            nome,
            telefone: row[`Prop ${i} - Telefone`]?.toString().trim() || "",
            email: row[`Prop ${i} - Email`]?.toString().trim() || "",
          });
        }
      }
      if (props.length) cliente.proprietarios = props;

      // Funcionários
      const funcs: any[] = [];
      for (const i of [1, 2]) {
        const nome = row[`Func ${i} - Nome`]?.toString().trim();
        if (nome) {
          funcs.push({
            nome,
            funcao: row[`Func ${i} - Função`]?.toString().trim() || "",
            telefone: row[`Func ${i} - Telefone`]?.toString().trim() || "",
          });
        }
      }
      if (funcs.length) cliente.funcionarios_casa = funcs;

      // Assessores
      const assessores: any[] = [];
      for (const i of [1, 2]) {
        const nome = row[`Assessor ${i} - Nome`]?.toString().trim();
        if (nome) {
          assessores.push({
            nome,
            empresa: row[`Assessor ${i} - Empresa`]?.toString().trim() || "",
            telefone: row[`Assessor ${i} - Telefone`]?.toString().trim() || "",
          });
        }
      }
      if (assessores.length) cliente.assessores = assessores;

      // Datas importantes
      const datas: any[] = [];
      for (const i of [1, 2]) {
        const data = row[`Data Imp ${i} - Data`]?.toString().trim();
        if (data) {
          datas.push({
            data,
            descricao: row[`Data Imp ${i} - Descrição`]?.toString().trim() || "",
          });
        }
      }
      if (datas.length) cliente.datas_importantes = datas;

      return cliente;
    });
}

export function ImportarClientesDialog({ open, onOpenChange }: ImportarClientesDialogProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [parsed, setParsed] = useState<ClienteRow[]>([]);
  const [results, setResults] = useState<{ nome: string; ok: boolean; error?: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const reset = () => {
    setStep("upload");
    setParsed([]);
    setResults([]);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      const rows = parseRows(data);
      if (!rows.length) {
        toast.error("Nenhum cliente encontrado na planilha. Verifique se a coluna 'Nome *' está preenchida.");
        return;
      }
      setParsed(rows);
      setStep("preview");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    setStep("importing");
    const res: { nome: string; ok: boolean; error?: string }[] = [];

    for (const c of parsed) {
      const payload: any = {
        nome: c.nome,
        status: ["ativo", "inativo", "prospecto"].includes(c.status) ? c.status : "ativo",
      };
      if (c.telefone) payload.telefone = c.telefone;
      if (c.email) payload.email = c.email;
      if (c.cpf_cnpj) payload.cpf_cnpj = c.cpf_cnpj;
      if (c.inscricao_estadual) payload.inscricao_estadual = c.inscricao_estadual;
      if (c.endereco) payload.endereco = c.endereco;
      if (c.bairro) payload.bairro = c.bairro;
      if (c.cidade) payload.cidade = c.cidade;
      if (c.estado) payload.estado = c.estado;
      if (c.cep) payload.cep = c.cep;
      if (c.condominio) payload.condominio = c.condominio;
      if (c.particularidades) payload.particularidades = c.particularidades;
      if (c.notas) payload.notas = c.notas;
      if (c.proprietarios) payload.proprietarios = c.proprietarios;
      if (c.funcionarios_casa) payload.funcionarios_casa = c.funcionarios_casa;
      if (c.assessores) payload.assessores = c.assessores;
      if (c.datas_importantes) payload.datas_importantes = c.datas_importantes;

      const { error } = await supabase.from("clientes").insert(payload);
      res.push({ nome: c.nome, ok: !error, error: error?.message });
    }

    setResults(res);
    setStep("done");
    const successCount = res.filter((r) => r.ok).length;
    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ["clientes-com-locais"] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-simples"] });
    }
    toast.success(`${successCount} de ${res.length} clientes importados com sucesso!`);
  };

  const successCount = results.filter((r) => r.ok).length;
  const errorCount = results.filter((r) => !r.ok).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Clientes</DialogTitle>
          <DialogDescription>
            Importe clientes em massa a partir de uma planilha Excel (.xlsx)
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center space-y-4">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-primary/60" />
              <div>
                <p className="font-medium text-foreground">Selecione a planilha preenchida</p>
                <p className="text-sm text-muted-foreground mt-1">Formato aceito: .xlsx</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4" />
                Selecionar arquivo
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Download className="w-4 h-4" />
              <span>Ainda não tem o template?</span>
              <a
                href="/template_clientes.xlsx"
                download
                className="text-primary underline"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info("O template foi gerado e está disponível para download nos documentos do projeto.");
                }}
              >
                Baixar template
              </a>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {parsed.length} clientes encontrados
              </Badge>
            </div>
            <div className="border rounded-lg overflow-auto max-h-[40vh]">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">Nome</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Telefone</th>
                    <th className="text-left p-2 font-medium">Cidade</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((c, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 font-medium">{c.nome}</td>
                      <td className="p-2">{c.status}</td>
                      <td className="p-2">{c.telefone || "—"}</td>
                      <td className="p-2">{c.cidade || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={reset}>Cancelar</Button>
              <Button variant="terracota" onClick={handleImport}>
                Importar {parsed.length} clientes
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Importando clientes...</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {successCount > 0 && (
                <Badge className="bg-success/20 text-success border-success/30">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  {successCount} importados
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  {errorCount} erros
                </Badge>
              )}
            </div>
            {errorCount > 0 && (
              <div className="border rounded-lg overflow-auto max-h-[30vh]">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Cliente</th>
                      <th className="text-left p-2 font-medium">Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.filter((r) => !r.ok).map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{r.nome}</td>
                        <td className="p-2 text-destructive">{r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <DialogFooter>
              <Button variant="terracota" onClick={() => { reset(); onOpenChange(false); }}>
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

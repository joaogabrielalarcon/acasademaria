import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, XCircle, AlertTriangle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { normalizarPorteImportacao, parsePorteMetros } from "@/lib/porte";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlantaRow {
  _linha: number;
  nome_popular: string;
  nome_cientifico?: string;
  altura_min_m: number | null;
  altura_max_m: number | null;
  dap_cm?: number | null;
  unidade?: string;
  embalagem?: string;
  preco_unitario?: number | null;
}

interface PorteErro {
  linha: number;
  nome: string;
  altura_min_raw: string;
  altura_max_raw: string;
  motivo: string;
}

function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseRows(data: any[]): { rows: PlantaRow[]; erros: PorteErro[] } {
  const rows: PlantaRow[] = [];
  const erros: PorteErro[] = [];

  data.forEach((row, idx) => {
    const linha = idx + 2; // +1 cabeçalho, +1 base 1
    const nome = row["Nome Popular *"]?.toString().trim() || row["Nome Popular"]?.toString().trim();
    if (!nome) return;

    const minRaw = row["Altura Mínima (m)"] ?? row["Altura (m)"] ?? row["Altura"];
    const maxRaw = row["Altura Máxima (m)"] ?? row["Altura (m)"] ?? row["Altura"];

    const minStr = minRaw === undefined || minRaw === null ? "" : String(minRaw).trim();
    const maxStr = maxRaw === undefined || maxRaw === null ? "" : String(maxRaw).trim();

    let minM: number | null = null;
    let maxM: number | null = null;
    let erroMotivo: string | null = null;

    if (minStr !== "") {
      const r = parsePorteMetros(minStr);
      if (r.ok) minM = r.value;
      else {
        const norm = normalizarPorteImportacao(minStr);
        if (norm !== null) minM = norm;
        else erroMotivo = `Altura mínima inválida: "${minStr}". ${r.error ?? ""}`.trim();
      }
    }

    if (!erroMotivo && maxStr !== "" && maxStr !== minStr) {
      const r = parsePorteMetros(maxStr);
      if (r.ok) maxM = r.value;
      else {
        const norm = normalizarPorteImportacao(maxStr);
        if (norm !== null) maxM = norm;
        else erroMotivo = `Altura máxima inválida: "${maxStr}". ${r.error ?? ""}`.trim();
      }
    } else if (!erroMotivo && maxStr === minStr) {
      maxM = minM;
    }

    if (erroMotivo) {
      erros.push({
        linha,
        nome,
        altura_min_raw: minStr,
        altura_max_raw: maxStr,
        motivo: erroMotivo,
      });
      return;
    }

    rows.push({
      _linha: linha,
      nome_popular: nome,
      nome_cientifico: row["Nome Científico"]?.toString().trim() || undefined,
      altura_min_m: minM,
      altura_max_m: maxM ?? minM,
      dap_cm: num(row["DAP (cm)"]),
      unidade: row["Unidade"]?.toString().trim() || undefined,
      embalagem: row["Embalagem"]?.toString().trim() || undefined,
      preco_unitario: num(row["Preço (R$)"] ?? row["Preço"]),
    });
  });

  return { rows, erros };
}

function downloadErrosCsv(erros: PorteErro[]) {
  const header = ["Linha", "Nome Popular", "Altura Mínima (raw)", "Altura Máxima (raw)", "Motivo"];
  const lines = [header.join(",")];
  erros.forEach((e) => {
    const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
    lines.push([e.linha, esc(e.nome), esc(e.altura_min_raw), esc(e.altura_max_raw), esc(e.motivo)].join(","));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `plantas-portes-invalidos-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportarPlantasDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [parsed, setParsed] = useState<PlantaRow[]>([]);
  const [erros, setErros] = useState<PorteErro[]>([]);
  const [results, setResults] = useState<{ nome: string; ok: boolean; error?: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const reset = () => {
    setStep("upload");
    setParsed([]);
    setErros([]);
    setResults([]);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const { rows, erros: errosPorte } = parseRows(data as any[]);
        if (!rows.length && !errosPorte.length) {
          toast.error("Nenhuma planta válida encontrada. Verifique se a coluna 'Nome Popular *' está preenchida.");
          return;
        }
        setParsed(rows);
        setErros(errosPorte);
        setStep("preview");
      } catch (err: any) {
        toast.error("Erro ao ler planilha: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    setStep("importing");
    const res: { nome: string; ok: boolean; error?: string }[] = [];
    for (const p of parsed) {
      const payload: any = {
        nome_popular: p.nome_popular,
        nome_cientifico: p.nome_cientifico ?? null,
        altura_min_m: p.altura_min_m,
        altura_max_m: p.altura_max_m,
        altura_m: p.altura_min_m != null && p.altura_max_m != null
          ? (p.altura_min_m + p.altura_max_m) / 2
          : (p.altura_min_m ?? p.altura_max_m ?? 0),
        dap_cm: p.dap_cm ?? null,
        unidade: p.unidade ?? null,
        embalagem: p.embalagem ?? null,
        preco_unitario: p.preco_unitario ?? null,
        ativo: true,
      };
      const { error } = await supabase.from("plantas").insert(payload);
      res.push({ nome: p.nome_popular, ok: !error, error: error?.message });
    }
    setResults(res);
    setStep("done");
    const okCount = res.filter((r) => r.ok).length;
    if (okCount > 0) queryClient.invalidateQueries({ queryKey: ["plantas"] });
    toast.success(`${okCount} de ${res.length} plantas importadas.`);
  };

  const successCount = results.filter((r) => r.ok).length;
  const errorCount = results.filter((r) => !r.ok).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Plantas</DialogTitle>
          <DialogDescription>
            Importe plantas em massa a partir de uma planilha Excel (.xlsx). O porte deve estar em metros (ex: 0,40 — 1,20 — 5,00).
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center space-y-4">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-primary/60" />
              <div>
                <p className="font-medium">Selecione a planilha preenchida</p>
                <p className="text-sm text-muted-foreground mt-1">Formato aceito: .xlsx</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4" /> Selecionar arquivo
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Colunas esperadas: <code>Nome Popular *</code>, <code>Nome Científico</code>, <code>Altura Mínima (m)</code>, <code>Altura Máxima (m)</code>, <code>DAP (cm)</code>, <code>Unidade</code>, <code>Embalagem</code>, <code>Preço (R$)</code>.
            </p>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {parsed.length} prontas para importar
              </Badge>
              {erros.length > 0 && (
                <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> {erros.length} com porte inválido
                </Badge>
              )}
            </div>

            {erros.length > 0 && (
              <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-amber-800">
                  Linhas com porte inválido — não serão importadas
                </p>
                <p className="text-xs text-muted-foreground">
                  O porte precisa estar em metros com vírgula (ex: 0,40 — 1,20 — 5,00). Formatos antigos como "P14", "Pt 24", "DAP 10/5 m" precisam ser corrigidos manualmente.
                </p>
                <div className="border rounded overflow-auto max-h-[25vh] bg-background">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">Linha</th>
                        <th className="text-left p-2">Nome</th>
                        <th className="text-left p-2">Altura (raw)</th>
                        <th className="text-left p-2">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {erros.map((e, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{e.linha}</td>
                          <td className="p-2">{e.nome}</td>
                          <td className="p-2 text-muted-foreground">{e.altura_min_raw} / {e.altura_max_raw}</td>
                          <td className="p-2 text-amber-800">{e.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button size="sm" variant="outline" onClick={() => downloadErrosCsv(erros)} className="gap-2">
                  <Download className="w-3.5 h-3.5" /> Baixar CSV das linhas com erro
                </Button>
              </div>
            )}

            {parsed.length > 0 && (
              <div className="border rounded-lg overflow-auto max-h-[35vh]">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Nome Popular</th>
                      <th className="text-left p-2">Altura</th>
                      <th className="text-left p-2">Unidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 text-muted-foreground">{p._linha}</td>
                        <td className="p-2 font-medium">{p.nome_popular}</td>
                        <td className="p-2">
                          {p.altura_min_m != null && p.altura_max_m != null && p.altura_min_m !== p.altura_max_m
                            ? `${p.altura_min_m.toFixed(2).replace(".", ",")} – ${p.altura_max_m.toFixed(2).replace(".", ",")} m`
                            : p.altura_min_m != null
                              ? `${p.altura_min_m.toFixed(2).replace(".", ",")} m`
                              : "—"}
                        </td>
                        <td className="p-2">{p.unidade || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={reset}>Cancelar</Button>
              <Button variant="terracota" onClick={handleImport} disabled={parsed.length === 0}>
                Importar {parsed.length} plantas
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Importando plantas...</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {successCount > 0 && (
                <Badge className="bg-success/20 text-success border-success/30">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> {successCount} importadas
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                  <XCircle className="w-3.5 h-3.5 mr-1" /> {errorCount} erros
                </Badge>
              )}
              {erros.length > 0 && (
                <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> {erros.length} ignoradas (porte inválido)
                </Badge>
              )}
            </div>
            {erros.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => downloadErrosCsv(erros)} className="gap-2">
                <Download className="w-3.5 h-3.5" /> Baixar CSV das linhas com porte inválido
              </Button>
            )}
            {errorCount > 0 && (
              <div className="border rounded-lg overflow-auto max-h-[30vh]">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Planta</th>
                      <th className="text-left p-2">Erro</th>
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
              <Button variant="terracota" onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

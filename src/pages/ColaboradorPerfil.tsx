import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useIsManager, useProfile } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Pencil, Camera, Loader2, Check, X, MessageCircle, ChevronDown,
  FileText, Upload, Paperclip, Car, Bike, ChevronRight, AlertCircle, RotateCw,
  ImageIcon, MessageSquare, Plus,
} from "lucide-react";
import { formatCPF, formatPhone, formatCEP } from "@/hooks/useInputMasks";
import { format, differenceInYears, differenceInMonths, formatDistanceToNow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const FOTO_BUCKET = "colaboradores-fotos";
const DOC_BUCKET = "colaboradores-documentos";

type Colab = any;
type Doc = {
  id: string; colaborador_id: string; nome_arquivo: string;
  tipo_documento: string; categoria: string | null; url: string;
  created_at: string; descricao: string | null;
};

const CATEGORIAS: { key: string; label: string }[] = [
  { key: "registro", label: "Registro" },
  { key: "cnh", label: "CNH" },
  { key: "atestado", label: "Atestados" },
  { key: "declaracao", label: "Declarações" },
  { key: "exame", label: "Exames" },
  { key: "liberacao", label: "Liberações" },
  { key: "outro", label: "Outros" },
];

// ---------- signed url helper ----------
function useSignedUrl(bucket: string, path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed", bucket, path],
    queryFn: async () => {
      if (!path) return null;
      const p = path.startsWith("http") ? path.split(`/${bucket}/`)[1] ?? path : path;
      const { data } = await supabase.storage.from(bucket).createSignedUrl(p, 60 * 30);
      return data?.signedUrl ?? null;
    },
    enabled: !!path,
    staleTime: 1000 * 60 * 20,
  });
}

// ---------- Nota da Coordenação ----------
function NotaCoordenacao({ colab, canEdit, onSaved }: { colab: Colab; canEdit: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(colab.nota_coordenacao || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: autor } = useQuery({
    queryKey: ["profile-nome", colab.nota_coordenacao_updated_by],
    queryFn: async () => {
      if (!colab.nota_coordenacao_updated_by) return null;
      const { data } = await supabase.from("profiles").select("nome").eq("id", colab.nota_coordenacao_updated_by).maybeSingle();
      return data?.nome ?? null;
    },
    enabled: !!colab.nota_coordenacao_updated_by,
  });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("colaboradores").update({
      nota_coordenacao: value || null,
      nota_coordenacao_updated_by: user?.id ?? null,
      nota_coordenacao_updated_at: new Date().toISOString(),
    }).eq("id", colab.id);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar nota", description: error.message, variant: "destructive" }); return; }
    setEditing(false);
    onSaved();
  };

  return (
    <div className="rounded-2xl border border-terracota/20 border-l-4 border-l-terracota bg-terracota/[0.06] px-6 py-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-terracota">
          Nota da Coordenação
        </div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-terracota/80 hover:text-terracota inline-flex items-center gap-1">
            <Pencil className="w-3 h-3" /> editar
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} autoFocus />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setValue(colab.nota_coordenacao || ""); setEditing(false); }}>Cancelar</Button>
            <Button size="sm" onClick={save} disabled={saving} className="bg-terracota hover:bg-terracota/90 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </div>
      ) : colab.nota_coordenacao ? (
        <>
          <p className="text-[15px] leading-relaxed text-foreground">{colab.nota_coordenacao}</p>
          {colab.nota_coordenacao_updated_at && (
            <p className="text-xs text-muted-foreground mt-3">
              <span className="text-terracota font-medium">{autor ?? "—"}</span> · {formatDistanceToNow(new Date(colab.nota_coordenacao_updated_at), { locale: ptBR, addSuffix: true })}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">Sem nota registrada.</p>
      )}
    </div>
  );
}

// ---------- Card generic ----------
function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-terracota">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function EditLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs text-terracota/80 hover:text-terracota inline-flex items-center gap-1">
      <Pencil className="w-3 h-3" /> editar
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-2">
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">{label}</span>
      <div className="text-[15px] text-foreground">{children || <span className="text-muted-foreground italic">—</span>}</div>
    </div>
  );
}

// ---------- Dados Pessoais ----------
function DadosPessoaisCard({ colab, canEdit, onSaved }: { colab: Colab; canEdit: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    cpf: colab.cpf || "",
    data_nascimento: colab.data_nascimento || "",
    data_admissao: colab.data_admissao || "",
    telefone: colab.telefone || "",
    email: colab.email || "",
    endereco: colab.endereco || "",
    cidade: colab.cidade || "",
    estado: colab.estado || "",
    cep: colab.cep || "",
    observacoes: colab.observacoes || "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setForm({
      cpf: colab.cpf || "", data_nascimento: colab.data_nascimento || "",
      data_admissao: colab.data_admissao || "", telefone: colab.telefone || "",
      email: colab.email || "", endereco: colab.endereco || "",
      cidade: colab.cidade || "", estado: colab.estado || "", cep: colab.cep || "",
      observacoes: colab.observacoes || "",
    });
  }, [colab.id]);

  const idade = colab.data_nascimento ? differenceInYears(new Date(), new Date(colab.data_nascimento)) : null;

  const save = async () => {
    setSaving(true);
    const payload: any = { ...form };
    ["data_nascimento", "data_admissao"].forEach((k) => { if (!payload[k]) payload[k] = null; });
    const { error } = await supabase.from("colaboradores").update(payload).eq("id", colab.id);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    setEditing(false); onSaved();
  };

  return (
    <Card
      title="Dados Pessoais"
      action={canEdit && (editing ? (
        <div className="flex gap-2">
          <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">cancelar</button>
          <button onClick={save} disabled={saving} className="text-xs text-terracota hover:underline inline-flex items-center gap-1">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} salvar
          </button>
        </div>
      ) : (
        <EditLink onClick={() => setEditing(true)} />
      ))}
    >
      {editing ? (
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="CPF" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })} />
          <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
          <Input type="date" placeholder="Data de admissão" value={form.data_admissao} onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} />
          <Input placeholder="Celular" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })} />
          <Input className="col-span-2" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input className="col-span-2" placeholder="Endereço" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          <Input placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          <Input placeholder="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase().slice(0, 2) })} />
          <Input placeholder="CEP" value={form.cep} onChange={(e) => setForm({ ...form, cep: formatCEP(e.target.value) })} />
          <Textarea className="col-span-2" placeholder="Contato de emergência / observações" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-6">
          <Field label="CPF">{colab.cpf}</Field>
          <Field label="Nascimento">
            {colab.data_nascimento
              ? `${format(new Date(colab.data_nascimento), "dd MMM yyyy", { locale: ptBR })}${idade !== null ? ` · ${idade} anos` : ""}`
              : null}
          </Field>
          <Field label="Desde">
            {colab.data_admissao ? format(new Date(colab.data_admissao), "MMM yyyy", { locale: ptBR }) : null}
          </Field>
          <Field label="Celular · WhatsApp">{colab.telefone}</Field>
          <Field label="E-mail">{colab.email}</Field>
          <Field label="Contato de emergência">{colab.observacoes}</Field>
          <div className="col-span-3">
            <Field label="Endereço">
              {[colab.endereco, colab.cidade, colab.estado, colab.cep].filter(Boolean).join(" · ")}
            </Field>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------- Cargo Card ----------
function CargoCard({ colab }: { colab: Colab }) {
  const { data: projetos = [] } = useQuery({
    queryKey: ["projetos-lider", colab.id],
    queryFn: async () => {
      const { data } = await supabase.from("projetos").select("id, titulo").eq("lider_responsavel_id", colab.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <Card title="Cargo" action={<EditLink onClick={() => {}} />}>
      <p className="font-serif text-3xl text-foreground leading-tight">{colab.cargo || "—"}</p>
      {projetos.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 mb-2">Líder nos projetos</div>
          <div className="flex flex-wrap gap-2">
            {projetos.map((p: any) => (
              <Link key={p.id} to={`/projetos/${p.id}`}
                className="inline-flex items-center rounded-full border border-border/60 bg-background hover:border-terracota hover:text-terracota text-foreground px-4 py-1.5 text-sm transition-colors">
                {p.titulo}
              </Link>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------- CNH Card ----------
function CnhCard({ colab, canEdit, onSaved, docs, refetchDocs }: {
  colab: Colab; canEdit: boolean; onSaved: () => void; docs: Doc[]; refetchDocs: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    possui_cnh: !!colab.possui_cnh,
    tipo_cnh: colab.tipo_cnh || "",
    cnh_validade: colab.cnh_validade || "",
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => setForm({ possui_cnh: !!colab.possui_cnh, tipo_cnh: colab.tipo_cnh || "", cnh_validade: colab.cnh_validade || "" }), [colab.id]);

  const cnhDoc = docs.find((d) => d.categoria === "cnh");
  const validade = colab.cnh_validade ? new Date(colab.cnh_validade) : null;
  const diasParaVencer = validade ? differenceInDays(validade, new Date()) : null;
  const vencendo = diasParaVencer !== null && diasParaVencer <= 30 && diasParaVencer >= 0;
  const vencido = diasParaVencer !== null && diasParaVencer < 0;

  const categorias = (colab.tipo_cnh || "").split(/[,;\s]+/).filter(Boolean);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("colaboradores").update({
      possui_cnh: form.possui_cnh,
      tipo_cnh: form.tipo_cnh || null,
      cnh_validade: form.cnh_validade || null,
    }).eq("id", colab.id);
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setEditing(false); onSaved();
  };

  const uploadCnh = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${colab.id}/cnh-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(DOC_BUCKET).upload(path, file);
    if (upErr) { toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" }); setUploading(false); return; }
    const { error: dbErr } = await supabase.from("colaborador_documentos").insert({
      colaborador_id: colab.id, nome_arquivo: file.name, url: path,
      tipo_documento: "cnh", categoria: "cnh",
    });
    setUploading(false);
    if (dbErr) { toast({ title: "Erro ao salvar", description: dbErr.message, variant: "destructive" }); return; }
    toast({ title: "CNH anexada" });
    refetchDocs();
  };

  return (
    <Card
      title="CNH"
      action={canEdit && (editing ? (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="w-4 h-4" /></Button>
          <Button size="sm" onClick={save} disabled={saving} className="bg-terracota hover:bg-terracota-dark text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil className="w-4 h-4" /></Button>
      ))}
    >
      {editing ? (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.possui_cnh} onChange={(e) => setForm({ ...form, possui_cnh: e.target.checked })} />
            Possui CNH
          </label>
          <Input placeholder="Categorias (A, B, C...)" value={form.tipo_cnh} onChange={(e) => setForm({ ...form, tipo_cnh: e.target.value.toUpperCase() })} />
          <Input type="date" value={form.cnh_validade} onChange={(e) => setForm({ ...form, cnh_validade: e.target.value })} />
        </div>
      ) : colab.possui_cnh ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {categorias.length > 0 ? categorias.map((c: string) => (
              <span key={c} className="rounded bg-marinho text-marinho-foreground text-xs px-2 py-1 font-semibold">{c}</span>
            )) : <span className="text-sm text-muted-foreground">Categorias não informadas</span>}
          </div>
          {validade && (
            <div className={`flex items-center gap-2 text-sm ${vencido || vencendo ? "text-terracota" : "text-marinho"}`}>
              <span className={`w-2 h-2 rounded-full ${vencido || vencendo ? "bg-terracota" : "bg-marinho"}`} />
              {vencido ? `Vencida há ${Math.abs(diasParaVencer!)}d` :
                vencendo ? `Vence em ${diasParaVencer}d` :
                  `Em dia — vence ${format(validade, "dd/MM/yyyy")}`}
            </div>
          )}
          {cnhDoc ? (
            <button
              onClick={async () => {
                const { data } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(cnhDoc.url, 600);
                if (data?.signedUrl) window.open(data.signedUrl, "_blank");
              }}
              className="inline-flex items-center gap-2 text-sm text-marinho hover:underline"
            >
              <FileText className="w-4 h-4" /> {cnhDoc.nome_arquivo}
            </button>
          ) : canEdit ? (
            <>
              <input ref={fileRef} type="file" hidden accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && uploadCnh(e.target.files[0])} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Paperclip className="w-4 h-4 mr-1" />}
                Anexar CNH
              </Button>
            </>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Não possui CNH</p>
      )}
    </Card>
  );
}

// ---------- Transporte ----------
function TransporteCard({ colab }: { colab: Colab }) {
  const Icon = colab.tipo_conducao?.toLowerCase().includes("moto") ? Bike : Car;
  return (
    <Card title="Transporte próprio">
      {colab.possui_conducao ? (
        <div className="flex items-center gap-3">
          <Icon className="w-8 h-8 text-marinho" />
          <div>
            <p className="text-sm text-foreground">{colab.tipo_conducao || "Sim"}</p>
            {colab.updated_at && (
              <p className="text-xs text-muted-foreground">
                Atualizado {formatDistanceToNow(new Date(colab.updated_at), { locale: ptBR, addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Não possui transporte próprio</p>
      )}
    </Card>
  );
}

// ---------- Documentos ----------
function DocumentosCard({ colabId, docs, refetch, canEdit }: {
  colabId: string; docs: Doc[]; refetch: () => void; canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState("outro");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const grouped = useMemo(() => {
    const map: Record<string, Doc[]> = {};
    for (const d of docs) {
      const c = d.categoria || "outro";
      (map[c] ||= []).push(d);
    }
    return map;
  }, [docs]);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${colabId}/${categoria}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(DOC_BUCKET).upload(path, file);
    if (upErr) { toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" }); setUploading(false); return; }
    const { error } = await supabase.from("colaborador_documentos").insert({
      colaborador_id: colabId, nome_arquivo: file.name, url: path,
      tipo_documento: categoria, categoria,
    });
    setUploading(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Documento arquivado" });
    setFile(null); setOpen(false); refetch();
  };

  const openDoc = async (d: Doc) => {
    const { data } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(d.url, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <Card
      title="Documentos"
      action={canEdit && (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Upload className="w-4 h-4 mr-1" /> Arquivar
        </Button>
      )}
    >
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nenhum documento arquivado.</p>
      ) : (
        <div className="space-y-1">
          {CATEGORIAS.map((cat) => {
            const items = grouped[cat.key];
            if (!items?.length) return null;
            return (
              <Collapsible key={cat.key} defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-medium text-foreground hover:text-terracota">
                  <ChevronRight className="w-4 h-4 transition-transform data-[state=open]:rotate-90" />
                  {cat.label}
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 space-y-1">
                  {items.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => openDoc(d)}
                      className="flex items-center justify-between w-full text-left rounded px-2 py-1.5 hover:bg-muted/50"
                    >
                      <span className="text-sm text-foreground flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{d.nome_arquivo}</span>
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatDistanceToNow(new Date(d.created_at), { locale: ptBR, addSuffix: true })}
                      </span>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Arquivar documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={upload} disabled={!file || uploading} className="bg-terracota hover:bg-terracota-dark text-white">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Arquivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------- Header ----------
function HeaderColab({ colab, lider, tempoCasa, onEdit, onPhotoUploaded }: {
  colab: Colab; lider: { id: string; nome: string } | null; tempoCasa: string | null;
  onEdit: () => void; onPhotoUploaded: () => void;
}) {
  const { data: fotoUrl } = useSignedUrl(FOTO_BUCKET, colab.foto_url);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const onFile = async (f: File) => {
    setUploading(true);
    const ext = f.name.split(".").pop();
    const path = `colaboradores/${colab.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(FOTO_BUCKET).upload(path, f, { upsert: true });
    if (upErr) { toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" }); setUploading(false); return; }
    const { error } = await supabase.from("colaboradores").update({ foto_url: path }).eq("id", colab.id);
    setUploading(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    onPhotoUploaded();
  };

  const openWhatsApp = () => {
    const digits = (colab.telefone || "").replace(/\D/g, "");
    if (!digits) { onEdit(); return; }
    window.open(`https://wa.me/55${digits}`, "_blank");
  };

  return (
    <div className="sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center gap-4">
        <button
          onClick={() => fileRef.current?.click()}
          className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-terracota/30 bg-muted flex-shrink-0"
        >
          {uploading ? (
            <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-terracota" /></div>
          ) : fotoUrl ? (
            <img src={fotoUrl} alt={colab.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-serif text-muted-foreground">
              {colab.nome?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </button>
        <input ref={fileRef} type="file" hidden accept="image/*" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-2xl md:text-3xl text-foreground truncate">{colab.nome}</h1>
            <Badge variant="outline" className="border-marinho text-marinho">
              {(colab.tipo_vinculo || "interno").toUpperCase()}
            </Badge>
            <Badge className={colab.ativo ? "bg-marinho text-marinho-foreground" : "bg-muted text-muted-foreground"}>
              {colab.ativo ? "ATIVO" : "INATIVO"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {colab.cargo || "—"}{colab.sub_equipe ? ` · Sub-equipe ${colab.sub_equipe}` : ""}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lider ? (
              <>responde a: <Link to={`/equipe/${lider.id}`} className="text-marinho hover:underline">{lider.nome}</Link></>
            ) : null}
            {lider && tempoCasa ? " · " : null}
            {tempoCasa ? `na equipe há ${tempoCasa}` : null}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openWhatsApp} className="gap-1">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </Button>
          <Button size="sm" onClick={onEdit} className="bg-terracota hover:bg-terracota-dark text-white gap-1">
            <Pencil className="w-4 h-4" /> Editar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Mafe FAB ----------
function MafeFab({ colabId }: { colabId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir Mafe"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-terracota hover:bg-terracota-dark text-white shadow-lg flex items-center justify-center z-40"
      >
        <span className="font-serif text-xl">M</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mafe</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Em breve: perguntas sobre este colaborador (contexto: {colabId.slice(0, 8)}…).
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------- Página ----------
export default function ColaboradorPerfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = useIsManager(user?.id);
  const queryClient = useQueryClient();
  const [editKick, setEditKick] = useState(0); // signal cards to enter edit mode

  const { data: colab, isLoading, error, refetch } = useQuery({
    queryKey: ["colaborador", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("colaboradores").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const lider = null as { id: string; nome: string } | null;


  const { data: docs = [], refetch: refetchDocs } = useQuery({
    queryKey: ["colab-docs", id],
    queryFn: async () => {
      const { data } = await supabase.from("colaborador_documentos").select("*").eq("colaborador_id", id!).order("created_at", { ascending: false });
      return (data ?? []) as Doc[];
    },
    enabled: !!id,
  });

  const { data: liberacoes = [] } = useQuery({
    queryKey: ["colab-lib", id],
    queryFn: async () => {
      const { data } = await supabase.from("colaborador_liberacoes").select("data_validade, status").eq("colaborador_id", id!);
      return data ?? [];
    },
    enabled: !!id,
  });

  const alertaLiberacao = useMemo(() => {
    const now = new Date();
    return liberacoes.some((l: any) => {
      if (!l.data_validade) return false;
      const d = differenceInDays(new Date(l.data_validade), now);
      return d <= 15;
    });
  }, [liberacoes]);

  const tempoCasa = useMemo(() => {
    if (!colab?.data_admissao) return null;
    const anos = differenceInYears(new Date(), new Date(colab.data_admissao));
    const meses = differenceInMonths(new Date(), new Date(colab.data_admissao)) % 12;
    if (anos > 0) return `${anos} ${anos === 1 ? "ano" : "anos"}${meses > 0 ? ` e ${meses}m` : ""}`;
    return `${Math.max(1, meses)} ${meses === 1 ? "mês" : "meses"}`;
  }, [colab?.data_admissao]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
          <div className="grid md:grid-cols-2 gap-4">
            <Skeleton className="h-64" /><Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !colab) {
    return (
      <AppLayout>
        <div className="p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-terracota mx-auto" />
          <p className="text-foreground">Não foi possível carregar este colaborador.</p>
          <Button onClick={() => refetch()} variant="outline"><RotateCw className="w-4 h-4 mr-1" /> Tentar de novo</Button>
        </div>
      </AppLayout>
    );
  }

  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["colaborador", id] });
    queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-3">
          <Link to="/equipe" className="hover:text-terracota">Equipe</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{colab.nome}</span>
        </nav>

        <HeaderColab
          colab={colab}
          lider={lider ?? null}
          tempoCasa={tempoCasa}
          onEdit={() => setEditKick((k) => k + 1)}
          onPhotoUploaded={onSaved}
        />

        <div className="mt-6">
          <TooltipProvider>
            <Tabs defaultValue="dados">
              <TabsList className="flex flex-wrap gap-1 bg-transparent h-auto p-0">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="uniforme">Uniforme & EPI</TabsTrigger>
                <TabsTrigger value="maquinas">Máquinas</TabsTrigger>
                <TabsTrigger value="liberacoes" className="relative">
                  Liberações
                  {alertaLiberacao && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-terracota" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                {["diarias", "adiantamentos", "deslocamento"].map((k) => (
                  <Tooltip key={k}>
                    <TooltipTrigger asChild>
                      <span>
                        <TabsTrigger value={k} disabled className="opacity-50 cursor-not-allowed">
                          {k === "diarias" ? "Diárias & Escala" : k === "adiantamentos" ? "Adiantamentos" : "Deslocamento"}
                        </TabsTrigger>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>módulo futuro</TooltipContent>
                  </Tooltip>
                ))}
              </TabsList>

              <TabsContent value="dados" className="mt-4 space-y-4">
                <NotaCoordenacao colab={colab} canEdit={isManager} onSaved={onSaved} />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <DadosPessoaisCard key={`dp-${editKick}`} colab={colab} canEdit={isManager} onSaved={onSaved} />
                    <CargoCard colab={colab} />
                  </div>
                  <div className="space-y-4">
                    <CnhCard colab={colab} canEdit={isManager} onSaved={onSaved} docs={docs} refetchDocs={refetchDocs} />
                    <TransporteCard colab={colab} />
                    <DocumentosCard colabId={colab.id} docs={docs} refetch={refetchDocs} canEdit={isManager} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="uniforme" className="mt-4">
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                  Em construção — uniformes e EPI aparecerão aqui.
                </div>
              </TabsContent>
              <TabsContent value="maquinas" className="mt-4">
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                  Em construção — máquinas vinculadas ao colaborador.
                </div>
              </TabsContent>
              <TabsContent value="liberacoes" className="mt-4">
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                  Em construção — liberações por condomínio.
                </div>
              </TabsContent>
              <TabsContent value="historico" className="mt-4">
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                  Em construção — histórico do colaborador.
                </div>
              </TabsContent>
            </Tabs>
          </TooltipProvider>
        </div>

        <MafeFab colabId={colab.id} />
      </div>
    </AppLayout>
  );
}

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { useClientesSimples } from "@/hooks/useClientes";
import { useColaboradoresAtivos } from "@/hooks/useColaboradores";
import { useCreateCrmCard, type CrmCardTipo } from "@/hooks/useCRM";
import { toast } from "@/hooks/use-toast";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import { DraftResumeBanner } from "@/components/DraftResumeBanner";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CrmNovoCard({ open, onClose }: Props) {
  const { data: clientes = [] } = useClientesSimples();
  const { data: colaboradores = [] } = useColaboradoresAtivos();
  const createCard = useCreateCrmCard();

  const [tipo, setTipo] = useState<CrmCardTipo>("Proposta");
  const [titulo, setTitulo] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [contatoNome, setContatoNome] = useState("");
  const [contatoCargo, setContatoCargo] = useState("");
  const [contatoWhatsapp, setContatoWhatsapp] = useState("");
  const [contatoEmail, setContatoEmail] = useState("");
  const [prazo, setPrazo] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const draft = useAutosaveDraft({
    formKey: "crm-novo-card",
    scopeKey: "novo",
    enabled: open,
    getSnapshot: () => ({
      tipo, titulo, clienteId, responsavelId,
      contatoNome, contatoCargo, contatoWhatsapp, contatoEmail,
      prazo, observacoes,
    }),
    applySnapshot: (s: any) => {
      if (!s) return;
      if (s.tipo) setTipo(s.tipo);
      if (typeof s.titulo === "string") setTitulo(s.titulo);
      if (typeof s.clienteId === "string") setClienteId(s.clienteId);
      if (typeof s.responsavelId === "string") setResponsavelId(s.responsavelId);
      if (typeof s.contatoNome === "string") setContatoNome(s.contatoNome);
      if (typeof s.contatoCargo === "string") setContatoCargo(s.contatoCargo);
      if (typeof s.contatoWhatsapp === "string") setContatoWhatsapp(s.contatoWhatsapp);
      if (typeof s.contatoEmail === "string") setContatoEmail(s.contatoEmail);
      if (typeof s.prazo === "string") setPrazo(s.prazo);
      if (typeof s.observacoes === "string") setObservacoes(s.observacoes);
    },
  });


  const handleSave = async () => {
    if (!titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    await createCard.mutateAsync({
      tipo,
      titulo: titulo.trim(),
      cliente_id: clienteId || null,
      responsavel_id: responsavelId || null,
      contato_nome: contatoNome || null,
      contato_cargo: contatoCargo || null,
      contato_whatsapp: contatoWhatsapp || null,
      contato_email: contatoEmail || null,
      prazo: prazo || null,
      observacoes: observacoes || null,
    } as any);
    await draft.clearDraft();
    toast({ title: "Card criado com sucesso!" });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif">Novo Card CRM</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-4">
          <DraftResumeBanner draft={draft} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as CrmCardTipo)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Obra">Obra</SelectItem>
                  <SelectItem value="Proposta">Proposta</SelectItem>
                  <SelectItem value="Manutencao">Manutenção</SelectItem>
                  <SelectItem value="Tarefa">Tarefa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1" placeholder="Ex: Jardim Residência Silva" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border border-border rounded-lg p-3 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground">PONTO DE CONTATO</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={contatoNome} onChange={(e) => setContatoNome(e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Cargo</Label>
                <Input value={contatoCargo} onChange={(e) => setContatoCargo(e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">WhatsApp</Label>
                <Input value={contatoWhatsapp} onChange={(e) => setContatoWhatsapp(e.target.value)} className="mt-1 h-8 text-sm" placeholder="5511999999999" />
              </div>
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={contatoEmail} onChange={(e) => setContatoEmail(e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="mt-1" rows={3} />
          </div>

          <Button onClick={handleSave} disabled={createCard.isPending} className="w-full">
            {createCard.isPending ? "Salvando..." : "Criar Card"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

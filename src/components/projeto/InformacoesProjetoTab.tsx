import { useState, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText,
  Upload,
  Trash2,
  MessageSquare,
  Send,
  Loader2,
  User,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Projeto } from "@/hooks/useProjetos";
import { FilePreview } from "./FilePreview";
import { MemorialDescritivo } from "./MemorialDescritivo";
import { MaoDeObraDescritivo } from "./MaoDeObraDescritivo";

interface InformacoesProjetoTabProps {
  projeto: Projeto;
  isAdmin: boolean;
  userId?: string;
}

interface ProjetoArquivo {
  id: string;
  projeto_id: string;
  nome: string;
  url: string;
  tipo: string;
  tamanho: number | null;
  uploaded_by: string | null;
  created_at: string;
}

interface ProjetoComentario {
  id: string;
  projeto_id: string;
  usuario_id: string | null;
  texto: string;
  created_at: string;
  updated_at: string;
}

export function InformacoesProjetoTab({ projeto, isAdmin, userId }: InformacoesProjetoTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [novoComentario, setNovoComentario] = useState("");
  const [uploading, setUploading] = useState(false);

  // Fetch arquivos
  const { data: arquivos = [] } = useQuery({
    queryKey: ["projeto-arquivos", projeto.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_arquivos")
        .select("*")
        .eq("projeto_id", projeto.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjetoArquivo[];
    },
  });

  // Fetch comentários
  const { data: comentarios = [] } = useQuery({
    queryKey: ["projeto-comentarios", projeto.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projeto_comentarios")
        .select("*")
        .eq("projeto_id", projeto.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProjetoComentario[];
    },
  });

  // Fetch profile names for comments
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome");
      if (error) throw error;
      return data;
    },
  });
  const profileMap = new Map(profiles.map((p) => [p.id, p.nome]));




  // Upload file
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${projeto.id}/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("projeto-arquivos")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("projeto-arquivos")
          .getPublicUrl(path);

        const { error: dbError } = await supabase.from("projeto_arquivos").insert({
          projeto_id: projeto.id,
          nome: file.name,
          url: path,
          tipo: ext || "documento",
          tamanho: file.size,
          uploaded_by: userId || null,
        });
        if (dbError) throw dbError;
      }

      queryClient.invalidateQueries({ queryKey: ["projeto-arquivos", projeto.id] });
      toast({ title: "Arquivo(s) enviado(s)" });
    } catch {
      toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  // Delete file
  const deleteArquivoMutation = useMutation({
    mutationFn: async (arquivo: ProjetoArquivo) => {
      await supabase.storage.from("projeto-arquivos").remove([arquivo.url]);
      const { error } = await supabase.from("projeto_arquivos").delete().eq("id", arquivo.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projeto-arquivos", projeto.id] });
      toast({ title: "Arquivo removido" });
    },
  });

  // Add comment
  const addComentarioMutation = useMutation({
    mutationFn: async (texto: string) => {
      const { error } = await supabase.from("projeto_comentarios").insert({
        projeto_id: projeto.id,
        usuario_id: userId || null,
        texto,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projeto-comentarios", projeto.id] });
      setNovoComentario("");
      toast({ title: "Comentário adicionado" });
    },
  });

  const formatDate = (d: string) =>
    format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Info do Projeto */}
      <section className="card-botanical p-5">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          Detalhes do Projeto
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Descrição</p>
            <p className="text-foreground">{projeto.descricao || "—"}</p>
          </div>
          {projeto.data_inicio && (
            <div>
              <p className="text-sm text-muted-foreground">Data de Início</p>
              <p className="text-foreground">
                {format(new Date(projeto.data_inicio + "T12:00:00"), "dd/MM/yyyy")}
              </p>
            </div>
          )}
          {projeto.data_previsao && (
            <div>
              <p className="text-sm text-muted-foreground">Previsão de Conclusão</p>
              <p className="text-foreground">
                {format(new Date(projeto.data_previsao + "T12:00:00"), "dd/MM/yyyy")}
              </p>
            </div>
          )}
          {(projeto as any).tipo === "manutencao" && (projeto as any).valor_mensal && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Valor Mensal</p>
                <p className="text-foreground font-semibold">
                  R$ {Number((projeto as any).valor_mensal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dia de Vencimento</p>
                <p className="text-foreground">Dia {(projeto as any).dia_vencimento || 10}</p>
              </div>
            </>
          )}
          {projeto.observacoes && (
            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">Observações</p>
              <p className="text-foreground whitespace-pre-wrap">{projeto.observacoes}</p>
            </div>
          )}
        </div>
      </section>

      {/* Arquivos */}
      <section className="card-botanical p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Arquivos do Projeto
          </h3>
          {isAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg,.dxf"
                onChange={handleUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Enviar Arquivo
              </Button>
            </>
          )}
        </div>

        {arquivos.length > 0 ? (
          <div className="space-y-2">
            {arquivos.map((arq) => (
              <div key={arq.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <FilePreview
                  nome={arq.nome}
                  url={arq.url}
                  tipo={arq.tipo}
                  bucket="projeto-arquivos"
                  tamanho={arq.tamanho}
                />
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive ml-1"
                    onClick={() => deleteArquivoMutation.mutate(arq)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhum arquivo anexado</p>
        )}
      </section>

      {/* Memorial Descritivo */}
      <MemorialDescritivo projetoId={projeto.id} isAdmin={isAdmin} />

      {/* Mão de Obra */}
      <MaoDeObraDescritivo projetoId={projeto.id} isAdmin={isAdmin} />

      {/* Comentários */}
      <section className="card-botanical p-5">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Comentários ({comentarios.length})
        </h3>

        {/* Novo comentário */}
        <div className="flex gap-2 mb-4">
          <Textarea
            placeholder="Adicionar comentário..."
            value={novoComentario}
            onChange={(e) => setNovoComentario(e.target.value)}
            className="min-h-[60px]"
          />
          <Button
            variant="terracota"
            size="sm"
            className="self-end"
            disabled={!novoComentario.trim() || addComentarioMutation.isPending}
            onClick={() => addComentarioMutation.mutate(novoComentario.trim())}
          >
            {addComentarioMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {comentarios.length > 0 ? (
          <div className="space-y-3">
            {comentarios.map((c) => (
              <div key={c.id} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {profileMap.get(c.usuario_id || "") || "Usuário"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(c.created_at)}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap pl-5">{c.texto}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhum comentário ainda</p>
        )}
      </section>
    </div>
  );
}

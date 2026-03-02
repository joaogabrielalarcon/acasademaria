import { useState } from "react";
import { Download, X, File, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FilePreviewProps {
  nome: string;
  url: string; // storage path
  tipo?: string;
  bucket: string;
  tamanho?: number | null;
}

const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
const pdfExts = ["pdf"];

function getExt(nome: string): string {
  return (nome.split(".").pop() || "").toLowerCase();
}

export function FilePreview({ nome, url, tipo, bucket, tamanho }: FilePreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const ext = getExt(nome);
  const isImage = imageExts.includes(ext);
  const isPdf = pdfExts.includes(ext);
  const canPreview = isImage || isPdf;

  const getSignedUrl = async () => {
    if (signedUrl) return signedUrl;
    setLoading(true);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(url, 600);
    setLoading(false);
    if (error || !data?.signedUrl) {
      toast({ title: "Erro ao carregar arquivo", variant: "destructive" });
      return null;
    }
    setSignedUrl(data.signedUrl);
    return data.signedUrl;
  };

  const handlePreview = async () => {
    const sUrl = await getSignedUrl();
    if (sUrl) setExpanded(true);
  };

  const handleDownload = async () => {
    const sUrl = await getSignedUrl();
    if (sUrl) window.open(sUrl, "_blank");
  };

  const icon = isImage ? (
    <ImageIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
  ) : isPdf ? (
    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
  ) : (
    <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />
  );

  return (
    <>
      <div className="flex items-center gap-3 min-w-0">
        {/* Thumbnail / icon */}
        {isImage && signedUrl ? (
          <img
            src={signedUrl}
            alt={nome}
            className="w-10 h-10 rounded object-cover flex-shrink-0 cursor-pointer border border-border"
            onClick={handlePreview}
          />
        ) : (
          <button
            onClick={canPreview ? handlePreview : handleDownload}
            className="flex-shrink-0 p-2 rounded hover:bg-accent transition-colors"
            title={canPreview ? "Pré-visualizar" : "Baixar"}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : icon}
          </button>
        )}

        <button
          onClick={canPreview ? handlePreview : handleDownload}
          className="min-w-0 text-left hover:underline"
        >
          <p className="text-sm font-medium text-foreground truncate">{nome}</p>
        </button>
      </div>

      <div className="flex gap-1 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={handleDownload} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        </Button>
      </div>

      {/* Expanded preview dialog */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">{nome}</DialogTitle>
          <div className="flex items-center justify-between p-3 border-b bg-muted/50">
            <span className="text-sm font-medium truncate">{nome}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-1" /> Baixar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-auto max-h-[80vh] flex items-center justify-center bg-muted/20 p-4">
            {isImage && signedUrl && (
              <img src={signedUrl} alt={nome} className="max-w-full max-h-[75vh] object-contain rounded" />
            )}
            {isPdf && signedUrl && (
              <iframe src={signedUrl} className="w-full h-[75vh] rounded border-0" title={nome} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

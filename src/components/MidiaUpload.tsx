import { useState, useRef } from "react";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MidiaItem {
  url: string;
  tipo: string;
  nome: string;
}

interface MidiaUploadProps {
  value: MidiaItem[];
  onChange: (midias: MidiaItem[]) => void;
  bucket?: string;
  folder?: string;
  label?: string;
  maxFiles?: number;
}

export function MidiaUpload({
  value = [],
  onChange,
  bucket = "registros-midia",
  folder = "catalogo",
  label = "Mídias",
  maxFiles = 10,
}: MidiaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (value.length + files.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    setIsUploading(true);
    const newItems: MidiaItem[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          toast.error(`Arquivo ${file.name} não é uma imagem ou vídeo`);
          continue;
        }

        const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(`Arquivo ${file.name} muito grande`);
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, { cacheControl: "3600", upsert: false });

        if (error) {
          console.error("Erro ao enviar arquivo:", error);
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        newItems.push({
          url: urlData.publicUrl,
          tipo: file.type.startsWith("video/") ? "video" : "image",
          nome: file.name,
        });
      }

      if (newItems.length > 0) {
        onChange([...value, ...newItems]);
        toast.success(`${newItems.length} arquivo(s) enviado(s)`);
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivos");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMidia = async (index: number) => {
    const item = value[index];
    try {
      const urlObj = new URL(item.url);
      const pathMatch = urlObj.pathname.match(
        new RegExp(`/storage/v1/object/public/${bucket}/(.+)`)
      );
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        await supabase.storage.from(bucket).remove([filePath]);
      }
    } catch (error) {
      console.error("Erro ao remover do storage:", error);
    }
    onChange(value.filter((_, i) => i !== index));
    toast.success("Arquivo removido");
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {/* Preview Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {value.map((item, idx) => (
            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-primary/20 bg-muted">
              {item.tipo === "video" ? (
                <video src={item.url} className="w-full h-full object-cover" />
              ) : (
                <img src={item.url} alt={item.nome} className="w-full h-full object-cover" />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeMidia(idx)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || value.length >= maxFiles}
        className="gap-2"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Adicionar Fotos/Vídeos
          </>
        )}
      </Button>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          Nenhuma mídia anexada
        </p>
      )}
    </div>
  );
}

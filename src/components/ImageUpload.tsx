import { useState, useRef } from "react";
import { Camera, Loader2, X, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  bucket: string;
  folder?: string;
  className?: string;
}

export function ImageUpload({ 
  value, 
  onChange, 
  bucket, 
  folder = "",
  className = "" 
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      onChange(urlData.publicUrl);
      toast.success("Foto enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar foto:", error);
      toast.error("Erro ao enviar foto");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      // Extrair o path do arquivo da URL
      const url = new URL(value);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
      
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        await supabase.storage.from(bucket).remove([filePath]);
      }
      
      onChange(null);
      toast.success("Foto removida");
    } catch (error) {
      console.error("Erro ao remover foto:", error);
      // Mesmo se falhar a remoção do storage, limpa a referência
      onChange(null);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden">
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          ) : value ? (
            <img 
              src={value} 
              alt="Foto" 
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-10 h-10 text-muted-foreground" />
          )}
        </div>
        
        {value && !isUploading && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full"
            onClick={handleRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
        id="image-upload"
      />
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="gap-2"
      >
        <Camera className="w-4 h-4" />
        {value ? "Trocar Foto" : "Adicionar Foto"}
      </Button>
    </div>
  );
}
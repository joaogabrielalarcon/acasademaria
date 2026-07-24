import { useState } from "react";
import { Link } from "react-router-dom";
import { X, ExternalLink, MapPin, Phone } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SurfaceCard } from "@/components/primitives/SurfaceCard";
import { Chip } from "@/components/primitives/Chip";
import { useCliente } from "@/hooks/useCliente";

/**
 * ClienteDrawerStack — drawer empilhável da ficha do cliente.
 * Abre por cima da tela atual. ESC fecha a camada. Breadcrumb vivo.
 */
export function ClienteDrawer({
  clienteId,
  open,
  onOpenChange,
  breadcrumbFrom,
}: {
  clienteId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  breadcrumbFrom?: string;
}) {
  const { data: cliente, isLoading } = useCliente(clienteId ?? undefined);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[560px] p-0 bg-background border-l border-border overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground min-w-0">
              {breadcrumbFrom && (
                <>
                  <span className="truncate">{breadcrumbFrom}</span>
                  <span>›</span>
                </>
              )}
              <span className="text-foreground font-medium truncate">Cliente</span>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => onOpenChange(false)} aria-label="Fechar">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !cliente ? (
            <SurfaceCard>
              <p className="text-muted-foreground italic">Cliente não encontrado ou sem acesso.</p>
            </SurfaceCard>
          ) : (
            <>
              <div>
                <h2 className="font-serif text-3xl text-foreground leading-tight">{cliente.nome}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Chip variant="navy">{cliente.status === "ativo" ? "Ativo" : "Inativo"}</Chip>
                  {cliente.condominio && <Chip variant="outline">{cliente.condominio}</Chip>}
                </div>
              </div>

              <SurfaceCard>
                <div className="space-y-2 text-[14px]">
                  {(cliente.endereco || cliente.cidade) && (
                    <div className="flex items-start gap-2 text-foreground">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span>
                        {[cliente.endereco, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  )}
                  {cliente.telefone && (
                    <div className="flex items-center gap-2 text-foreground">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a
                        href={`https://wa.me/${cliente.telefone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-primary"
                      >
                        {cliente.telefone}
                      </a>
                    </div>
                  )}
                </div>
              </SurfaceCard>

              {cliente.proprietarios?.length > 0 && (
                <SurfaceCard>
                  <span className="type-label">Proprietários</span>
                  <ul className="mt-3 space-y-2">
                    {cliente.proprietarios.map((p, i) => (
                      <li key={i} className="text-[14px] text-foreground">
                        <span className="font-semibold">{p.nome}</span>
                        {p.telefone && <span className="text-muted-foreground"> · {p.telefone}</span>}
                      </li>
                    ))}
                  </ul>
                </SurfaceCard>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link to={`/clientes/${cliente.id}`} onClick={() => onOpenChange(false)}>
                  Abrir ficha completa <ExternalLink className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Hook simples para orquestrar a pilha (empilhável — só uma camada por agora, mas com contrato pronto). */
export function useClienteDrawer() {
  const [stack, setStack] = useState<string[]>([]);
  const open = stack.length > 0;
  const current = stack[stack.length - 1] ?? null;
  return {
    open,
    current,
    push: (id: string) => setStack((s) => [...s, id]),
    popOrClose: () => setStack((s) => (s.length ? s.slice(0, -1) : s)),
    closeAll: () => setStack([]),
    setOpen: (v: boolean) => {
      if (!v) setStack((s) => s.slice(0, -1));
    },
  };
}

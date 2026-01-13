import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, UserCircle, MoreVertical, Pencil } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data
const mockColaboradores = [
  { id: "1", nome: "João Silva", funcao: "Jardineiro", ativo: true },
  { id: "2", nome: "Maria Santos", funcao: "Jardineira", ativo: true },
  { id: "3", nome: "Pedro Oliveira", funcao: "Paisagista", ativo: true },
  { id: "4", nome: "Ana Costa", funcao: "Administrativo", ativo: false },
  { id: "5", nome: "Maria Fernanda", funcao: "Diretora", ativo: true },
];

export default function Equipe() {
  const [colaboradores, setColaboradores] = useState(mockColaboradores);

  const toggleAtivo = (id: string) => {
    setColaboradores(prev => 
      prev.map(c => c.id === id ? { ...c, ativo: !c.ativo } : c)
    );
  };

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Equipe
          </h1>
          <p className="text-muted-foreground">
            Colaboradores do time
          </p>
        </div>
        <Button variant="terracota" asChild>
          <Link to="/equipe/novo">
            <Plus className="w-4 h-4" />
            Novo Colaborador
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar colaborador..." className="pl-10" />
      </div>

      {/* List */}
      <div className="card-botanical overflow-hidden">
        <div className="divide-y divide-border">
          {colaboradores.map((colaborador) => (
            <div 
              key={colaborador.id} 
              className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <UserCircle className="w-6 h-6 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">
                  {colaborador.nome}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {colaborador.funcao}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {colaborador.ativo ? "Ativo" : "Inativo"}
                  </span>
                  <Switch 
                    checked={colaborador.ativo}
                    onCheckedChange={() => toggleAtivo(colaborador.id)}
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

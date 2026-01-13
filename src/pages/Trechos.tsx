import { Link } from "react-router-dom";
import { Search, Plus, MapPin } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Mock data
const mockTrechos = [
  { id: "1", nome: "Jardim Frontal", cliente: "Família Silveira", descricao: "Área de entrada com palmeiras e forrações" },
  { id: "2", nome: "Horta", cliente: "Residência Campos", descricao: "Canteiro de ervas aromáticas e hortaliças" },
  { id: "3", nome: "Piscina", cliente: "Família Silveira", descricao: "Entorno da piscina com plantas tropicais" },
  { id: "4", nome: "Terraço", cliente: "Edifício Aurora", descricao: "Jardim vertical e área de contemplação" },
  { id: "5", nome: "Varanda", cliente: "Residência Campos", descricao: "Vasos com plantas de sombra" },
];

export default function Trechos() {
  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Trechos
          </h1>
          <p className="text-muted-foreground">
            Áreas e setores dos jardins
          </p>
        </div>
        <Button variant="terracota" asChild>
          <Link to="/trechos/novo">
            <Plus className="w-4 h-4" />
            Novo Trecho
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar trecho..." className="pl-10" />
      </div>

      {/* List */}
      <div className="space-y-3">
        {mockTrechos.map((trecho) => (
          <Link key={trecho.id} to={`/trechos/${trecho.id}`} className="block">
            <article className="card-botanical p-4 flex items-center gap-4 animate-fade-in hover:shadow-card transition-all">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-foreground">
                  {trecho.nome}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {trecho.cliente} • {trecho.descricao}
                </p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}

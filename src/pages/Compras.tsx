import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Package, Leaf, Warehouse, Copy } from "lucide-react";
import { FornecedoresContent } from "./Fornecedores";
import { InsumosContent } from "./Insumos";
import { PlantasContent } from "./Plantas";
import { EstoqueTab } from "@/components/estoque/EstoqueTab";
import { DuplicadosTab } from "@/components/fornecedores/DuplicadosTab";
import { useAuth, useIsAdminOrAdministrativo } from "@/hooks/useAuth";

export default function Compras() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "fornecedores";

  const { user } = useAuth();
  const podeMesclar = useIsAdminOrAdministrativo(user?.id);

  const tabs = [
    { value: "fornecedores", label: "Fornecedores", icon: Truck },
    { value: "insumos", label: "Produtos e Insumos", icon: Package },
    { value: "plantas", label: "Plantas", icon: Leaf },
    { value: "estoque", label: "Estoque", icon: Warehouse },
    ...(podeMesclar ? [{ value: "duplicados", label: "Duplicados", icon: Copy }] : []),
  ] as const;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
            Compras
          </h1>
          <p className="text-muted-foreground mt-1">
            Fornecedores, produtos, plantas e estoque
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full sm:w-auto">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="fornecedores" className="mt-6">
            <FornecedoresContent />
          </TabsContent>

          <TabsContent value="insumos" className="mt-6">
            <InsumosContent />
          </TabsContent>

          <TabsContent value="plantas" className="mt-6">
            <PlantasContent />
          </TabsContent>

          <TabsContent value="estoque" className="mt-6">
            <EstoqueTab />
          </TabsContent>

          {podeMesclar && (
            <TabsContent value="duplicados" className="mt-6">
              <DuplicadosTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}

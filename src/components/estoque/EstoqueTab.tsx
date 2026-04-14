import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Leaf } from "lucide-react";
import { EstoqueList } from "./EstoqueList";

export function EstoqueTab() {
  const [subTab, setSubTab] = useState("insumos");

  return (
    <div className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="insumos" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Insumos
          </TabsTrigger>
          <TabsTrigger value="plantas" className="flex items-center gap-2">
            <Leaf className="w-4 h-4" />
            Plantas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insumos" className="mt-4">
          <EstoqueList itemTipo="insumo" />
        </TabsContent>

        <TabsContent value="plantas" className="mt-4">
          <EstoqueList itemTipo="planta" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

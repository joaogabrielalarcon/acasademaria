import { useState } from "react";
import { ClipboardList, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaintenanceRecord } from "@/hooks/useDiarioManutencao";
import { DiarioNovaVisita } from "@/components/diario/DiarioNovaVisita";
import { DiarioHistorico } from "@/components/diario/DiarioHistorico";

interface DiarioManutencaoModuleProps {
  scopeProjectId?: string;
  scopedClienteId?: string;
}

export function DiarioManutencaoModule({ scopeProjectId, scopedClienteId }: DiarioManutencaoModuleProps) {
  const [activeTab, setActiveTab] = useState<"nova" | "historico">("nova");
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "nova" | "historico")} className="space-y-6">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl p-1">
        <TabsTrigger value="nova" className="gap-2 py-3">
          <ClipboardList className="w-4 h-4" />
          {editingRecord ? "Editar visita" : "Nova visita"}
        </TabsTrigger>
        <TabsTrigger value="historico" className="gap-2 py-3">
          <History className="w-4 h-4" />
          Histórico
        </TabsTrigger>
      </TabsList>

      <TabsContent value="nova">
        <DiarioNovaVisita
          scopeProjectId={scopeProjectId}
          scopedClienteId={scopedClienteId}
          editingRecord={editingRecord}
          onCancelEdit={() => {
            setEditingRecord(null);
            setActiveTab("historico");
          }}
          onSaved={() => {
            setEditingRecord(null);
            setActiveTab("historico");
          }}
        />
      </TabsContent>

      <TabsContent value="historico">
        <DiarioHistorico
          scopeProjectId={scopeProjectId}
          onEdit={(record) => {
            setEditingRecord(record);
            setActiveTab("nova");
          }}
        />
      </TabsContent>
    </Tabs>
  );
}

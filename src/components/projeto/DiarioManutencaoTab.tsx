import { DiarioManutencaoModule } from "@/components/diario/DiarioManutencaoModule";

interface DiarioManutencaoTabProps {
  projetoId: string;
  clienteId: string;
}

export function DiarioManutencaoTab({ projetoId, clienteId }: DiarioManutencaoTabProps) {
  return <DiarioManutencaoModule scopeProjectId={projetoId} scopedClienteId={clienteId} />;
}

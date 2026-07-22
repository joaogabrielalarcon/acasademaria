import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listClientes from "./tools/list-clientes";
import getCliente from "./tools/get-cliente";
import listProjetos from "./tools/list-projetos";
import listCrmCards from "./tools/list-crm-cards";
import createCrmCard from "./tools/create-crm-card";
import describeSchema from "./tools/describe-schema";
import readTable from "./tools/read-table";
import listStorage from "./tools/list-storage";
import criarRegistros from "./tools/criar-registros";
import atualizarRegistro from "./tools/atualizar-registro";

// Direct Supabase issuer (never the .lovable.cloud proxy). Vite inlines this
// at build time so no runtime env read happens at module top level.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "mfm-paisagismo-mcp",
  title: "MFM Paisagismo",
  version: "0.1.0",
  instructions:
    "Ferramentas do sistema MFM Paisagismo. Permite consultar clientes, projetos e cards do CRM, criar leads, e leitura genérica de tabelas/schema/storage para auditoria e arquitetura. Toda operação executa como o usuário autenticado e respeita as permissões (RLS).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoami,
    listClientes,
    getCliente,
    listProjetos,
    listCrmCards,
    createCrmCard,
    describeSchema,
    readTable,
    listStorage,
  ],
});

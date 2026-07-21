import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listClientes from "./tools/list-clientes";
import getCliente from "./tools/get-cliente";
import listProjetos from "./tools/list-projetos";
import listCrmCards from "./tools/list-crm-cards";
import createCrmCard from "./tools/create-crm-card";

// Direct Supabase issuer (never the .lovable.cloud proxy). Vite inlines this
// at build time so no runtime env read happens at module top level.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "mfm-paisagismo-mcp",
  title: "MFM Paisagismo",
  version: "0.1.0",
  instructions:
    "Ferramentas do sistema MFM Paisagismo. Permite consultar clientes, projetos e cards do CRM, e criar novos leads. Toda operação executa como o usuário autenticado e respeita as permissões (RLS).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listClientes, getCliente, listProjetos, listCrmCards, createCrmCard],
});

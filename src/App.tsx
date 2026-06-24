import { lazy, Suspense, ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RealtimeInvalidationBridge } from "@/hooks/useRealtimeInvalidation";
import Login from "./pages/Login";
import MenuCentral from "./pages/MenuCentral";

// Wrap dynamic imports so a stale chunk (after a new deploy) doesn't crash
// the app with "Importing a module script failed". We retry once, then force
// a hard reload to fetch the new index manifest.
const RELOAD_KEY = "__lovable_chunk_reload__";
function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      const isChunkError =
        /Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk|ChunkLoadError/i.test(
          msg
        );
      if (isChunkError) {
        try {
          return await factory();
        } catch {
          if (typeof window !== "undefined" && !sessionStorage.getItem(RELOAD_KEY)) {
            sessionStorage.setItem(RELOAD_KEY, "1");
            window.location.reload();
            // Return a never-resolving promise while the page reloads.
            return new Promise(() => {}) as any;
          }
        }
      }
      throw err;
    }
  });
}

const MafeChat = lazyWithRetry(() =>
  import("@/components/FloraChat").then((m) => ({ default: m.MafeChat }))
);

// Lazy-loaded routes for better initial load performance
const Clientes = lazyWithRetry(() => import("./pages/Clientes"));
const ClientePerfil = lazyWithRetry(() => import("./pages/ClientePerfil"));
const NovoCliente = lazyWithRetry(() => import("./pages/NovoCliente"));
const Equipe = lazyWithRetry(() => import("./pages/Equipe"));
const NovoRegistro = lazyWithRetry(() => import("./pages/NovoRegistro"));
const RegistroDetalhe = lazyWithRetry(() => import("./pages/RegistroDetalhe"));
const NovaProposta = lazyWithRetry(() => import("./pages/NovaProposta"));
const NovoRecebimento = lazyWithRetry(() => import("./pages/NovoRecebimento"));
const NovaSolicitacao = lazyWithRetry(() => import("./pages/NovaSolicitacao"));
const Fornecedores = lazyWithRetry(() => import("./pages/Fornecedores"));
const Plantas = lazyWithRetry(() => import("./pages/Plantas"));
const NovaPlanta = lazyWithRetry(() => import("./pages/NovaPlanta"));
const NovoProjeto = lazyWithRetry(() => import("./pages/NovoProjeto"));
const ProjetoDetalhe = lazyWithRetry(() => import("./pages/ProjetoDetalhe"));
const Insumos = lazyWithRetry(() => import("./pages/Insumos"));
const Compras = lazyWithRetry(() => import("./pages/Compras"));
const CustosEquipe = lazyWithRetry(() => import("./pages/CustosEquipe"));
const Maquinas = lazyWithRetry(() => import("./pages/Maquinas"));
const AlterarSenha = lazyWithRetry(() => import("./pages/AlterarSenha"));
const EsqueciSenha = lazyWithRetry(() => import("./pages/EsqueciSenha"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Areas = lazyWithRetry(() => import("./pages/Areas"));
const ControleAcessos = lazyWithRetry(() => import("./pages/ControleAcessos"));
const BootstrapAdmin = lazyWithRetry(() => import("./pages/BootstrapAdmin"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const ProcessosInternos = lazyWithRetry(() => import("./pages/ProcessosInternos"));
const Calendario = lazyWithRetry(() => import("./pages/Calendario"));
const CRM = lazyWithRetry(() => import("./pages/CRM"));
const MinhaAgenda = lazyWithRetry(() => import("./pages/MinhaAgenda"));
const Conciliacao = lazyWithRetry(() => import("./pages/Conciliacao"));
const AReceber = lazyWithRetry(() => import("./pages/AReceber"));
const CategoriasPlantas = lazyWithRetry(() => import("./pages/CategoriasPlantas"));
const Movimentacoes = lazyWithRetry(() => import("./pages/Movimentacoes"));
const Orcamentos = lazyWithRetry(() => import("./pages/Orcamentos"));
const NovoOrcamento = lazyWithRetry(() => import("./pages/NovoOrcamento"));
const Indicadores = lazyWithRetry(() => import("./pages/Indicadores"));
const SolicitacoesCompras = lazyWithRetry(() => import("./pages/SolicitacoesCompras"));


const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RealtimeInvalidationBridge />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/esqueci-senha" element={<EsqueciSenha />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/bootstrap" element={<BootstrapAdmin />} />
            <Route path="/" element={<ProtectedRoute><MenuCentral /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/alterar-senha" element={<ProtectedRoute><AlterarSenha /></ProtectedRoute>} />
            <Route path="/clientes/novo" element={<ProtectedRoute><NovoCliente /></ProtectedRoute>} />
            <Route path="/clientes/:id" element={<ProtectedRoute><ClientePerfil /></ProtectedRoute>} />
            <Route path="/clientes/:id/editar" element={<ProtectedRoute><NovoCliente /></ProtectedRoute>} />
            <Route path="/equipe" element={<ProtectedRoute><Equipe /></ProtectedRoute>} />
            <Route path="/registros/novo" element={<ProtectedRoute><NovoRegistro /></ProtectedRoute>} />
            <Route path="/registros/:id" element={<ProtectedRoute><RegistroDetalhe /></ProtectedRoute>} />
            <Route path="/registros/:id/editar" element={<ProtectedRoute><RegistroDetalhe /></ProtectedRoute>} />
            <Route path="/recebimentos/novo" element={<ProtectedRoute><NovoRecebimento /></ProtectedRoute>} />
            <Route path="/solicitacoes/nova" element={<ProtectedRoute><NovaSolicitacao /></ProtectedRoute>} />
            <Route path="/propostas/nova" element={<ProtectedRoute><NovaProposta /></ProtectedRoute>} />
            <Route path="/fornecedores" element={<Navigate to="/compras?tab=fornecedores" replace />} />
            <Route path="/categorias-plantas" element={<ProtectedRoute><CategoriasPlantas /></ProtectedRoute>} />
            <Route path="/plantas" element={<Navigate to="/compras?tab=plantas" replace />} />
            <Route path="/plantas/nova" element={<ProtectedRoute><NovaPlanta /></ProtectedRoute>} />
            <Route path="/plantas/:id/editar" element={<ProtectedRoute><NovaPlanta /></ProtectedRoute>} />
            <Route path="/insumos" element={<Navigate to="/compras?tab=insumos" replace />} />
            <Route path="/compras" element={<ProtectedRoute><Compras /></ProtectedRoute>} />
            <Route path="/projetos/novo" element={<ProtectedRoute><NovoProjeto /></ProtectedRoute>} />
            <Route path="/projetos/:id" element={<ProtectedRoute><ProjetoDetalhe /></ProtectedRoute>} />
            <Route path="/projetos/:id/editar" element={<ProtectedRoute><NovoProjeto /></ProtectedRoute>} />
            <Route path="/maquinas" element={<ProtectedRoute><Maquinas /></ProtectedRoute>} />
            <Route path="/areas" element={<ProtectedRoute><Areas /></ProtectedRoute>} />
            <Route path="/acessos" element={<ProtectedRoute><ControleAcessos /></ProtectedRoute>} />
            <Route path="/custos-equipe" element={<ProtectedRoute><CustosEquipe /></ProtectedRoute>} />
            <Route path="/processos" element={<ProtectedRoute><ProcessosInternos /></ProtectedRoute>} />
            <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
            <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
            <Route path="/orcamentos" element={<ProtectedRoute allowedRoles={["admin","administrativo","gestao_campo"]}><Orcamentos /></ProtectedRoute>} />
            <Route path="/orcamentos/novo" element={<ProtectedRoute allowedRoles={["admin","administrativo","gestao_campo"]}><NovoOrcamento /></ProtectedRoute>} />
            <Route path="/orcamentos/:id" element={<ProtectedRoute allowedRoles={["admin","administrativo","gestao_campo"]}><NovoOrcamento /></ProtectedRoute>} />
            <Route path="/indicadores" element={<ProtectedRoute><Indicadores /></ProtectedRoute>} />
            <Route path="/solicitacoes-compras" element={<ProtectedRoute><SolicitacoesCompras /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><MinhaAgenda /></ProtectedRoute>} />
            <Route path="/conciliacao" element={<ProtectedRoute><Conciliacao /></ProtectedRoute>} />
            <Route path="/financeiro/a-receber" element={<ProtectedRoute><AReceber /></ProtectedRoute>} />
            <Route path="/financeiro/movimentacoes" element={<ProtectedRoute><Movimentacoes /></ProtectedRoute>} />
            <Route path="/diario" element={<Navigate to="/" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Suspense fallback={null}>
          <MafeChat />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
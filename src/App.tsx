import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MafeChat } from "@/components/FloraChat";
import Login from "./pages/Login";
import MenuCentral from "./pages/MenuCentral";

// Lazy-loaded routes for better initial load performance
const Clientes = lazy(() => import("./pages/Clientes"));
const ClientePerfil = lazy(() => import("./pages/ClientePerfil"));
const NovoCliente = lazy(() => import("./pages/NovoCliente"));
const Equipe = lazy(() => import("./pages/Equipe"));
const NovoRegistro = lazy(() => import("./pages/NovoRegistro"));
const RegistroDetalhe = lazy(() => import("./pages/RegistroDetalhe"));
const NovaProposta = lazy(() => import("./pages/NovaProposta"));
const NovoRecebimento = lazy(() => import("./pages/NovoRecebimento"));
const NovaSolicitacao = lazy(() => import("./pages/NovaSolicitacao"));
const Fornecedores = lazy(() => import("./pages/Fornecedores"));
const Plantas = lazy(() => import("./pages/Plantas"));
const NovaPlanta = lazy(() => import("./pages/NovaPlanta"));
const NovoProjeto = lazy(() => import("./pages/NovoProjeto"));
const ProjetoDetalhe = lazy(() => import("./pages/ProjetoDetalhe"));
const Insumos = lazy(() => import("./pages/Insumos"));
const Compras = lazy(() => import("./pages/Compras"));
const CustosEquipe = lazy(() => import("./pages/CustosEquipe"));
const Maquinas = lazy(() => import("./pages/Maquinas"));
const AlterarSenha = lazy(() => import("./pages/AlterarSenha"));
const EsqueciSenha = lazy(() => import("./pages/EsqueciSenha"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Areas = lazy(() => import("./pages/Areas"));
const ControleAcessos = lazy(() => import("./pages/ControleAcessos"));
const BootstrapAdmin = lazy(() => import("./pages/BootstrapAdmin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProcessosInternos = lazy(() => import("./pages/ProcessosInternos"));
const Calendario = lazy(() => import("./pages/Calendario"));
const CRM = lazy(() => import("./pages/CRM"));
const MinhaAgenda = lazy(() => import("./pages/MinhaAgenda"));
const Conciliacao = lazy(() => import("./pages/Conciliacao"));
const AReceber = lazy(() => import("./pages/AReceber"));
const CategoriasPlantas = lazy(() => import("./pages/CategoriasPlantas"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
            <Route path="/agenda" element={<ProtectedRoute><MinhaAgenda /></ProtectedRoute>} />
            <Route path="/conciliacao" element={<ProtectedRoute><Conciliacao /></ProtectedRoute>} />
            <Route path="/financeiro/a-receber" element={<ProtectedRoute><AReceber /></ProtectedRoute>} />
            <Route path="/diario" element={<Navigate to="/" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <MafeChat />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
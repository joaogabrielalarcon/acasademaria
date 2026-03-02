import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Clientes from "./pages/Clientes";
import ClientePerfil from "./pages/ClientePerfil";
import NovoCliente from "./pages/NovoCliente";
import Equipe from "./pages/Equipe";
import NovoRegistro from "./pages/NovoRegistro";
import RegistroDetalhe from "./pages/RegistroDetalhe";
import NovaProposta from "./pages/NovaProposta";
import NovoRecebimento from "./pages/NovoRecebimento";
import NovaSolicitacao from "./pages/NovaSolicitacao";
import Fornecedores from "./pages/Fornecedores";
import CategoriasPlantas from "./pages/CategoriasPlantas";
import Plantas from "./pages/Plantas";
import NovaPlanta from "./pages/NovaPlanta";
import NovoProjeto from "./pages/NovoProjeto";
import ProjetoDetalhe from "./pages/ProjetoDetalhe";
import Insumos from "./pages/Insumos";
import CustosEquipe from "./pages/CustosEquipe";
import Maquinas from "./pages/Maquinas";
import Login from "./pages/Login";
import AlterarSenha from "./pages/AlterarSenha";
import Areas from "./pages/Areas";
import ControleAcessos from "./pages/ControleAcessos";
import BootstrapAdmin from "./pages/BootstrapAdmin";
import NotFound from "./pages/NotFound";
import MenuCentral from "./pages/MenuCentral";
import ProcessosInternos from "./pages/ProcessosInternos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
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
          <Route path="/fornecedores" element={<ProtectedRoute><Fornecedores /></ProtectedRoute>} />
          <Route path="/categorias-plantas" element={<ProtectedRoute><CategoriasPlantas /></ProtectedRoute>} />
          <Route path="/plantas" element={<ProtectedRoute><Plantas /></ProtectedRoute>} />
          <Route path="/plantas/nova" element={<ProtectedRoute><NovaPlanta /></ProtectedRoute>} />
          <Route path="/plantas/:id/editar" element={<ProtectedRoute><NovaPlanta /></ProtectedRoute>} />
          <Route path="/insumos" element={<ProtectedRoute><Insumos /></ProtectedRoute>} />
          <Route path="/projetos/novo" element={<ProtectedRoute><NovoProjeto /></ProtectedRoute>} />
          <Route path="/projetos/:id" element={<ProtectedRoute><ProjetoDetalhe /></ProtectedRoute>} />
          <Route path="/projetos/:id/editar" element={<ProtectedRoute><NovoProjeto /></ProtectedRoute>} />
          <Route path="/maquinas" element={<ProtectedRoute><Maquinas /></ProtectedRoute>} />
          <Route path="/areas" element={<ProtectedRoute><Areas /></ProtectedRoute>} />
          <Route path="/acessos" element={<ProtectedRoute><ControleAcessos /></ProtectedRoute>} />
          <Route path="/custos-equipe" element={<ProtectedRoute><CustosEquipe /></ProtectedRoute>} />
          <Route path="/processos" element={<ProtectedRoute><ProcessosInternos /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

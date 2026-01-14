import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Clientes from "./pages/Clientes";
import ClientePerfil from "./pages/ClientePerfil";
import NovoCliente from "./pages/NovoCliente";
import Equipe from "./pages/Equipe";
import NovoRegistro from "./pages/NovoRegistro";
import NovaProposta from "./pages/NovaProposta";
import NovoRecebimento from "./pages/NovoRecebimento";
import Fornecedores from "./pages/Fornecedores";
import CategoriasPlantas from "./pages/CategoriasPlantas";
import Plantas from "./pages/Plantas";
import NovaPlanta from "./pages/NovaPlanta";
import Insumos from "./pages/Insumos";
import Login from "./pages/Login";
import AlterarSenha from "./pages/AlterarSenha";
import Areas from "./pages/Areas";
import BootstrapAdmin from "./pages/BootstrapAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Clientes />} />
          <Route path="/login" element={<Login />} />
          <Route path="/alterar-senha" element={<AlterarSenha />} />
          <Route path="/bootstrap" element={<BootstrapAdmin />} />
          <Route path="/clientes/novo" element={<NovoCliente />} />
          <Route path="/clientes/:id" element={<ClientePerfil />} />
          <Route path="/clientes/:id/editar" element={<NovoCliente />} />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/registros/novo" element={<NovoRegistro />} />
          <Route path="/recebimentos/novo" element={<NovoRecebimento />} />
          <Route path="/propostas/nova" element={<NovaProposta />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/categorias-plantas" element={<CategoriasPlantas />} />
          <Route path="/plantas" element={<Plantas />} />
          <Route path="/plantas/nova" element={<NovaPlanta />} />
          <Route path="/plantas/:id/editar" element={<NovaPlanta />} />
          <Route path="/insumos" element={<Insumos />} />
          <Route path="/areas" element={<Areas />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

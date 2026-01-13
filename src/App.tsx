import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Clientes from "./pages/Clientes";
import ClientePerfil from "./pages/ClientePerfil";
import NovoCliente from "./pages/NovoCliente";
import Trechos from "./pages/Trechos";
import Equipe from "./pages/Equipe";
import NovoRegistro from "./pages/NovoRegistro";
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
          <Route path="/clientes/novo" element={<NovoCliente />} />
          <Route path="/clientes/:id" element={<ClientePerfil />} />
          <Route path="/trechos" element={<Trechos />} />
          <Route path="/equipe" element={<Equipe />} />
          <Route path="/registros/novo" element={<NovoRegistro />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Invitation from "./pages/Invitation";
import Auth from "./pages/Auth";
import AdminLayout from "./layouts/AdminLayout";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import CriarSenha from "./pages/CriarSenha";
import Usuarios from "./pages/admin/Usuarios";
import Convidados from "./pages/admin/Convidados";
import Detalhes from "./pages/admin/Detalhes";
import Cronograma from "./pages/admin/Cronograma";
import Buffet from "./pages/admin/Buffet";
import Playlist from "./pages/admin/Playlist";
import Presentes from "./pages/admin/Presentes";
import Momentos from "./pages/admin/Momentos";
import Estatisticas from "./pages/admin/Estatisticas";
import Checkin from "./pages/admin/Checkin";
import Logs from "./pages/admin/Logs";
import Eventos from "./pages/admin/Eventos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/convite/:invitation_code" element={<Invitation />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/criar-senha" element={<CriarSenha />} />
          <Route path="/acesso-negado" element={<AccessDenied />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Detalhes />} />
            <Route path="detalhes" element={<Detalhes />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="convidados" element={<Convidados />} />
            <Route path="checkin" element={<Checkin />} />
            <Route path="presentes" element={<Presentes />} />
            <Route path="cronograma" element={<Cronograma />} />
            <Route path="eventos" element={<Eventos />} />
            <Route path="buffet" element={<Buffet />} />
            <Route path="playlist" element={<Playlist />} />
            <Route path="momentos" element={<Momentos />} />
            <Route path="estatisticas" element={<Estatisticas />} />
            <Route path="logs" element={<Logs />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

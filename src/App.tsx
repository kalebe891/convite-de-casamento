import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WeddingProvider } from "./contexts/WeddingContext";
import Index from "./pages/Index";
import Invitation from "./pages/Invitation";
import Auth from "./pages/Auth";
import AdminLayout from "./layouts/AdminLayout";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";
import CriarSenha from "./pages/CriarSenha";
import LandingHome from "./pages/LandingHome";
import EventTypeLanding from "./pages/EventTypeLanding";
import TenantPublicLayout from "./components/routing/TenantPublicLayout";
import TenantAdminGuard from "./components/routing/TenantAdminGuard";
import MasterAdminGuard from "./components/routing/MasterAdminGuard";
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
import MasterDashboard from "./pages/admin/MasterDashboard";

const queryClient = new QueryClient();

const tenantAdminChildren = (
  <>
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
  </>
);

const masterAdminChildren = (
  <>
    <Route index element={<MasterDashboard />} />
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
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ===== Rotas estáticas / institucionais ===== */}
          <Route path="/" element={<LandingHome />} />
          <Route path="/casamento" element={<EventTypeLanding />} />
          <Route path="/aniversario" element={<EventTypeLanding />} />

          {/* Atalhos para o Master Admin */}
          <Route path="/casamento/admin" element={<Navigate to="/admin" replace />} />
          <Route path="/aniversario/admin" element={<Navigate to="/admin" replace />} />

          {/* Auth / utilitárias */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/criar-senha" element={<CriarSenha />} />
          <Route path="/acesso-negado" element={<AccessDenied />} />

          {/* Rota legada pública (mantida) */}
          <Route path="/convite/:invitation_code" element={<Invitation />} />

          {/* ===== Master Admin global (/admin) ===== */}
          <Route
            path="/admin"
            element={
              <MasterAdminGuard>
                <WeddingProvider mode="admin">
                  <AdminLayout />
                </WeddingProvider>
              </MasterAdminGuard>
            }
          >
            {adminChildren}
          </Route>

          {/* ===== Tenant admin: /:eventType/:slug/admin/* ===== */}
          <Route
            path="/:eventType/:slug/admin"
            element={
              <WeddingProvider mode="tenant-admin">
                <TenantAdminGuard>
                  <AdminLayout />
                </TenantAdminGuard>
              </WeddingProvider>
            }
          >
            {adminChildren}
          </Route>

          {/* ===== Tenant público: /:eventType/:slug ===== */}
          <Route
            path="/:eventType/:slug"
            element={
              <WeddingProvider mode="public">
                <TenantPublicLayout />
              </WeddingProvider>
            }
          >
            <Route index element={<Index />} />
            <Route path="convite" element={<Index />} />
            <Route path="rsvp" element={<Index />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

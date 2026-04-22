import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AIFloatingChat } from "@/components/AIFloatingChat";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import TicketsList from "./pages/TicketsList";
import TicketDetail from "./pages/TicketDetail";
import NewTicket from "./pages/NewTicket";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import AIChat from "./pages/AIChat";
import Reports from "./pages/Reports";
import ReportsManagement from "./pages/ReportsManagement";
import PPRPlans from "./pages/PPRPlans";
import AssetManagement from "./pages/AssetManagement";
import InternalChat from "./pages/InternalChat";
import NotificationsList from "./pages/NotificationsList";
import KnowledgeBase from "./pages/KnowledgeBase";
import KnowledgeBaseArticle from "./pages/KnowledgeBaseArticle";
import Documents from "./pages/Documents";

// Admin Pages
import UsersManagement from "./pages/admin/UsersManagement";
import DepartmentsManagement from "./pages/admin/DepartmentsManagement";
import CategoriesManagement from "./pages/admin/CategoriesManagement";
import SLAManagement from "./pages/admin/SLAManagement";

// Settings
import TwoFactorSetup from "./pages/settings/TwoFactorSetup";
import NotificationSettings from "./pages/settings/NotificationSettings";

// Layout
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected routes */}
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/tickets" element={<TicketsList />} />
                  <Route path="/tickets/new" element={<NewTicket />} />
                  <Route path="/tickets/:id" element={<TicketDetail />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/ai-chat" element={<AIChat />} />
                  <Route path="/notifications" element={<NotificationsList />} />
                  <Route path="/ppr" element={<PPRPlans />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/reports/manage" element={<ReportsManagement />} />
                  <Route path="/assets" element={<AssetManagement />} />
                  <Route path="/chat" element={<InternalChat />} />
                  <Route path="/knowledge" element={<KnowledgeBase />} />
                  <Route path="/knowledge/:id" element={<KnowledgeBaseArticle />} />
                  <Route path="/documents" element={<Documents />} />
                  {/* Admin routes */}
                  <Route path="/admin/users" element={<UsersManagement />} />
                  <Route path="/admin/departments" element={<DepartmentsManagement />} />
                  <Route path="/admin/categories" element={<CategoriesManagement />} />
                  <Route path="/admin/sla" element={<SLAManagement />} />
                  
                  {/* Settings */}
                  <Route path="/settings/2fa" element={<TwoFactorSetup />} />
                  <Route path="/settings/notifications" element={<NotificationSettings />} />
                </Route>

                {/* Redirects */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <AIFloatingChat />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

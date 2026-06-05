import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Pages
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TicketsList = lazy(() => import("./pages/TicketsList"));
const TicketDetail = lazy(() => import("./pages/TicketDetail"));
const NewTicket = lazy(() => import("./pages/NewTicket"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AIChat = lazy(() => import("./pages/AIChat"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportsManagement = lazy(() => import("./pages/ReportsManagement"));
const EmployeePerformance = lazy(() => import("./pages/EmployeePerformance"));
const PPRPlans = lazy(() => import("./pages/PPRPlans"));
const AssetManagement = lazy(() => import("./pages/AssetManagement"));
const InternalChat = lazy(() => import("./pages/InternalChat"));
const VideoConferences = lazy(() => import("./pages/VideoConferences"));
const NotificationsList = lazy(() => import("./pages/NotificationsList"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const KnowledgeBaseArticle = lazy(() => import("./pages/KnowledgeBaseArticle"));
const Documents = lazy(() => import("./pages/Documents"));
const AIFloatingChat = lazy(() => import("@/components/AIFloatingChat").then((module) => ({ default: module.AIFloatingChat })));

// Admin Pages
const AdministrationSection = lazy(() => import("./pages/admin/AdministrationSection"));
const UsersManagement = lazy(() => import("./pages/admin/UsersManagement"));
const DepartmentsManagement = lazy(() => import("./pages/admin/DepartmentsManagement"));
const CategoriesManagement = lazy(() => import("./pages/admin/CategoriesManagement"));
const SLAManagement = lazy(() => import("./pages/admin/SLAManagement"));

// Settings
const NotificationSettings = lazy(() => import("./pages/settings/NotificationSettings"));
const TwoFactorSetup = lazy(() => import("./pages/settings/TwoFactorSetup"));

// Layout
import AppLayout from "./components/layout/AppLayout";

const queryClient = new QueryClient();
const pageFallback = (
  <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
    Загрузка...
  </div>
);

function DeferredAIFloatingChat() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idleCallback = window.requestIdleCallback || ((callback: IdleRequestCallback) => window.setTimeout(callback, 1500));
    const cancelIdleCallback = window.cancelIdleCallback || window.clearTimeout;
    const handle = idleCallback(() => setReady(true));

    return () => cancelIdleCallback(handle);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <AIFloatingChat />
    </Suspense>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={pageFallback}>
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
                      <Route path="/performance" element={<EmployeePerformance />} />
                      <Route path="/assets" element={<AssetManagement />} />
                      <Route path="/chat" element={<InternalChat />} />
                      <Route path="/meetings" element={<VideoConferences />} />
                      <Route path="/meet/:meetingId" element={<VideoConferences />} />
                      <Route path="/knowledge" element={<KnowledgeBase />} />
                      <Route path="/knowledge/:id" element={<KnowledgeBaseArticle />} />
                      <Route path="/documents" element={<Documents />} />
                      {/* Admin routes */}
                      <Route path="/admin/users" element={<AdministrationSection />} />
                      <Route path="/admin/groups" element={<AdministrationSection />} />
                      <Route path="/admin/organizations" element={<AdministrationSection />} />
                      <Route path="/admin/rules" element={<AdministrationSection />} />
                      <Route path="/admin/directories" element={<AdministrationSection />} />
                      <Route path="/admin/profiles" element={<AdministrationSection />} />
                      <Route path="/admin/notification-queue" element={<AdministrationSection />} />
                      <Route path="/admin/logs" element={<AdministrationSection />} />
                      <Route path="/admin/equipment" element={<AdministrationSection />} />
                      <Route path="/admin/glpi-inventory" element={<AdministrationSection />} />
                      <Route path="/admin/forms" element={<AdministrationSection />} />
                      {/* Existing CRUD pages kept for direct access */}
                      <Route path="/admin/users/manage" element={<UsersManagement />} />
                      <Route path="/admin/departments" element={<DepartmentsManagement />} />
                      <Route path="/admin/categories" element={<CategoriesManagement />} />
                      <Route path="/admin/sla" element={<SLAManagement />} />
                      
                      {/* Settings */}
                      <Route path="/settings/notifications" element={<NotificationSettings />} />
                      <Route path="/settings/2fa" element={<TwoFactorSetup />} />
                      <Route path="/settings/authentication" element={<TwoFactorSetup />} />
                      <Route path="/settings/dropdowns" element={<Navigate to="/admin/categories" replace />} />
                      <Route path="/settings/components" element={<Navigate to="/assets?section=devices" replace />} />
                      <Route path="/settings/service-levels" element={<Navigate to="/admin/sla" replace />} />
                      <Route path="/settings/general" element={<Navigate to="/profile" replace />} />
                      <Route path="/settings/unique-field" element={<Navigate to="/admin/categories" replace />} />
                      <Route path="/settings/automatic-actions" element={<Navigate to="/notifications" replace />} />
                      <Route path="/settings/receivers" element={<Navigate to="/notifications" replace />} />
                      <Route path="/settings/external-links" element={<Navigate to="/knowledge" replace />} />
                      <Route path="/settings/plugins" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/settings/object-management" element={<Navigate to="/assets" replace />} />
                    </Route>

                    {/* Redirects */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    
                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <DeferredAIFloatingChat />
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;

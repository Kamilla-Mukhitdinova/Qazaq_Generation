import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
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

function RequireRoles({ roles, children }: { roles: string[]; children: JSX.Element }) {
  const { role, loading } = useAuth();

  if (loading) return pageFallback;
  if (!role || !roles.includes(role)) {
    return <Navigate to={role === 'employee' ? '/tickets' : '/dashboard'} replace />;
  }

  return children;
}

function RoleRedirect() {
  const { role, loading } = useAuth();

  if (loading) return pageFallback;

  return <Navigate to={role === 'employee' ? '/tickets' : '/dashboard'} replace />;
}

function DeferredAIFloatingChat() {
  const [ready, setReady] = useState(false);
  const { role, loading } = useAuth();

  useEffect(() => {
    const idleCallback = window.requestIdleCallback || ((callback: IdleRequestCallback) => window.setTimeout(callback, 1500));
    const cancelIdleCallback = window.cancelIdleCallback || window.clearTimeout;
    const handle = idleCallback(() => setReady(true));

    return () => cancelIdleCallback(handle);
  }, []);

  if (!ready || loading) return null;

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
                      <Route path="/dashboard" element={<RequireRoles roles={['agent', 'manager', 'admin']}><Dashboard /></RequireRoles>} />
                      <Route path="/tickets" element={<TicketsList />} />
                      <Route path="/tickets/new" element={<NewTicket />} />
                      <Route path="/tickets/:id" element={<TicketDetail />} />
                      <Route path="/profile" element={<RequireRoles roles={['agent', 'manager', 'admin']}><Profile /></RequireRoles>} />
                      <Route path="/ai-chat" element={<RequireRoles roles={['agent', 'manager', 'admin']}><AIChat /></RequireRoles>} />
                      <Route path="/notifications" element={<RequireRoles roles={['agent', 'manager', 'admin']}><NotificationsList /></RequireRoles>} />
                      <Route path="/ppr" element={<RequireRoles roles={['manager', 'admin']}><PPRPlans /></RequireRoles>} />
                      <Route path="/reports" element={<RequireRoles roles={['manager', 'admin']}><Reports /></RequireRoles>} />
                      <Route path="/reports/manage" element={<RequireRoles roles={['manager', 'admin']}><ReportsManagement /></RequireRoles>} />
                      <Route path="/performance" element={<RequireRoles roles={['manager', 'admin']}><EmployeePerformance /></RequireRoles>} />
                      <Route path="/assets" element={<RequireRoles roles={['manager', 'admin']}><AssetManagement /></RequireRoles>} />
                      <Route path="/chat" element={<RequireRoles roles={['agent', 'manager', 'admin']}><InternalChat /></RequireRoles>} />
                      <Route path="/meetings" element={<RequireRoles roles={['agent', 'manager', 'admin']}><VideoConferences /></RequireRoles>} />
                      <Route path="/meet/:meetingId" element={<VideoConferences />} />
                      <Route path="/knowledge" element={<RequireRoles roles={['agent', 'manager', 'admin']}><KnowledgeBase /></RequireRoles>} />
                      <Route path="/knowledge/:id" element={<RequireRoles roles={['agent', 'manager', 'admin']}><KnowledgeBaseArticle /></RequireRoles>} />
                      <Route path="/documents" element={<RequireRoles roles={['agent', 'manager', 'admin']}><Documents /></RequireRoles>} />
                      {/* Admin routes */}
                      <Route path="/admin/users" element={<RequireRoles roles={['admin']}><AdministrationSection /></RequireRoles>} />
                      <Route path="/admin/groups" element={<RequireRoles roles={['admin']}><AdministrationSection /></RequireRoles>} />
                      <Route path="/admin/organizations" element={<RequireRoles roles={['admin']}><AdministrationSection /></RequireRoles>} />
                      <Route path="/admin/rules" element={<RequireRoles roles={['admin']}><AdministrationSection /></RequireRoles>} />
                      <Route path="/admin/directories" element={<RequireRoles roles={['admin']}><AdministrationSection /></RequireRoles>} />
                      <Route path="/admin/profiles" element={<RequireRoles roles={['admin']}><AdministrationSection /></RequireRoles>} />
                      <Route path="/admin/notification-queue" element={<RequireRoles roles={['admin']}><AdministrationSection /></RequireRoles>} />
                      <Route path="/admin/logs" element={<RequireRoles roles={['admin']}><AdministrationSection /></RequireRoles>} />
                      <Route path="/admin/equipment" element={<RequireRoles roles={['admin']}><AdministrationSection /></RequireRoles>} />
                      <Route path="/admin/glpi-inventory" element={<RequireRoles roles={['admin']}><AdministrationSection /></RequireRoles>} />
                      <Route path="/admin/forms" element={<RequireRoles roles={['admin']}><AdministrationSection /></RequireRoles>} />
                      {/* Existing CRUD pages kept for direct access */}
                      <Route path="/admin/users/manage" element={<RequireRoles roles={['admin']}><UsersManagement /></RequireRoles>} />
                      <Route path="/admin/departments" element={<RequireRoles roles={['admin']}><DepartmentsManagement /></RequireRoles>} />
                      <Route path="/admin/categories" element={<RequireRoles roles={['admin']}><CategoriesManagement /></RequireRoles>} />
                      <Route path="/admin/sla" element={<RequireRoles roles={['admin']}><SLAManagement /></RequireRoles>} />
                      
                      {/* Settings */}
                      <Route path="/settings/notifications" element={<RequireRoles roles={['agent', 'manager', 'admin']}><NotificationSettings /></RequireRoles>} />
                      <Route path="/settings/2fa" element={<RequireRoles roles={['agent', 'manager', 'admin']}><TwoFactorSetup /></RequireRoles>} />
                      <Route path="/settings/authentication" element={<RequireRoles roles={['agent', 'manager', 'admin']}><TwoFactorSetup /></RequireRoles>} />
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
                    <Route path="/" element={<RoleRedirect />} />
                    
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

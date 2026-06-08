import { useState } from 'react';
import { Link, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from './Sidebar';
import Header from './Header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { FilePlus2, ListChecks, Loader2, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo.png';

export default function AppLayout() {
  const location = useLocation();
  const { user, profile, role, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('qg-sidebar-collapsed') === '1';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('qg-sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'employee') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-950">
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,hsl(214_42%_88%/0.42)_1px,transparent_1px),linear-gradient(hsl(214_42%_88%/0.42)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(135deg,hsl(210_80%_98%),hsl(0_0%_100%)_42%,hsl(152_52%_96%))]" />
        <div className="relative z-10 flex min-h-screen flex-col">
          <motion.header
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5"
          >
            <Link to="/tickets" className="flex min-w-0 items-center gap-3">
              <img src={logo} alt="Qazaq Generation" className="h-11 w-auto shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">Qazaq Generation</p>
                <p className="truncate text-xs text-slate-500">Service Desk</p>
              </div>
            </Link>

            <nav className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur">
              <NavLink
                to="/tickets"
                className={({ isActive }) => `inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                <ListChecks className="h-4 w-4" />
                Мои заявки
              </NavLink>
              <NavLink
                to="/tickets/new"
                className={({ isActive }) => `inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${isActive ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-900'}`}
              >
                <FilePlus2 className="h-4 w-4" />
                Новая заявка
              </NavLink>
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="max-w-44 truncate text-sm font-medium">{profile?.name || user.name || 'Пользователь'}</p>
                <p className="text-xs text-slate-500">Пользователь</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2 bg-white/80" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Выход
              </Button>
            </div>
          </motion.header>

          <main className="min-h-0 flex-1 px-5 pb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-background via-background to-secondary/20" />
      {/* Desktop Sidebar */}
      <div className="relative z-10 hidden h-full shrink-0 lg:block">
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="min-h-0 flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

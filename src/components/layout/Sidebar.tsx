import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard,
  Ticket,
  Users,
  BarChart3,
  MessageSquare,
  LogOut,
  Key,
  User,
  BellRing,
  Package,
  MessagesSquare,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logo from '@/assets/logo.png';
import { motion } from 'framer-motion';
import { useState } from 'react';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  icon: any;
  labelKey: string;
  href: string;
  roles: string[];
}

interface NavGroup {
  icon: any;
  labelKey: string;
  items: NavItem[];
  roles?: string[];
}

type NavStructure = (NavItem | NavGroup)[];

export default function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const { t } = useLanguage();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const navStructure: NavStructure = [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard', href: '/dashboard', roles: ['employee', 'agent', 'manager', 'admin'] },
    { icon: User, labelKey: 'nav.profile', href: '/profile', roles: ['employee', 'agent', 'manager', 'admin'] },
    { icon: Package, labelKey: 'nav.assets', href: '/assets', roles: ['employee', 'agent', 'manager', 'admin'] },
    {
      icon: Ticket,
      labelKey: 'nav.support',
      items: [
        { icon: Ticket, labelKey: 'nav.tickets', href: '/tickets', roles: ['employee', 'agent', 'manager', 'admin'] },
      ],
      roles: ['employee', 'agent', 'manager', 'admin'],
    },
    {
      icon: BarChart3,
      labelKey: 'nav.management',
      items: [
        { icon: BarChart3, labelKey: 'nav.reports', href: '/reports/manage', roles: ['employee', 'agent', 'manager', 'admin'] },
        { icon: BookOpen, labelKey: 'nav.knowledge', href: '/knowledge', roles: ['employee', 'agent', 'manager', 'admin'] },
      ],
      roles: ['employee', 'agent', 'manager', 'admin'],
    },
    {
      icon: Users,
      labelKey: 'nav.administration',
      items: [
        { icon: Users, labelKey: 'nav.users', href: '/admin/users', roles: ['admin'] },
      ],
      roles: ['admin'],
    },
    { icon: MessagesSquare, labelKey: 'nav.messages', href: '/chat', roles: ['employee', 'agent', 'manager', 'admin'] },
    { icon: MessageSquare, labelKey: 'nav.aiChat', href: '/ai-chat', roles: ['employee', 'agent', 'manager', 'admin'] },
    { icon: BellRing, labelKey: 'nav.notifications', href: '/notifications', roles: ['employee', 'agent', 'manager', 'admin'] },
    {
      icon: Settings,
      labelKey: 'nav.settings',
      items: [
        { icon: Key, labelKey: 'nav.2fa', href: '/settings/2fa', roles: ['employee', 'agent', 'manager', 'admin'] },
      ],
      roles: ['employee', 'agent', 'manager', 'admin'],
    },
  ];

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isItemVisible = (item: NavItem | NavGroup): boolean => {
    if ('items' in item) {
      return item.roles ? role && item.roles.includes(role) : true;
    } else {
      return role && item.roles.includes(role);
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return t('role.admin');
      case 'manager': return t('role.manager');
      case 'agent': return t('role.agent');
      case 'employee': return t('role.employee');
      default: return '';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderNavItem = (item: NavItem, index: number, isSubItem = false) => (
    <motion.div
      key={item.href}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ x: 4 }}
    >
      <Link
        to={item.href}
        title={collapsed ? t(item.labelKey) : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
          collapsed && 'justify-center px-2',
          location.pathname === item.href
            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
            : cn('text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground', 
                 isSubItem && 'text-sidebar-foreground/50 font-normal')
        )}
      >
        <item.icon className={cn("h-5 w-5 shrink-0", isSubItem && "h-4 w-4")} />
        {!collapsed && <span className={cn(isSubItem && "text-xs")}>{t(item.labelKey)}</span>}
      </Link>
    </motion.div>
  );

  const renderNavGroup = (group: NavGroup, index: number) => {
    const isOpen = openGroups[group.labelKey] || false;
    return (
      <motion.div
        key={group.labelKey}
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: index * 0.05 }}
      >
        <button
          onClick={() => toggleGroup(group.labelKey)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 w-full text-left',
            collapsed && 'justify-center px-2',
            isOpen && !collapsed ? 'bg-sidebar-accent/20 text-sidebar-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            !collapsed && 'justify-between'
          )}
          title={collapsed ? t(group.labelKey) : undefined}
        >
          <div className="flex items-center gap-3">
            <group.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{t(group.labelKey)}</span>}
          </div>
          {!collapsed && (
            isOpen ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />
          )}
        </button>
        {isOpen && !collapsed && (
          <div className="ml-6 mt-1 space-y-1 border-l border-sidebar-border/50 pl-2">
            {group.items.filter(item => isItemVisible(item)).map((item, subIndex) => renderNavItem(item, subIndex))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        'flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-[84px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('p-4', collapsed && 'px-3')}>
        <div className={cn('flex items-center gap-2', collapsed ? 'justify-center' : 'justify-between')}>
          <Link to="/dashboard" className={cn('flex items-center gap-3 min-w-0', collapsed && 'justify-center')}>
            <img src={logo} alt="Qazaq Generation" className="h-12 w-auto shrink-0" />
            {!collapsed && <div className="min-w-0">
              <h1 className="font-bold text-sidebar-foreground truncate">Qazaq Generation</h1>
              <p className="text-xs text-sidebar-foreground/60">ITSM & Service Desk</p>
            </div>}
          </Link>
          {onToggleCollapse && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden lg:flex shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              title={collapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar')}
              onClick={onToggleCollapse}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navStructure.filter(item => isItemVisible(item)).map((item, index) => {
            if ('items' in item) {
              return renderNavGroup(item, index);
            } else {
              return renderNavItem(item, index);
            }
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* User section */}
      <div className={cn('p-4', collapsed && 'px-2')}>
        <motion.div 
          className={cn(
            'flex items-center gap-3 mb-3 p-2 rounded-lg cursor-pointer hover:bg-sidebar-accent/30 transition-colors',
            collapsed && 'justify-center'
          )}
          onClick={() => navigate('/profile')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title={collapsed ? t('nav.profile') : undefined}
        >
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm font-bold">
              {getInitials(profile?.name || 'U')}
            </AvatarFallback>
          </Avatar>
          {!collapsed && <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.name || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {getRoleLabel()}
            </p>
          </div>}
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="ghost"
            title={collapsed ? t('nav.logout') : undefined}
            className={cn(
              'w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50',
              collapsed ? 'justify-center' : 'justify-start'
            )}
            onClick={signOut}
          >
            <LogOut className={cn('h-4 w-4', !collapsed && 'mr-2')} />
            {!collapsed && t('nav.logout')}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

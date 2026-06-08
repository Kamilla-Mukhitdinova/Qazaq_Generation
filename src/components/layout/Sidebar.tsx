import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import {
  LayoutDashboard,
  Ticket,
  Users,
  AppWindow,
  BadgeCheck,
  BarChart3,
  Box,
  Boxes,
  Cable,
  AlarmClock,
  CalendarClock,
  Calculator,
  Car,
  MessageSquare,
  LogOut,
  Key,
  KeyRound,
  User,
  BellRing,
  Blocks,
  Bookmark,
  BriefcaseBusiness,
  CalendarCheck,
  CloudDownload,
  Computer,
  Contact,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Handshake,
  Map,
  MapPin,
  Monitor,
  Network,
  Package,
  Phone,
  PhoneCall,
  Plug,
  Printer,
  Router,
  Rss,
  Server,
  Smartphone,
  MessagesSquare,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Component,
  FilePenLine,
  FileBadge,
  FileText,
  Fingerprint,
  Inbox,
  Layers,
  Link as LinkIcon,
  ListTodo,
  LogIn,
  Logs,
  NotebookTabs,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  ChevronDown,
  ChevronRight,
  PieChart,
  Plus,
  Puzzle,
  Settings,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  StickyNote,
  Tags,
  TriangleAlert,
  UserCog,
  UserRound,
  UsersRound,
  Video,
  Warehouse,
  Workflow,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logo from '@/assets/logo.png';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { PointerEvent } from 'react';
import { useQuery } from '@tanstack/react-query';

const SIDEBAR_MIN_WIDTH = 248;
const SIDEBAR_MAX_WIDTH = 320;
const SIDEBAR_DEFAULT_WIDTH = 280;
const ALL_ROLES = ['employee', 'agent', 'manager', 'admin'];
const EMPLOYEE_ROLES = ['employee'];
const STAFF_ROLES = ['agent', 'manager', 'admin'];
const MANAGER_ROLES = ['manager', 'admin'];
const ADMIN_ROLES = ['admin'];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  icon: LucideIcon;
  labelKey: string;
  href: string;
  roles: string[];
}

interface NavGroup {
  icon: LucideIcon;
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
  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
    enabled: role === 'agent',
  });
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return SIDEBAR_DEFAULT_WIDTH;

    const savedWidth = Number(localStorage.getItem('qg-sidebar-width'));
    if (!Number.isFinite(savedWidth)) return SIDEBAR_DEFAULT_WIDTH;

    return Math.min(Math.max(savedWidth, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
  });
  const isResizable = Boolean(onToggleCollapse);

  const navStructure: NavStructure = [
    { icon: LayoutDashboard, labelKey: 'nav.dashboard', href: '/dashboard', roles: STAFF_ROLES },
    {
      icon: Package,
      labelKey: 'nav.assets',
      items: [
        { icon: LayoutDashboard, labelKey: 'nav.assets.panel', href: '/assets?section=panel', roles: MANAGER_ROLES },
        { icon: Computer, labelKey: 'nav.assets.computers', href: '/assets?section=computers', roles: MANAGER_ROLES },
        { icon: Monitor, labelKey: 'nav.assets.monitors', href: '/assets?section=monitors', roles: MANAGER_ROLES },
        { icon: AppWindow, labelKey: 'nav.assets.software', href: '/assets?section=software', roles: MANAGER_ROLES },
        { icon: Network, labelKey: 'nav.assets.networkDevices', href: '/assets?section=network-devices', roles: MANAGER_ROLES },
        { icon: Cpu, labelKey: 'nav.assets.devices', href: '/assets?section=devices', roles: MANAGER_ROLES },
        { icon: Printer, labelKey: 'nav.assets.printers', href: '/assets?section=printers', roles: MANAGER_ROLES },
        { icon: HardDrive, labelKey: 'nav.assets.cartridges', href: '/assets?section=cartridges', roles: MANAGER_ROLES },
        { icon: Boxes, labelKey: 'nav.assets.consumables', href: '/assets?section=consumables', roles: MANAGER_ROLES },
        { icon: Phone, labelKey: 'nav.assets.phones', href: '/assets?section=phones', roles: MANAGER_ROLES },
        { icon: Server, labelKey: 'nav.assets.racks', href: '/assets?section=racks', roles: MANAGER_ROLES },
        { icon: Box, labelKey: 'nav.assets.cases', href: '/assets?section=cases', roles: MANAGER_ROLES },
        { icon: Plug, labelKey: 'nav.assets.powerDistribution', href: '/assets?section=power-distribution', roles: MANAGER_ROLES },
        { icon: Router, labelKey: 'nav.assets.passiveDevices', href: '/assets?section=passive-devices', roles: MANAGER_ROLES },
        { icon: Package, labelKey: 'nav.assets.unmanagedAssets', href: '/assets?section=unmanaged-assets', roles: MANAGER_ROLES },
        { icon: Cable, labelKey: 'nav.assets.cables', href: '/assets?section=cables', roles: MANAGER_ROLES },
        { icon: Smartphone, labelKey: 'nav.assets.simCards', href: '/assets?section=sim-cards', roles: MANAGER_ROLES },
        { icon: ShieldCheck, labelKey: 'nav.assets.vpn', href: '/assets?section=vpn', roles: MANAGER_ROLES },
        { icon: BarChart3, labelKey: 'nav.assets.reportAnalytics', href: '/assets?section=report-analytics', roles: MANAGER_ROLES },
        { icon: Globe, labelKey: 'nav.assets.global', href: '/assets?section=global', roles: MANAGER_ROLES },
      ],
      roles: MANAGER_ROLES,
    },
    {
      icon: Ticket,
      labelKey: 'nav.support',
      items: [
        { icon: Ticket, labelKey: 'nav.tickets', href: '/tickets', roles: ALL_ROLES },
        { icon: Plus, labelKey: 'nav.support.createTicket', href: '/tickets/new', roles: ALL_ROLES },
        { icon: ClipboardCheck, labelKey: 'nav.support.ppr', href: '/ppr', roles: MANAGER_ROLES },
        { icon: TriangleAlert, labelKey: 'nav.support.problems', href: '/tickets?type=problems', roles: MANAGER_ROLES },
        { icon: ClipboardList, labelKey: 'nav.support.changes', href: '/tickets?type=changes', roles: MANAGER_ROLES },
        { icon: CalendarClock, labelKey: 'nav.support.planning', href: '/tickets?type=planning', roles: MANAGER_ROLES },
        { icon: PieChart, labelKey: 'nav.support.statistics', href: '/reports?section=support-statistics', roles: MANAGER_ROLES },
        { icon: AlarmClock, labelKey: 'nav.support.periodicTickets', href: '/tickets?type=periodic', roles: MANAGER_ROLES },
      ],
      roles: ALL_ROLES,
    },
    {
      icon: BarChart3,
      labelKey: 'nav.management',
      items: [
        { icon: KeyRound, labelKey: 'nav.management.licenses', href: '/assets?section=licenses', roles: MANAGER_ROLES },
        { icon: Calculator, labelKey: 'nav.management.budgets', href: '/assets?section=budgets', roles: MANAGER_ROLES },
        { icon: Handshake, labelKey: 'nav.management.suppliers', href: '/assets?section=suppliers', roles: MANAGER_ROLES },
        { icon: Contact, labelKey: 'nav.management.contacts', href: '/assets?section=contacts', roles: MANAGER_ROLES },
        { icon: FileBadge, labelKey: 'nav.management.contracts', href: '/assets?section=contracts', roles: MANAGER_ROLES },
        { icon: PhoneCall, labelKey: 'nav.management.phoneLines', href: '/assets?section=phone-lines', roles: MANAGER_ROLES },
        { icon: BadgeCheck, labelKey: 'nav.management.certificates', href: '/assets?section=certificates', roles: MANAGER_ROLES },
        { icon: Warehouse, labelKey: 'nav.management.dataCenters', href: '/assets?section=data-centers', roles: MANAGER_ROLES },
        { icon: Network, labelKey: 'nav.management.clusters', href: '/assets?section=clusters', roles: MANAGER_ROLES },
        { icon: Globe, labelKey: 'nav.management.domains', href: '/assets?section=domains', roles: MANAGER_ROLES },
        { icon: Blocks, labelKey: 'nav.management.complexes', href: '/assets?section=complexes', roles: MANAGER_ROLES },
        { icon: Database, labelKey: 'nav.management.databases', href: '/assets?section=databases', roles: MANAGER_ROLES },
      ],
      roles: MANAGER_ROLES,
    },
    {
      icon: Wrench,
      labelKey: 'nav.tools',
      items: [
        { icon: BriefcaseBusiness, labelKey: 'nav.tools.projects', href: '/assets?section=projects', roles: MANAGER_ROLES },
        { icon: StickyNote, labelKey: 'nav.tools.reminders', href: '/assets?section=reminders', roles: MANAGER_ROLES },
        { icon: Rss, labelKey: 'nav.tools.rssFeed', href: '/assets?section=rss-feed', roles: MANAGER_ROLES },
        { icon: CalendarCheck, labelKey: 'nav.tools.bookings', href: '/assets?section=bookings', roles: MANAGER_ROLES },
        { icon: ClipboardCheck, labelKey: 'nav.tools.reports', href: '/reports/manage', roles: MANAGER_ROLES },
        { icon: BadgeCheck, labelKey: 'nav.tools.performance', href: '/performance', roles: MANAGER_ROLES },
        { icon: Bookmark, labelKey: 'nav.tools.savedSearches', href: '/assets?section=saved-searches', roles: MANAGER_ROLES },
        { icon: Map, labelKey: 'nav.tools.cartography', href: '/assets?section=cartography', roles: MANAGER_ROLES },
        { icon: PieChart, labelKey: 'nav.tools.detailedReports', href: '/reports', roles: MANAGER_ROLES },
        { icon: MapPin, labelKey: 'nav.tools.ipAddressing', href: '/assets?section=ip-addressing', roles: MANAGER_ROLES },
      ],
      roles: MANAGER_ROLES,
    },
    {
      icon: Users,
      labelKey: 'nav.administration',
      items: [
        { icon: UserRound, labelKey: 'nav.users', href: '/admin/users', roles: ADMIN_ROLES },
        { icon: UsersRound, labelKey: 'nav.administration.groups', href: '/admin/groups', roles: ADMIN_ROLES },
        { icon: Layers, labelKey: 'nav.administration.organizations', href: '/admin/organizations', roles: ADMIN_ROLES },
        { icon: BookOpen, labelKey: 'nav.administration.rules', href: '/admin/rules', roles: ADMIN_ROLES },
        { icon: NotebookTabs, labelKey: 'nav.administration.directories', href: '/admin/directories', roles: ADMIN_ROLES },
        { icon: UserCog, labelKey: 'nav.administration.profiles', href: '/admin/profiles', roles: ADMIN_ROLES },
        { icon: ListTodo, labelKey: 'nav.administration.notificationQueue', href: '/admin/notification-queue', roles: ADMIN_ROLES },
        { icon: Logs, labelKey: 'nav.administration.logs', href: '/admin/logs', roles: ADMIN_ROLES },
        { icon: CloudDownload, labelKey: 'nav.administration.equipment', href: '/admin/equipment', roles: ADMIN_ROLES },
        { icon: Settings2, labelKey: 'nav.administration.glpiInventory', href: '/admin/glpi-inventory', roles: ADMIN_ROLES },
        { icon: FilePenLine, labelKey: 'nav.administration.forms', href: '/admin/forms', roles: ADMIN_ROLES },
      ],
      roles: ADMIN_ROLES,
    },
    { icon: BookOpen, labelKey: 'nav.tools.knowledgeBase', href: '/knowledge', roles: STAFF_ROLES },
    { icon: MessagesSquare, labelKey: 'nav.messages', href: '/chat', roles: STAFF_ROLES },
    { icon: FileText, labelKey: 'nav.management.documents', href: '/documents', roles: STAFF_ROLES },
    { icon: Video, labelKey: 'nav.videoConferences', href: '/meetings', roles: STAFF_ROLES },
    { icon: MessageSquare, labelKey: 'nav.aiChat', href: '/ai-chat', roles: STAFF_ROLES },
    { icon: BellRing, labelKey: 'nav.notifications', href: '/notifications', roles: STAFF_ROLES },
    {
      icon: Settings,
      labelKey: 'nav.settings',
      items: [
        { icon: BellRing, labelKey: 'nav.settings.notifications', href: '/settings/notifications', roles: STAFF_ROLES },
        { icon: LogIn, labelKey: 'nav.settings.authentication', href: '/settings/authentication', roles: ALL_ROLES },
      ],
      roles: STAFF_ROLES,
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

  const getAgentPositionLabel = () => {
    const groupId = profile?.group_id;
    const group = groups.find((item: any) => (item.id || item.groupId) === groupId);
    const groupName = String(group?.name || '').toLowerCase();

    if (groupName.includes('1 линия') || groupName.includes('1-линия') || groupName.includes('перв')) {
      return t('dashboard.employeeKpi.position.firstLine');
    }
    if (groupName.includes('2 линия') || groupName.includes('2-линия') || groupName.includes('втор')) {
      return t('dashboard.employeeKpi.position.secondLine');
    }
    if (groupName.includes('3 линия') || groupName.includes('3-линия') || groupName.includes('трет')) {
      return t('dashboard.employeeKpi.position.thirdLine');
    }

    return '';
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return t('role.admin');
      case 'manager': return t('role.manager');
      case 'agent': return getAgentPositionLabel() || t('role.agent');
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

  const getItemPath = (href: string) => href.split('?')[0];

  const isItemActive = (item: NavItem) => {
    const currentHref = `${location.pathname}${location.search}`;
    return item.href.includes('?') ? currentHref === item.href : location.pathname === getItemPath(item.href);
  };

  const handleResizeStart = (event: PointerEvent<HTMLButtonElement>) => {
    if (collapsed || !isResizable) return;

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const nextWidth = Math.min(
        Math.max(startWidth + moveEvent.clientX - startX, SIDEBAR_MIN_WIDTH),
        SIDEBAR_MAX_WIDTH
      );

      setSidebarWidth(nextWidth);
      localStorage.setItem('qg-sidebar-width', String(nextWidth));
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const renderNavItem = (item: NavItem, index: number, isSubItem = false) => {
    const active = isItemActive(item);

    return (
      <motion.div
        key={item.href}
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: index * 0.03 }}
        whileHover={{ x: isSubItem ? 3 : 4 }}
      >
        <Link
          to={item.href}
          title={collapsed ? t(item.labelKey) : undefined}
          className={cn(
            'group/nav-item relative flex w-full min-w-0 gap-2.5 rounded-2xl text-sm font-medium transition-all duration-300 ease-out',
            isSubItem ? 'items-start' : 'items-center',
            isSubItem ? 'px-2.5 py-1.5' : 'px-3 py-2',
            collapsed && 'justify-center px-2 py-2',
            active
              ? 'border-l-[3px] border-l-blue-500 bg-gradient-to-r from-blue-500/20 via-sidebar-accent/85 to-sidebar-accent/35 text-sidebar-accent-foreground shadow-[0_2px_10px_rgba(59,130,246,0.16)] backdrop-blur-md'
              : cn(
                  'border-l-[3px] border-l-transparent bg-transparent text-sidebar-foreground/68 hover:bg-sidebar-accent/45 hover:text-sidebar-foreground hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:backdrop-blur-sm',
                  isSubItem && 'text-sidebar-foreground/58 font-normal'
                )
          )}
        >
          <item.icon
            strokeWidth={1.8}
            className={cn(
              'shrink-0 transition-all duration-300 ease-out group-hover/nav-item:scale-110',
              active ? 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.35)]' : 'text-current',
              isSubItem ? 'mt-0.5 h-4 w-4' : 'h-5 w-5'
            )}
          />
          {!collapsed && (
            <span className={cn('min-w-0 flex-1 whitespace-normal break-words leading-5', isSubItem && 'text-xs')}>
              {t(item.labelKey)}
            </span>
          )}
        </Link>
      </motion.div>
    );
  };

  const renderNavGroup = (group: NavGroup, index: number) => {
    const isGroupActive = group.items.some((item) => isItemActive(item));
    const isOpen = openGroups[group.labelKey] ?? isGroupActive;
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
            'group/nav-group flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-medium transition-all duration-300 ease-out',
            collapsed && 'justify-center px-2',
            isOpen && !collapsed
              ? 'bg-sidebar-accent/25 text-sidebar-foreground shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-sm'
              : 'bg-transparent text-sidebar-foreground/72 hover:bg-sidebar-accent/45 hover:text-sidebar-foreground hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
            !collapsed && 'justify-between'
          )}
          title={collapsed ? t(group.labelKey) : undefined}
        >
          <div className="flex items-center gap-3">
            <group.icon strokeWidth={1.8} className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover/nav-group:scale-110" />
            {!collapsed && <span>{t(group.labelKey)}</span>}
          </div>
          {!collapsed && (
            isOpen ? <ChevronDown strokeWidth={1.8} className="h-4 w-4 opacity-50 transition-transform duration-300" /> : <ChevronRight strokeWidth={1.8} className="h-4 w-4 opacity-50 transition-transform duration-300" />
          )}
        </button>
        <AnimatePresence initial={false}>
          {isOpen && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -4 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="ml-4 mt-1.5 space-y-0.5 border-l border-sidebar-border/35 pl-2">
                {group.items.filter(item => isItemVisible(item)).map((item, subIndex) => renderNavItem(item, subIndex, true))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      style={!collapsed && isResizable ? { width: sidebarWidth } : undefined}
      className={cn(
        'relative flex h-full flex-col border-r border-sidebar-border/70 bg-sidebar shadow-[8px_0_24px_rgba(15,23,42,0.04)] transition-all duration-300',
        collapsed ? 'w-[84px]' : isResizable ? 'shrink-0' : 'w-64'
      )}
    >
      {!collapsed && isResizable && (
        <button
          type="button"
          aria-label="Изменить ширину бокового меню"
          onPointerDown={handleResizeStart}
          className="absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize bg-transparent transition-colors hover:bg-primary/20 active:bg-primary/30"
        />
      )}

      {/* Logo */}
      <div className={cn('p-4', collapsed && 'px-3')}>
        <div className={cn('flex items-center gap-2', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
              <img src={logo} alt="Qazaq Generation" className="h-12 w-auto shrink-0" />
              <div className="min-w-0">
                <h1 className="font-bold text-sidebar-foreground truncate">Qazaq Generation</h1>
                <p className="text-xs text-sidebar-foreground/60">ITSM & Service Desk</p>
              </div>
            </Link>
          )}
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
      <ScrollArea className="min-h-0 flex-1 px-3 py-4">
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

      <Separator className="shrink-0 bg-sidebar-border" />

      {/* User section */}
      <div className={cn('shrink-0 bg-sidebar/95 p-4', collapsed && 'px-2')}>
        <motion.div 
          className={cn(
            'flex items-center gap-3 mb-3 p-2 rounded-lg transition-colors',
            role === 'employee' ? 'cursor-default' : 'cursor-pointer hover:bg-sidebar-accent/30',
            collapsed && 'justify-center'
          )}
          onClick={() => {
            if (role !== 'employee') navigate('/profile');
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title={collapsed && role !== 'employee' ? t('nav.profile') : undefined}
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

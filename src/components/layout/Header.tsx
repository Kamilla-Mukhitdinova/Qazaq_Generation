import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Plus, Menu, MessageSquare, Check, Loader2, FileText, Box, BookOpen, Users, Calendar, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { enUS, kk, ru } from 'date-fns/locale';
import { getDisplayTicketTitle } from '@/lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  payload_json: any;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  href: string;
  type: 'page' | 'ticket' | 'asset' | 'kb' | 'ppr' | 'report' | 'user' | 'meeting' | 'document';
}

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key] as T;
  }
  return undefined;
};

export default function Header({ onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenUnreadIdsRef = useRef<Set<string> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const navigate = useNavigate();
  const { role } = useAuth();
  const { t, language } = useLanguage();
  const isEmployee = role === 'employee';

  const dateLocale = language === 'ru' ? ru : language === 'en' ? enUS : kk;

  const pageResults: SearchResult[] = [
    { id: 'page-dashboard', title: 'Главная', description: 'Дашборд, KPI, аналитика и быстрые действия', href: '/dashboard', type: 'page' },
    { id: 'page-tickets', title: 'Заявки', description: 'Список заявок, статусы, приоритеты и исполнители', href: '/tickets', type: 'page' },
    { id: 'page-new-ticket', title: 'Создание заявки', description: 'Создать новую заявку в поддержку', href: '/tickets/new', type: 'page' },
    { id: 'page-assets', title: 'Активы', description: 'Оборудование, устройства, ПО и инвентаризация', href: '/assets', type: 'page' },
    { id: 'page-ppr', title: 'ППР', description: 'Планово-предупредительные работы и согласование', href: '/ppr', type: 'page' },
    { id: 'page-knowledge', title: 'База знаний', description: 'Инструкции, статьи и решения типовых проблем', href: '/knowledge', type: 'page' },
    { id: 'page-documents', title: 'Документы и отчетность', description: 'Документы, отчеты, отправка в мессенджер', href: '/documents', type: 'page' },
    { id: 'page-meetings', title: 'Видеоконференции', description: 'Планирование конференций и встречи', href: '/meetings', type: 'page' },
    { id: 'page-chat', title: 'Сообщения', description: 'Внутренний мессенджер', href: '/chat', type: 'page' },
    { id: 'page-ai-chat', title: 'AI чат', description: 'AI ассистент и анализ заявок', href: '/ai-chat', type: 'page' },
    { id: 'page-notifications', title: 'Уведомления', description: 'Системные уведомления и события', href: '/notifications', type: 'page' },
    { id: 'page-performance', title: 'KPI сотрудников', description: 'Производительность сотрудников и линии поддержки', href: '/performance', type: 'page' },
  ];

  const searchIconMap = {
    page: Search,
    ticket: ClipboardList,
    asset: Box,
    kb: BookOpen,
    ppr: ClipboardList,
    report: FileText,
    user: Users,
    meeting: Calendar,
    document: FileText,
  } satisfies Record<SearchResult['type'], typeof Search>;

  const formatNotificationTime = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale });
  };

  const getAudioContext = useCallback(() => {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return null;

    const context = audioContextRef.current || new AudioContextCtor();
    audioContextRef.current = context;
    return context;
  }, []);

  const unlockNotificationSound = useCallback(() => {
    void (async () => {
      try {
        const context = getAudioContext();
        if (!context) return;
        if (context.state === 'suspended') {
          await context.resume();
        }
      } catch {
        // Browsers can keep audio locked until a real user gesture.
      }
    })();
  }, [getAudioContext]);

  const playNotificationSound = useCallback(() => {
    void (async () => {
      try {
        const context = getAudioContext();
        if (!context) return;

        if (context.state === 'suspended') {
          await context.resume();
        }

        if (context.state !== 'running') return;

        const start = context.currentTime + 0.01;
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, start);
        oscillator.frequency.setValueAtTime(1174.66, start + 0.13);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.34);
      } catch {
        // Browsers can block audio until the user interacts with the page.
      }
    })();
  }, [getAudioContext]);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      const items = (data || []).map((n: any) => ({
        ...n,
        is_read: n.is_read ?? n.isRead ?? false,
        created_at: n.created_at ?? n.createdAt,
        payload_json: n.payload_json ?? n.payloadJson,
      }));
      const unreadItems = items.filter((n: Notification) => !n.is_read);
      const nextUnreadIds = new Set(unreadItems.map((n: Notification) => n.id));
      const seenUnreadIds = seenUnreadIdsRef.current;

      if (seenUnreadIds && unreadItems.some((n: Notification) => !seenUnreadIds.has(n.id))) {
        playNotificationSound();
      }

      seenUnreadIdsRef.current = nextUnreadIds;
      setNotifications(items.slice(0, 20));
      setUnreadCount(unreadItems.length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [playNotificationSound]);

  useEffect(() => {
    const unlock = () => unlockNotificationSound();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [unlockNotificationSound]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const normalizedQuery = query.toLowerCase();
      const matchesText = (...values: Array<string | null | undefined>) =>
        values.some(value => value?.toLowerCase().includes(normalizedQuery));

      const staticResults = pageResults.filter(item => matchesText(item.title, item.description)).slice(0, 5);

      const [
        ticketsResult,
        assetsResult,
        kbResult,
        pprResult,
        reportsResult,
        profilesResult,
        meetingsResult,
        receivedDocsResult,
        sentDocsResult,
      ] = await Promise.allSettled([
        api.getTickets({ search: query, limit: '5' }),
        api.getAssets({ search: query, limit: '5' }),
        api.getKBArticles({ search: query }),
        api.getPPRPlans(),
        api.getReports(),
        api.getProfiles(),
        api.getMeetings(),
        api.getReceivedDocuments(),
        api.getSentDocuments(),
      ]);

      if (!active) return;

      const tickets = ticketsResult.status === 'fulfilled' ? ticketsResult.value.data || [] : [];
      const assets = assetsResult.status === 'fulfilled' ? assetsResult.value.data || [] : [];
      const kbArticles = kbResult.status === 'fulfilled' ? kbResult.value || [] : [];
      const pprPlans = pprResult.status === 'fulfilled' ? pprResult.value || [] : [];
      const reports = reportsResult.status === 'fulfilled' ? reportsResult.value || [] : [];
      const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value || [] : [];
      const meetings = meetingsResult.status === 'fulfilled' ? meetingsResult.value || [] : [];
      const receivedDocs = receivedDocsResult.status === 'fulfilled' ? receivedDocsResult.value || [] : [];
      const sentDocs = sentDocsResult.status === 'fulfilled' ? sentDocsResult.value || [] : [];

      const dataResults: SearchResult[] = [
        ...tickets.slice(0, 5).map((ticket: any) => ({
          id: `ticket-${ticket.id}`,
          title: getDisplayTicketTitle(ticket.title),
          description: `Заявка · ${ticket.status || ''} · ${ticket.priority || ''}`,
          href: `/tickets/${ticket.id}`,
          type: 'ticket' as const,
        })),
        ...assets.slice(0, 5).map((asset: any) => ({
          id: `asset-${asset.id}`,
          title: asset.name,
          description: `Актив · ${asset.inventory_number || asset.inventoryNumber || asset.serial_number || asset.serialNumber || asset.asset_type || asset.assetType || ''}`,
          href: `/assets?search=${encodeURIComponent(query)}`,
          type: 'asset' as const,
        })),
        ...kbArticles.slice(0, 5).map((article: any) => ({
          id: `kb-${article.id}`,
          title: article.title,
          description: article.short_description || article.shortDescription || 'Статья базы знаний',
          href: `/knowledge/${article.id}`,
          type: 'kb' as const,
        })),
        ...pprPlans
          .filter((plan: any) => matchesText(plan.title, plan.description, plan.equipment, plan.line))
          .slice(0, 4)
          .map((plan: any) => ({
            id: `ppr-${plan.id}`,
            title: plan.title,
            description: `ППР · линия ${plan.line || ''} · ${plan.status || ''}`,
            href: `/ppr?pprId=${encodeURIComponent(plan.id)}`,
            type: 'ppr' as const,
          })),
        ...reports
          .filter((report: any) => matchesText(report.title, report.content, report.period_month || report.periodMonth))
          .slice(0, 4)
          .map((report: any) => ({
            id: `report-${report.id}`,
            title: report.title,
            description: `Отчет · ${report.period_month || report.periodMonth || ''}`,
            href: '/reports/manage',
            type: 'report' as const,
          })),
        ...profiles
          .filter((profile: any) => matchesText(profile.name, profile.email))
          .slice(0, 4)
          .map((profile: any) => ({
            id: `profile-${pick<string>(profile, 'user_id', 'userId') || profile.id}`,
            title: profile.name,
            description: `Пользователь · ${profile.email || ''}`,
            href: '/admin/users',
            type: 'user' as const,
          })),
        ...meetings
          .filter((meeting: any) => matchesText(meeting.title, meeting.description))
          .slice(0, 4)
          .map((meeting: any) => ({
            id: `meeting-${meeting.id}`,
            title: meeting.title,
            description: `Видеоконференция · ${meeting.scheduled_at || meeting.scheduledAt || ''}`,
            href: '/meetings',
            type: 'meeting' as const,
          })),
        ...[...receivedDocs, ...sentDocs]
          .filter((doc: any) => matchesText(doc.file_name || doc.fileName, doc.message))
          .slice(0, 4)
          .map((doc: any) => ({
            id: `doc-${doc.id}`,
            title: doc.file_name || doc.fileName || 'Документ',
            description: doc.message || 'Документ и отчетность',
            href: '/documents',
            type: 'document' as const,
          })),
      ];

      setSearchResults([...staticResults, ...dataResults].slice(0, 12));
      setSearching(false);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) handleMarkRead(n.id);
    const payload = n.payload_json || {};
    const ticketId = payload.ticketId;
    const pprPlanId = payload.pprPlanId;
    const meetingLink = payload.meetingLink;
    if (ticketId) navigate(`/tickets/${ticketId}`);
    if (pprPlanId) navigate(`/ppr?pprId=${encodeURIComponent(pprPlanId)}`);
    if (meetingLink) window.location.href = meetingLink;
  };

  const typeIcons: Record<string, string> = {
    ticket_status_changed: '🔄',
    ticket_assigned: '👤',
    ticket_comment: '💬',
    sla_breach: '⚠️',
    meeting_invite: '📅',
    ppr_signer_added: '🔔',
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults[0]) {
      navigate(searchResults[0].href);
      setSearchOpen(false);
      return;
    }
    if (searchQuery.trim()) {
      navigate(`/tickets?search=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
    }
  };

  const handleSearchResultClick = (result: SearchResult) => {
    navigate(result.href);
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  return (
    <motion.header 
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 flex items-center justify-between gap-4"
    >
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      {!isEmployee && (
      <form onSubmit={handleSearch} className="relative flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по всему сайту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
            className="pl-10 bg-muted/50"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        {searchOpen && searchQuery.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-lg border bg-popover shadow-lg">
            {searching ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Поиск...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">Ничего не найдено</div>
            ) : (
              <div className="max-h-96 overflow-auto py-1">
                {searchResults.map((result) => {
                  const Icon = searchIconMap[result.type];
                  return (
                    <button
                      key={result.id}
                      type="button"
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSearchResultClick(result)}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{result.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{result.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </form>
      )}

      <div className="flex items-center gap-1 md:gap-2">
        {!isEmployee && (
          <>
            <LanguageSelector />
            <ThemeToggle />
          </>
        )}

        {(role === 'agent' || role === 'manager' || role === 'admin') && (
          <Button variant="ghost" size="icon" onClick={() => navigate('/ai-chat')} className="hidden md:flex">
            <MessageSquare className="h-5 w-5" />
          </Button>
        )}

        <Button onClick={() => navigate('/tickets/new')} size="sm" className="hidden md:flex">
          <Plus className="h-4 w-4 mr-2" />
          {t('ticket.new')}
        </Button>
        <Button onClick={() => navigate('/tickets/new')} size="icon" className="md:hidden">
          <Plus className="h-5 w-5" />
        </Button>

        {!isEmployee && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96">
            <div className="flex items-center justify-between px-2">
              <DropdownMenuLabel>{t('common.notifications')}</DropdownMenuLabel>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleMarkAllRead}>
                  <Check className="h-3 w-3 mr-1" />{t('common.markAllRead')}
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {t('common.noNotifications')}
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className={`flex flex-col items-start gap-1 cursor-pointer px-3 py-3 ${!n.is_read ? 'bg-primary/5' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="flex items-start gap-2 w-full">
                      <span className="text-base mt-0.5">{typeIcons[n.type] || '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatNotificationTime(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>
    </motion.header>
  );
}

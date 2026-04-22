import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import { Bell, CheckCheck, AlertTriangle, UserPlus, MessageSquare, RefreshCw, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function NotificationsList() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const typeConfig: Record<string, { icon: typeof Bell; labelKey: string; color: string }> = {
    ticket_status_changed: { icon: RefreshCw, labelKey: 'notifList.statusChanged', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    ticket_assigned: { icon: UserPlus, labelKey: 'notifList.assigned', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    ticket_comment: { icon: MessageSquare, labelKey: 'notifList.newComment', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    sla_breach: { icon: AlertTriangle, labelKey: 'notifList.slaBreach', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try { setNotifications(await api.getNotifications() || []); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [filter]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try { await api.markAllNotificationsRead(); setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); } catch (err) { console.error(err); }
  };

  const handleMarkRead = async (id: string) => {
    try { await api.markNotificationRead(id); setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n)); } catch (err) { console.error(err); }
  };

  const handleClick = (n: any) => {
    if (!n.is_read) handleMarkRead(n.id);
    const ticketId = n.payload_json?.ticketId;
    if (ticketId) navigate(`/tickets/${ticketId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('notifList.title')}</h1>
          {unreadCount > 0 && <p className="text-sm text-muted-foreground mt-1">{unreadCount} {t('notifList.unread')}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('notifList.allTypes')}</SelectItem>
              {Object.entries(typeConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{t(cfg.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}><CheckCheck className="h-4 w-4 mr-2" />{t('notifList.markAllRead')}</Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">{t('common.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Bell className="h-10 w-10 opacity-30" />
              <p>{t('notifList.noNotifications')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paginated.map(n => {
                const cfg = typeConfig[n.type] || { icon: Bell, labelKey: n.type, color: 'bg-muted text-muted-foreground' };
                const Icon = cfg.icon;
                return (
                  <div key={n.id} onClick={() => handleClick(n)} className={`flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-muted/50 ${!n.is_read ? 'bg-primary/5' : ''}`}>
                    <div className={`mt-0.5 p-2 rounded-lg ${cfg.color}`}><Icon className="h-4 w-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!n.is_read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>{n.title}</p>
                        {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      {n.message && <p className="text-sm text-muted-foreground mt-0.5 truncate">{n.message}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{t(cfg.labelKey)}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), 'dd.MM.yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && filtered.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} {t('notifList.notifications')}</p>
          <Pagination>
            <PaginationContent>
              <PaginationItem><PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                  if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(page); return acc;
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? <PaginationItem key={`e-${idx}`}><PaginationEllipsis /></PaginationItem> :
                  <PaginationItem key={item}><PaginationLink isActive={currentPage === item} onClick={() => setCurrentPage(item as number)} className="cursor-pointer">{item}</PaginationLink></PaginationItem>
                )}
              <PaginationItem><PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

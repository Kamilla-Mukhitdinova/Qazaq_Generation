import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDisplayTicketTitle } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock3, Search, Plus, Loader2, Ticket, Trash2, UserRound } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

type TicketStatus = 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

interface TicketRow {
  id: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  requester_id: string;
  assignee_id: string | null;
  requester_name?: string;
  assignee_name?: string;
  category_name?: string;
}

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 100 } },
  exit: { opacity: 0, x: 20 }
};

export default function TicketsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { role } = useAuth();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const canDeleteTickets = role === 'admin' || role === 'manager';

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;

      const result = await api.getTickets(params);
      const ticketsData = result.data || [];

      if (ticketsData.length > 0) {
        const [profiles, categories] = await Promise.all([
          api.getProfiles(),
          api.getCategories(),
        ]);

        const profileMap = new Map((profiles || []).map((p: any) => [
          pick<string>(p, 'user_id', 'userId') || '',
          p.name,
        ]));
        const categoryMap = new Map((categories || []).map((c: any) => [c.id, c.name]));

        setTickets(ticketsData.map((ticket: any) => {
          const requesterId = pick<string>(ticket, 'requester_id', 'requesterId') || '';
          const assigneeId = pick<string | null>(ticket, 'assignee_id', 'assigneeId') || null;
          const categoryId = pick<string | null>(ticket, 'category_id', 'categoryId') || null;
          const createdAt = pick<string>(ticket, 'created_at', 'createdAt') || new Date().toISOString();
          return {
            id: ticket.id,
            title: ticket.title,
            status: ticket.status,
            priority: ticket.priority,
            created_at: createdAt,
            requester_id: requesterId,
            assignee_id: assigneeId,
            requester_name: profileMap.get(requesterId) || t('common.unknownUser'),
            assignee_name: assigneeId ? profileMap.get(assigneeId) || t('common.unknownUser') : undefined,
            category_name: categoryId ? categoryMap.get(categoryId) : undefined,
          };
        }));
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    !searchQuery ||
    ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.requester_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedCount = selectedIds.length;
  const visibleIds = filteredTickets.map(ticket => ticket.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
  const activeCount = tickets.filter(ticket => !['resolved', 'closed'].includes(ticket.status)).length;
  const highPriorityCount = tickets.filter(ticket => ['high', 'critical'].includes(ticket.priority)).length;
  const unassignedCount = tickets.filter(ticket => !ticket.assignee_id).length;
  const completedCount = tickets.filter(ticket => ['resolved', 'closed'].includes(ticket.status)).length;
  const ticketStats = [
    { label: t('ticket.list.stats.active'), value: activeCount, icon: Clock3, color: 'bg-blue-500/10 text-blue-600' },
    { label: t('ticket.list.stats.urgent'), value: highPriorityCount, icon: AlertCircle, color: 'bg-orange-500/10 text-orange-600' },
    { label: t('ticket.list.stats.unassigned'), value: unassignedCount, icon: UserRound, color: 'bg-purple-500/10 text-purple-600' },
    { label: t('ticket.list.stats.done'), value: completedCount, icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600' },
  ];

  const statusColors: Record<string, string> = {
    new: 'bg-blue-500/10 text-blue-500',
    assigned: 'bg-yellow-500/10 text-yellow-500',
    in_progress: 'bg-purple-500/10 text-purple-500',
    resolved: 'bg-green-500/10 text-green-500',
    closed: 'bg-muted text-muted-foreground',
    reopened: 'bg-red-500/10 text-red-500',
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-500/10 text-slate-500',
    medium: 'bg-blue-500/10 text-blue-500',
    high: 'bg-orange-500/10 text-orange-500',
    critical: 'bg-red-500/10 text-red-500',
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      new: t('ticket.status.new'), assigned: t('ticket.status.assigned'),
      in_progress: t('ticket.status.inProgress'), resolved: t('ticket.status.resolved'),
      closed: t('ticket.status.closed'), reopened: t('ticket.status.reopened'),
    };
    return statusMap[status] || status;
  };

  const getPriorityLabel = (priority: string) => t(`ticket.priority.${priority}`);

  const handleDeleteTicket = async (ticket: TicketRow) => {
    const confirmed = window.confirm(`Удалить заявку "${ticket.title}"? Это действие нельзя отменить.`);
    if (!confirmed) return;

    setDeletingId(ticket.id);
    try {
      await api.deleteTicket(ticket.id);
      setTickets(prev => prev.filter(item => item.id !== ticket.id));
      setSelectedIds(prev => prev.filter(id => id !== ticket.id));
      toast({ title: t('common.success'), description: 'Заявка удалена' });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleTicketSelection = (ticketId: string, checked: boolean) => {
    setSelectedIds(prev => checked
      ? Array.from(new Set([...prev, ticketId]))
      : prev.filter(id => id !== ticketId)
    );
  };

  const toggleVisibleSelection = (checked: boolean) => {
    setSelectedIds(prev => {
      if (!checked) return prev.filter(id => !visibleIds.includes(id));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(`Удалить выбранные заявки (${selectedIds.length})? Это действие нельзя отменить.`);
    if (!confirmed) return;

    setBulkDeleting(true);
    try {
      await api.deleteTickets(selectedIds);
      setTickets(prev => prev.filter(ticket => !selectedIds.includes(ticket.id)));
      setSelectedIds([]);
      toast({ title: t('common.success'), description: 'Выбранные заявки удалены' });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <motion.div className="flex items-center justify-between" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
        <div>
          <h1 className="text-2xl font-bold">{t('ticket.list.title')}</h1>
          <p className="text-muted-foreground">{t('ticket.list.subtitle')}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {filteredTickets.length} {t('ticket.list.visibleOf')} {tickets.length}
          </p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button onClick={() => navigate('/tickets/new')}><Plus className="h-4 w-4 mr-2" />{t('ticket.new')}</Button>
        </motion.div>
      </motion.div>

      <motion.div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {ticketStats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border bg-card shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-2xl font-bold leading-tight">{value}</div>
                <div className="truncate text-sm text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('ticket.list.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder={t('ticket.list.header.status')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('ticket.list.allStatuses')}</SelectItem>
                  <SelectItem value="new">{t('ticket.status.new')}</SelectItem>
                  <SelectItem value="assigned">{t('ticket.status.assigned')}</SelectItem>
                  <SelectItem value="in_progress">{t('ticket.status.inProgress')}</SelectItem>
                  <SelectItem value="resolved">{t('ticket.status.resolved')}</SelectItem>
                  <SelectItem value="closed">{t('ticket.status.closed')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder={t('ticket.list.header.priority')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('ticket.list.allPriorities')}</SelectItem>
                  <SelectItem value="low">{t('ticket.priority.low')}</SelectItem>
                  <SelectItem value="medium">{t('ticket.priority.medium')}</SelectItem>
                  <SelectItem value="high">{t('ticket.priority.high')}</SelectItem>
                  <SelectItem value="critical">{t('ticket.priority.critical')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="glass overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <motion.div className="flex items-center justify-center h-64" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </motion.div>
            ) : filteredTickets.length === 0 ? (
              <motion.div className="text-center py-12 text-muted-foreground" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('ticket.list.noTickets')}</p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button className="mt-4" onClick={() => navigate('/tickets/new')}>{t('dashboard.createTicket')}</Button>
                </motion.div>
              </motion.div>
            ) : (
              <>
              {canDeleteTickets && (
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    Выбрано: <span className="font-medium text-foreground">{selectedCount}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selectedCount === 0 || bulkDeleting}
                    onClick={handleBulkDelete}
                  >
                    {bulkDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Удалить выбранные
                  </Button>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    {canDeleteTickets && (
                      <TableHead className="w-[48px]">
                        <Checkbox
                          checked={allVisibleSelected}
                          aria-label="Выбрать все заявки на странице"
                          onCheckedChange={(checked) => toggleVisibleSelection(checked === true)}
                        />
                      </TableHead>
                    )}
                    <TableHead>{t('ticket.list.header.title')}</TableHead>
                    <TableHead>{t('ticket.list.header.requester')}</TableHead>
                    <TableHead>{t('ticket.list.header.status')}</TableHead>
                    <TableHead>{t('ticket.list.header.priority')}</TableHead>
                    <TableHead>{t('ticket.list.header.assignee')}</TableHead>
                    <TableHead>{t('ticket.list.header.date')}</TableHead>
                    {canDeleteTickets && <TableHead className="w-[72px] text-right">Действия</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredTickets.map((ticket, index) => (
                      <motion.tr key={ticket.id} variants={rowVariants} initial="hidden" animate="visible" exit="exit" custom={index}
                        className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                        {canDeleteTickets && (
                          <TableCell onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.includes(ticket.id)}
                              aria-label={`Выбрать заявку ${ticket.title}`}
                              onCheckedChange={(checked) => toggleTicketSelection(ticket.id, checked === true)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium max-w-[300px] truncate">{getDisplayTicketTitle(ticket.title)}</TableCell>
                        <TableCell>{ticket.requester_name}</TableCell>
                        <TableCell><Badge variant="secondary" className={statusColors[ticket.status]}>{getStatusLabel(ticket.status)}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className={priorityColors[ticket.priority]}>{getPriorityLabel(ticket.priority)}</Badge></TableCell>
                        <TableCell>{ticket.assignee_name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{format(new Date(ticket.created_at), 'dd.MM.yyyy')}</TableCell>
                        {canDeleteTickets && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              disabled={deletingId === ticket.id}
                              title="Удалить заявку"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteTicket(ticket);
                              }}
                            >
                              {deletingId === ticket.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        )}
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/date';

interface RecentTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  requester_name?: string;
  assignee_name?: string;
}

interface RecentTicketsTableProps {
  tickets: RecentTicket[];
}

const statusStyles: Record<string, string> = {
  new: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
  assigned: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  in_progress: 'bg-chart-5/10 text-chart-5 border-chart-5/20',
  resolved: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  closed: 'bg-muted text-muted-foreground border-border',
  reopened: 'bg-destructive/10 text-destructive border-destructive/20',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-chart-1/10 text-chart-1',
  high: 'bg-chart-2/10 text-chart-2',
  critical: 'bg-destructive/10 text-destructive',
};

export default function RecentTicketsTable({ tickets }: RecentTicketsTableProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      new: t('ticket.status.new'),
      assigned: t('ticket.status.assigned'),
      in_progress: t('ticket.status.inProgress'),
      resolved: t('ticket.status.resolved'),
      closed: t('ticket.status.closed'),
      reopened: t('ticket.status.reopened'),
    };
    return map[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const map: Record<string, string> = {
      low: t('ticket.priority.low'),
      medium: t('ticket.priority.medium'),
      high: t('ticket.priority.high'),
      critical: t('ticket.priority.critical'),
    };
    return map[priority] || priority;
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium">{t('dashboard.recentTickets')}</CardTitle>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/tickets')}>
          {t('dashboard.viewAll')} <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-xs">{t('dashboard.noTickets')}</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">№</TableHead>
                  <TableHead className="text-xs">{t('ticket.list.header.title')}</TableHead>
                  <TableHead className="text-xs">{t('ticket.list.header.priority')}</TableHead>
                  <TableHead className="text-xs">{t('ticket.list.header.status')}</TableHead>
                  <TableHead className="text-xs">{t('ticket.list.header.assignee')}</TableHead>
                  <TableHead className="text-xs">{t('common.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket, i) => (
                  <motion.tr
                    key={ticket.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="cursor-pointer hover:bg-muted/40 transition-colors border-b"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {ticket.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs font-medium max-w-[200px] truncate">
                      {ticket.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] ${priorityStyles[ticket.priority]}`}>
                        {getPriorityLabel(ticket.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${statusStyles[ticket.status]}`}>
                        {getStatusLabel(ticket.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ticket.assignee_name || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(ticket.created_at, 'dd.MM HH:mm')}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

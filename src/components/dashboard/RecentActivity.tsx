import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, UserCheck, AlertTriangle, MessageSquare, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/date';

interface ActivityItem {
  id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  actor_name?: string;
  ticket_title?: string;
}

interface RecentActivityProps {
  items: ActivityItem[];
}

function getActivityIcon(field: string, newValue: string | null) {
  if (field === 'status' && newValue === 'closed') return XCircle;
  if (field === 'status') return CheckCircle2;
  if (field === 'assignee_id') return UserCheck;
  if (field === 'priority' && (newValue === 'high' || newValue === 'critical')) return AlertTriangle;
  if (field === 'comment') return MessageSquare;
  return Activity;
}

function getActivityColor(field: string, newValue: string | null) {
  if (field === 'status' && newValue === 'closed') return 'bg-muted text-muted-foreground';
  if (field === 'status') return 'bg-chart-3/10 text-chart-3';
  if (field === 'assignee_id') return 'bg-chart-1/10 text-chart-1';
  if (field === 'priority') return 'bg-chart-2/10 text-chart-2';
  return 'bg-primary/10 text-primary';
}

export default function RecentActivity({ items }: RecentActivityProps) {
  const { t } = useLanguage();

  const fieldLabels: Record<string, string> = {
    status: t('dashboard.activity.status'),
    priority: t('dashboard.activity.priority'),
    assignee_id: t('dashboard.activity.assignee'),
    category_id: t('dashboard.activity.category'),
    comment: t('dashboard.activity.comment'),
  };

  const statusLabels: Record<string, string> = {
    new: t('ticket.status.new'),
    assigned: t('ticket.status.assigned'),
    in_progress: t('ticket.status.inProgress'),
    resolved: t('ticket.status.resolved'),
    closed: t('ticket.status.closed'),
    reopened: t('ticket.status.reopened'),
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{t('dashboard.recentActivity')}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-xs">{t('dashboard.noActivity')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-auto">
            {items.map((item, i) => {
              const Icon = getActivityIcon(item.field, item.new_value);
              const colorClass = getActivityColor(item.field, item.new_value);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className={`mt-0.5 h-6 w-6 rounded-md ${colorClass} flex items-center justify-center shrink-0`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs">
                      <span className="font-medium">{item.actor_name}</span>
                      {' '}{fieldLabels[item.field] || item.field}
                      {item.new_value && (
                        <> → <Badge variant="secondary" className="text-[10px] ml-0.5">{statusLabels[item.new_value] || item.new_value}</Badge></>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {item.ticket_title} • {formatDate(item.created_at, 'dd.MM HH:mm')}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, UserX, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface AttentionItem {
  id: string;
  title: string;
  type: 'sla_breach' | 'unassigned' | 'high_priority' | 'no_response';
  priority: string;
  created_at: string;
}

interface AttentionBlockProps {
  items: AttentionItem[];
  onTicketClick: (id: string) => void;
}

export default function AttentionBlock({ items, onTicketClick }: AttentionBlockProps) {
  const { t } = useLanguage();
  if (items.length === 0) return null;

  const typeConfig = {
    sla_breach: { icon: AlertTriangle, label: t('dashboard.slaBreach'), color: 'text-destructive', bg: 'bg-destructive/10' },
    unassigned: { icon: UserX, label: t('dashboard.unassigned'), color: 'text-chart-4', bg: 'bg-chart-4/10' },
    high_priority: { icon: Flame, label: t('dashboard.highPriority'), color: 'text-chart-2', bg: 'bg-chart-2/10' },
    no_response: { icon: Clock, label: t('dashboard.inProgress'), color: 'text-chart-5', bg: 'bg-chart-5/10' },
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
    <Card className="border-destructive/30 bg-destructive/[0.02]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          {t('dashboard.attentionRequired')}
          <Badge variant="destructive" className="ml-auto text-xs">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[240px] overflow-auto">
          {items.map((item, i) => {
            const config = typeConfig[item.type];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onTicketClick(item.id)}
                className="flex items-center gap-3 p-2.5 rounded-lg border bg-card/80 hover:bg-card cursor-pointer transition-colors"
              >
                <div className={`h-7 w-7 rounded-md ${config.bg} flex items-center justify-center shrink-0`}>
                  <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{config.label}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{getPriorityLabel(item.priority)}</Badge>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

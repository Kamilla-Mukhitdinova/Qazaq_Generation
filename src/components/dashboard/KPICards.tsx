import { Card, CardContent } from '@/components/ui/card';
import { Ticket, Clock, TrendingUp, AlertTriangle, ArrowUp, UserX } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface KPICardsProps {
  total: number;
  newCount: number;
  inProgress: number;
  breached: number;
  highPriority: number;
  unassigned: number;
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } }
};

export default function KPICards(props: KPICardsProps) {
  const { t } = useLanguage();

  const cards = [
    { key: 'total' as const, label: t('dashboard.allTickets'), desc: t('dashboard.allTicketsInSystem'), icon: Ticket, color: 'text-primary', bgColor: 'bg-primary/10', borderColor: 'border-l-primary' },
    { key: 'newCount' as const, label: t('dashboard.new'), desc: t('dashboard.unprocessedTickets'), icon: Clock, color: 'text-chart-1', bgColor: 'bg-chart-1/10', borderColor: 'border-l-[hsl(220,60%,45%)]' },
    { key: 'inProgress' as const, label: t('dashboard.inProgress'), desc: t('dashboard.workingTickets'), icon: TrendingUp, color: 'text-chart-5', bgColor: 'bg-chart-5/10', borderColor: 'border-l-[hsl(280,50%,55%)]' },
    { key: 'breached' as const, label: t('dashboard.slaBreach'), desc: t('dashboard.overdueTickets'), icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/10', borderColor: 'border-l-destructive' },
    { key: 'highPriority' as const, label: t('dashboard.highPriority'), desc: t('dashboard.highPriorityDesc'), icon: ArrowUp, color: 'text-chart-2', bgColor: 'bg-chart-2/10', borderColor: 'border-l-[hsl(42,80%,55%)]' },
    { key: 'unassigned' as const, label: t('dashboard.unassigned'), desc: t('dashboard.unassignedDesc'), icon: UserX, color: 'text-chart-4', bgColor: 'bg-chart-4/10', borderColor: 'border-l-[hsl(340,65%,55%)]' },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <motion.div key={card.key} variants={itemVariants}>
          <Card className={`border-l-4 ${card.borderColor} hover:shadow-md transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <div className={`h-8 w-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>
                {props[card.key]}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{card.desc}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

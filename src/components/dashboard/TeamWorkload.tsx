import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  activeTickets: number;
  avgResponseMin: number;
}

interface TeamWorkloadProps {
  members: TeamMember[];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const positionTranslationKey: Record<string, string> = {
  'инженер первой линии': 'dashboard.employeeKpi.position.firstLine',
  'инженер второй линии': 'dashboard.employeeKpi.position.secondLine',
  'инженер третьей линии': 'dashboard.employeeKpi.position.thirdLine',
};

export default function TeamWorkload({ members }: TeamWorkloadProps) {
  const { t } = useLanguage();

  const getLoad = (tickets: number): { label: string; color: string; progress: number } => {
    if (tickets <= 3) return { label: t('dashboard.workload.low'), color: 'bg-chart-3/20 text-chart-3', progress: 25 };
    if (tickets <= 7) return { label: t('dashboard.workload.medium'), color: 'bg-chart-2/20 text-chart-2', progress: 60 };
    return { label: t('dashboard.workload.high'), color: 'bg-destructive/20 text-destructive', progress: 90 };
  };

  const getRoleLabel = (role: string) => {
    const positionKey = positionTranslationKey[role.toLowerCase()];
    if (positionKey) return t(positionKey);
    return role;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{t('dashboard.teamWorkload')}</CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">{t('dashboard.noData')}</p>
        ) : (
          <div className="space-y-3">
            {members.map((m, i) => {
              const load = getLoad(m.activeTickets);
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {getInitials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">{getRoleLabel(m.role)}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${load.color}`}>
                        {load.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={load.progress} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {m.activeTickets} {t('dashboard.ticketsShort')} • {m.avgResponseMin} {t('dashboard.minutesShort')}
                      </span>
                    </div>
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

import { useNavigate } from 'react-router-dom';
import { Award, ChevronRight, ShieldCheck, TicketCheck, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';

interface EmployeeKpiRow {
  userId: string;
  name: string;
  role: string;
  position?: string;
  resolved: number;
  slaRate: number;
  avgResponseMinutes: number;
  score: number;
}

interface EmployeeKpiSummaryProps {
  rows: EmployeeKpiRow[];
}

const scoreClassName = (score: number) => {
  if (score >= 85) return 'bg-green-500/10 text-green-600';
  if (score >= 65) return 'bg-yellow-500/10 text-yellow-600';
  return 'bg-red-500/10 text-red-600';
};

const positionTranslationKey: Record<string, string> = {
  'инженер первой линии': 'dashboard.employeeKpi.position.firstLine',
  'инженер второй линии': 'dashboard.employeeKpi.position.secondLine',
  'инженер третьей линии': 'dashboard.employeeKpi.position.thirdLine',
};

export default function EmployeeKpiSummary({ rows }: EmployeeKpiSummaryProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const topRows = rows.slice(0, 3);
  const averageScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0;
  const resolved = rows.reduce((sum, row) => sum + row.resolved, 0);
  const slaRate = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.slaRate, 0) / rows.length) : 0;
  const avgResponse = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.avgResponseMinutes, 0) / rows.length) : 0;
  const getRoleOrPositionLabel = (row: EmployeeKpiRow) => {
    const rawLabel = row.position || row.role;
    const positionKey = positionTranslationKey[rawLabel.toLowerCase()];
    if (positionKey) return t(positionKey);
    const roleKey = `role.${row.role}`;
    const roleLabel = t(roleKey);
    return roleLabel === roleKey ? rawLabel : roleLabel;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Award className="h-4 w-4 text-primary" />
          {t('dashboard.employeeKpi.title')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/performance')}>
          {t('dashboard.employeeKpi.details')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Award className="h-3.5 w-3.5" />{t('dashboard.employeeKpi.average')}</div>
            <div className="mt-1 text-xl font-bold">{averageScore}%</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><TicketCheck className="h-3.5 w-3.5" />{t('dashboard.employeeKpi.resolved')}</div>
            <div className="mt-1 text-xl font-bold text-green-600">{resolved}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />SLA</div>
            <div className="mt-1 text-xl font-bold text-blue-600">{slaRate}%</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Timer className="h-3.5 w-3.5" />{t('dashboard.employeeKpi.reaction')}</div>
            <div className="mt-1 text-xl font-bold">{avgResponse} {t('dashboard.employeeKpi.minutes')}</div>
          </div>
        </div>

        {topRows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('dashboard.employeeKpi.empty')}</p>
        ) : (
          <div className="space-y-3">
            {topRows.map((row, index) => (
              <div key={row.userId} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <Badge variant="outline" className="text-[10px]">{getRoleOrPositionLabel(row)}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Progress value={row.score} className="h-2 flex-1" />
                    <Badge className={scoreClassName(row.score)}>{row.score}%</Badge>
                  </div>
                </div>
                <div className="hidden text-right text-xs text-muted-foreground sm:block">
                  <div>{row.resolved} {t('dashboard.employeeKpi.resolvedCount')}</div>
                  <div>SLA {row.slaRate}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

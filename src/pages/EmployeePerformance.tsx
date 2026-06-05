import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Award, BarChart3, Clock, Eye, Loader2, ShieldCheck, TrendingUp } from 'lucide-react';

interface TicketKpiDetail {
  id: string;
  title: string;
  priority: string;
  status: string;
  responseMinutes: number | null;
  resolutionHours: number | null;
  breachedResponse: boolean;
  breachedResolve: boolean;
}

interface KpiRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  position?: string;
  assigned: number;
  resolved: number;
  active: number;
  slaRate: number;
  slaBreached: number;
  avgResponseMinutes: number;
  avgResolutionHours: number;
  reopened: number;
  productivity: number;
  timeliness: number;
  quality: number;
  score: number;
  ticketDetails?: TicketKpiDetail[];
}

const scoreClassName = (score: number) => {
  if (score >= 85) return 'bg-green-500/10 text-green-600';
  if (score >= 65) return 'bg-yellow-500/10 text-yellow-600';
  return 'bg-red-500/10 text-red-600';
};

const roleLabel: Record<string, string> = {
  admin: 'Администратор',
  manager: 'Менеджер',
  agent: 'Агент',
  employee: 'Сотрудник',
};

const statusLabel: Record<string, string> = {
  new: 'Новая',
  assigned: 'Назначена',
  in_progress: 'В работе',
  resolved: 'Решена',
  closed: 'Закрыта',
  reopened: 'Переоткрыта',
};

const priorityLabel: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
};

export default function EmployeePerformance() {
  const [periodMonth, setPeriodMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<KpiRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKpi();
  }, [periodMonth]);

  const fetchKpi = async () => {
    setLoading(true);
    try {
      const data = await api.getPerformanceKpi(periodMonth);
      setRows(data.rows || []);
    } catch (error) {
      console.error('Error fetching KPI:', error);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const averageScore = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length)
      : 0;
    const resolved = rows.reduce((sum, row) => sum + row.resolved, 0);
    const slaRate = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.slaRate, 0) / rows.length)
      : 0;
    const avgResponse = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.avgResponseMinutes, 0) / rows.length)
      : 0;

    return { averageScore, resolved, slaRate, avgResponse };
  }, [rows]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Award className="h-6 w-6 text-primary" />
            Оценка сотрудников и KPI
          </h1>
          <p className="text-muted-foreground">
            Автоматический расчёт эффективности по заявкам, SLA и качеству обработки.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Период</span>
          <Input
            type="month"
            value={periodMonth}
            onChange={(event) => setPeriodMonth(event.target.value)}
            className="w-44"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Средний KPI</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary.averageScore}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Решено заявок</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{summary.resolved}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">SLA выполнено</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{summary.slaRate}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Средняя реакция</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary.avgResponse} мин</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Рейтинг сотрудников
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Назначено</TableHead>
                <TableHead>Решено</TableHead>
                <TableHead>Активно</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>SLA нарушения</TableHead>
                <TableHead>Реакция</TableHead>
                <TableHead>Переоткрыто</TableHead>
                <TableHead className="min-w-[150px]">Продуктивность</TableHead>
                <TableHead className="min-w-[150px]">Своевременность</TableHead>
                <TableHead className="min-w-[150px]">Качество</TableHead>
                <TableHead className="min-w-[180px]">Итоговый KPI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </TableCell>
                  <TableCell>{row.position || roleLabel[row.role] || row.role}</TableCell>
                  <TableCell>{row.assigned}</TableCell>
                  <TableCell>{row.resolved}</TableCell>
                  <TableCell>{row.active}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={row.slaRate >= 80 ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}>
                      {row.slaRate}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-2">
                          {row.slaBreached > 0 ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> : <Eye className="h-3.5 w-3.5" />}
                          {row.slaBreached} наруш.
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Детали SLA: {row.name}</DialogTitle>
                          <DialogDescription>
                            Время первой реакции, решение и нарушения SLA по заявкам за выбранный период.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Заявка</TableHead>
                                <TableHead>Приоритет</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead>Реакция</TableHead>
                                <TableHead>Решение</TableHead>
                                <TableHead>SLA</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(row.ticketDetails || []).map(ticket => {
                                const breached = ticket.breachedResponse || ticket.breachedResolve;
                                return (
                                  <TableRow key={ticket.id}>
                                    <TableCell>
                                      <div className="max-w-[260px] font-medium">{ticket.title}</div>
                                      <div className="text-xs text-muted-foreground">{ticket.id.slice(0, 8)}</div>
                                    </TableCell>
                                    <TableCell>{priorityLabel[ticket.priority] || ticket.priority}</TableCell>
                                    <TableCell>{statusLabel[ticket.status] || ticket.status}</TableCell>
                                    <TableCell>{ticket.responseMinutes !== null ? `${ticket.responseMinutes} мин` : '-'}</TableCell>
                                    <TableCell>{ticket.resolutionHours !== null ? `${ticket.resolutionHours} ч` : '-'}</TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className={breached ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}>
                                        {breached ? 'Нарушено' : 'В норме'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              {(row.ticketDetails || []).length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Нет заявок за период.</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell>{row.avgResponseMinutes} мин</TableCell>
                  <TableCell>{row.reopened}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Progress value={row.productivity} className="h-2" />
                        <Badge className={scoreClassName(row.productivity)}>{row.productivity}%</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">Решено: {row.resolved}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Progress value={row.timeliness} className="h-2" />
                        <Badge className={scoreClassName(row.timeliness)}>{row.timeliness}%</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">SLA {row.slaRate}%, реакция {row.avgResponseMinutes} мин</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Progress value={row.quality} className="h-2" />
                        <Badge className={scoreClassName(row.quality)}>{row.quality}%</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">Нарушений SLA: {row.slaBreached}, переоткрыто: {row.reopened}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={row.score} className="h-2" />
                      <Badge className={scoreClassName(row.score)}>{row.score}%</Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="py-8 text-center text-muted-foreground">
                    За выбранный период нет данных для расчёта KPI.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4 text-primary" />Продуктивность</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            35% итоговой оценки. Признак: сколько заявок сотрудник решил за период относительно лучшего результата в команде.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-primary" />Своевременность</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            35% итоговой оценки. Признаки: процент выполненных SLA и среднее время первой реакции. Чем дольше реакция, тем ниже балл.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-primary" />Качество</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            30% итоговой оценки. Признаки: нарушения SLA и повторные открытия заявок. Каждое нарушение и переоткрытие снижает балл.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

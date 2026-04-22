import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar, RadialBarChart, RadialBar, Legend } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChartsProps {
  ticketsByDay: { date: string; count: number }[];
  ticketsByStatus: { name: string; value: number }[];
  ticketsByPriority: { name: string; value: number }[];
  slaPerformance: number; // percent within SLA
}

const STATUS_COLORS = ['hsl(220,60%,45%)', 'hsl(42,80%,55%)', 'hsl(280,50%,55%)', 'hsl(175,60%,45%)', 'hsl(210,10%,60%)', 'hsl(340,65%,55%)'];
const PRIORITY_COLORS = { low: 'hsl(210,10%,60%)', medium: 'hsl(220,60%,45%)', high: 'hsl(42,80%,55%)', critical: 'hsl(0,70%,55%)' };

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };

export default function DashboardCharts({ ticketsByDay, ticketsByStatus, ticketsByPriority, slaPerformance }: ChartsProps) {
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

  const slaData = [{ name: 'SLA', value: slaPerformance, fill: slaPerformance >= 80 ? 'hsl(175,60%,45%)' : slaPerformance >= 50 ? 'hsl(42,80%,55%)' : 'hsl(0,70%,55%)' }];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* 7-day trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.last7Days')}</CardTitle>
          <CardDescription className="text-xs">{t('dashboard.trendByDay')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ticketsByDay}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(220,60%,45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(220,60%,45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={24} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke="hsl(220,60%,45%)" fill="url(#trendGrad)" strokeWidth={2} name={t('nav.tickets')} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Status pie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.byStatus')}</CardTitle>
          <CardDescription className="text-xs">{t('dashboard.ticketDistribution')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-44">
            {ticketsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ticketsByStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" label={({ name, value }) => `${getStatusLabel(name)}: ${value}`} style={{ fontSize: 10 }}>
                    {ticketsByStatus.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [value, getStatusLabel(name)]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">{t('dashboard.noData')}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Priority bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.byPriority')}</CardTitle>
          <CardDescription className="text-xs">{t('dashboard.priorityDistribution')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-44">
            {ticketsByPriority.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketsByPriority} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={getPriorityLabel} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={24} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name={t('nav.tickets')} radius={[4, 4, 0, 0]}>
                    {ticketsByPriority.map((entry) => (
                      <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name as keyof typeof PRIORITY_COLORS] || 'hsl(210,10%,60%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">{t('dashboard.noData')}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SLA performance radial */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">SLA Performance</CardTitle>
          <CardDescription className="text-xs">{t('dashboard.slaWithin')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-44 flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={140} height={140}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={slaData} startAngle={90} endAngle={-270}>
                  <RadialBar background dataKey="value" cornerRadius={8} max={100} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-2xl font-bold">{slaPerformance}%</span>
                  <p className="text-[10px] text-muted-foreground">SLA</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

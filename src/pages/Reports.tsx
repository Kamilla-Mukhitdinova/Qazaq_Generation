import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { BarChart3, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';

interface TicketStats {
  byStatus: { name: string; value: number; color: string }[];
  byPriority: { name: string; value: number; color: string }[];
  byDay: { date: string; created: number; resolved: number }[];
  slaBreaches: number;
  avgResolutionTime: number;
  topCategories: { name: string; count: number }[];
}

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    if (obj?.[key] !== undefined) return obj[key] as T;
  }
  return undefined;
};

const COLORS: Record<string, string> = {
  new: '#3b82f6', assigned: '#eab308', in_progress: '#a855f7', resolved: '#22c55e',
  closed: '#6b7280', reopened: '#ef4444', low: '#64748b', medium: '#3b82f6', high: '#f97316', critical: '#ef4444',
};

export default function Reports() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('quarter');
  const [stats, setStats] = useState<TicketStats>({ byStatus: [], byPriority: [], byDay: [], slaBreaches: 0, avgResolutionTime: 0, topCategories: [] });

  const STATUS_LABELS: Record<string, string> = {
    new: t('ticket.status.new'), assigned: t('ticket.status.assigned'), in_progress: t('ticket.status.inProgress'),
    resolved: t('ticket.status.resolved'), closed: t('ticket.status.closed'), reopened: t('ticket.status.reopened'),
  };
  const PRIORITY_LABELS: Record<string, string> = {
    low: t('ticket.priority.low'), medium: t('ticket.priority.medium'), high: t('ticket.priority.high'), critical: t('ticket.priority.critical'),
  };

  useEffect(() => { fetchStats(); }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const startDate = period === 'week' ? subDays(new Date(), 7) : period === 'month' ? startOfMonth(new Date()) : subDays(new Date(), 90);

      const [ticketsRes, slaData, categories] = await Promise.all([
        api.getTickets(), api.getTicketSla(), api.getCategories(),
      ]);

      const tickets = (ticketsRes.data || [])
        .map((ticket: any) => ({
          ...ticket,
          created_at: pick<string>(ticket, 'created_at', 'createdAt') || '',
          closed_at: pick<string | null>(ticket, 'closed_at', 'closedAt') || null,
          category_id: pick<string | null>(ticket, 'category_id', 'categoryId') || null,
        }))
        .filter((ticket: any) => {
          const createdAt = new Date(ticket.created_at);
          return !Number.isNaN(createdAt.getTime()) && createdAt >= startDate;
        });

      const statusCounts: Record<string, number> = {};
      const priorityCounts: Record<string, number> = {};
      tickets.forEach((t: any) => {
        statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
        priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
      });

      const byStatus = Object.entries(statusCounts).map(([s, c]) => ({ name: STATUS_LABELS[s] || s, value: c, color: COLORS[s] || '#6b7280' }));
      const byPriority = Object.entries(priorityCounts).map(([p, c]) => ({ name: PRIORITY_LABELS[p] || p, value: c, color: COLORS[p] || '#6b7280' }));

      const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      const dailyData: Record<string, { created: number; resolved: number }> = {};
      for (let i = days - 1; i >= 0; i--) dailyData[format(subDays(new Date(), i), 'dd.MM')] = { created: 0, resolved: 0 };
      tickets.forEach((t: any) => {
        const d = format(new Date(t.created_at), 'dd.MM');
        if (dailyData[d]) dailyData[d].created++;
        if (t.closed_at) { const cd = format(new Date(t.closed_at), 'dd.MM'); if (dailyData[cd]) dailyData[cd].resolved++; }
      });
      const byDay = Object.entries(dailyData).map(([date, d]) => ({ date, created: d.created, resolved: d.resolved }));

      const categoryCounts: Record<string, number> = {};
      tickets.forEach((t: any) => { if (t.category_id) categoryCounts[t.category_id] = (categoryCounts[t.category_id] || 0) + 1; });
      const topCategories = Object.entries(categoryCounts).map(([id, count]) => ({
        name: (categories || []).find((c: any) => c.id === id)?.name || t('common.unknown'), count,
      })).sort((a, b) => b.count - a.count).slice(0, 5);

      setStats({ byStatus, byPriority, byDay, slaBreaches: (slaData || []).filter((s: any) => s.breached_response || s.breached_resolve).length, avgResolutionTime: 0, topCategories });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" />{t('reports.title')}</h1>
          <p className="text-muted-foreground">{t('reports.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('reports.lastWeek')}</SelectItem>
              <SelectItem value="month">{t('reports.thisMonth')}</SelectItem>
              <SelectItem value="quarter">{t('reports.last90days')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />{t('common.export')}</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t('reports.allTickets')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.byStatus.reduce((s, v) => s + v.value, 0)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t('reports.resolved')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-500">{stats.byStatus.find(s => s.name === t('ticket.status.resolved'))?.value || 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t('reports.inProgress')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-purple-500">{stats.byStatus.find(s => s.name === t('ticket.status.inProgress'))?.value || 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-red-500" />{t('reports.slaBreached')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">{stats.slaBreaches}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('reports.overview')}</TabsTrigger>
          <TabsTrigger value="trends">{t('reports.trends')}</TabsTrigger>
          <TabsTrigger value="categories">{t('reports.categories')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle>{t('reports.byStatus')}</CardTitle></CardHeader><CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart><Pie data={stats.byStatus} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} dataKey="value">{stats.byStatus.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>{t('reports.byPriority')}</CardTitle></CardHeader><CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.byPriority}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value">{stats.byPriority.map((e, i) => <Cell key={i} fill={e.color} />)}</Bar></BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </div>
        </TabsContent>
        <TabsContent value="trends">
          <Card><CardHeader><CardTitle>{t('reports.dailyTrend')}</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={stats.byDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="created" name={t('reports.created')} stroke="#3b82f6" strokeWidth={2} /><Line type="monotone" dataKey="resolved" name={t('reports.resolved')} stroke="#22c55e" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="categories">
          <Card><CardHeader><CardTitle>{t('reports.topCategories')}</CardTitle></CardHeader><CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.topCategories} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={150} /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" /></BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

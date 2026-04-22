import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { motion, Variants } from 'framer-motion';

import KPICards from '@/components/dashboard/KPICards';
import AttentionBlock from '@/components/dashboard/AttentionBlock';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import TeamWorkload from '@/components/dashboard/TeamWorkload';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentTicketsTable from '@/components/dashboard/RecentTicketsTable';
import RecentActivity from '@/components/dashboard/RecentActivity';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants: Variants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 120 } }
};

interface FiltersState {
  dateRange: string;
  priority: string;
  status: string;
  assignee: string;
  department: string;
}

const defaultFilters: FiltersState = { dateRange: 'all', priority: 'all', status: 'all', assignee: 'all', department: 'all' };

export default function Dashboard() {
  const { role, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);

  const [kpi, setKpi] = useState({ total: 0, newCount: 0, inProgress: 0, breached: 0, highPriority: 0, unassigned: 0 });
  const [ticketsByDay, setTicketsByDay] = useState<{ date: string; count: number }[]>([]);
  const [ticketsByStatus, setTicketsByStatus] = useState<{ name: string; value: number }[]>([]);
  const [ticketsByPriority, setTicketsByPriority] = useState<{ name: string; value: number }[]>([]);
  const [slaPerformance, setSlaPerformance] = useState(0);
  const [attentionItems, setAttentionItems] = useState<any[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [ticketsRes, slaData, profiles, historyData, deptsData, rolesData] = await Promise.all([
        api.getTickets(),
        api.getTicketSla(),
        api.getProfiles(),
        api.getTicketHistory(),
        api.getDepartments(),
        api.getUserRoles(),
      ]);

      const tickets = ticketsRes.data || [];
      const breachedTicketIds = new Set((slaData || []).filter((s: any) => s.breached_response || s.breached_resolve).map((s: any) => s.ticket_id));

      // Departments & agents
      setDepartments(deptsData || []);
      const agentRoles = (rolesData || []).filter((r: any) => ['agent', 'admin', 'manager'].includes(r.role));
      const agentUsers = (profiles || []).filter((p: any) => agentRoles.some((r: any) => r.user_id === p.user_id));
      setAgents(agentUsers.map((a: any) => ({ id: a.user_id, name: a.name })));

      // KPI
      setKpi({
        total: tickets.length,
        newCount: tickets.filter((t: any) => t.status === 'new').length,
        inProgress: tickets.filter((t: any) => ['assigned', 'in_progress'].includes(t.status)).length,
        breached: breachedTicketIds.size,
        highPriority: tickets.filter((t: any) => t.priority === 'high' || t.priority === 'critical').length,
        unassigned: tickets.filter((t: any) => !t.assignee_id && !['closed', 'resolved'].includes(t.status)).length,
      });

      // Attention items
      const attention: any[] = [];
      tickets.forEach((t: any) => {
        if (breachedTicketIds.has(t.id)) attention.push({ id: t.id, title: t.title, type: 'sla_breach', priority: t.priority, created_at: t.created_at });
        else if (!t.assignee_id && !['closed', 'resolved'].includes(t.status)) attention.push({ id: t.id, title: t.title, type: 'unassigned', priority: t.priority, created_at: t.created_at });
        else if ((t.priority === 'high' || t.priority === 'critical') && !['closed', 'resolved'].includes(t.status)) attention.push({ id: t.id, title: t.title, type: 'high_priority', priority: t.priority, created_at: t.created_at });
      });
      setAttentionItems(attention.slice(0, 10));

      // Tickets by day (7 days)
      const dayMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) dayMap.set(format(subDays(new Date(), i), 'dd.MM'), 0);
      tickets.forEach((t: any) => { const d = format(new Date(t.created_at), 'dd.MM'); if (dayMap.has(d)) dayMap.set(d, (dayMap.get(d) || 0) + 1); });
      setTicketsByDay(Array.from(dayMap, ([date, count]) => ({ date, count })));

      // Tickets by status
      const statusMap = new Map<string, number>();
      tickets.forEach((t: any) => statusMap.set(t.status, (statusMap.get(t.status) || 0) + 1));
      setTicketsByStatus(Array.from(statusMap, ([name, value]) => ({ name, value })));

      // Tickets by priority
      const prioMap = new Map<string, number>();
      tickets.forEach((t: any) => prioMap.set(t.priority, (prioMap.get(t.priority) || 0) + 1));
      setTicketsByPriority(Array.from(prioMap, ([name, value]) => ({ name, value })));

      // SLA performance
      const totalSla = (slaData || []).length;
      const withinSla = (slaData || []).filter((s: any) => !s.breached_response && !s.breached_resolve).length;
      setSlaPerformance(totalSla > 0 ? Math.round((withinSla / totalSla) * 100) : 100);

      // Recent tickets with names
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.name]));
      const recent = tickets.slice(0, 8);
      setRecentTickets(recent.map((t: any) => ({
        ...t,
        requester_name: profileMap.get(t.requester_id) || '-',
        assignee_name: t.assignee_id ? profileMap.get(t.assignee_id) || '-' : '-',
      })));

      // Recent activity
      const history = (historyData || []).slice(0, 15);
      const ticketMap = new Map(tickets.map((t: any) => [t.id, t.title]));
      setRecentActivity(history.map((h: any) => ({
        ...h,
        actor_name: profileMap.get(h.actor_id) || '-',
        ticket_title: ticketMap.get(h.ticket_id) || '-',
      })));

      // Team workload
      const activeTickets = tickets.filter((t: any) => ['new', 'assigned', 'in_progress'].includes(t.status));
      setTeamMembers(agentUsers.map((a: any) => {
        const myTickets = activeTickets.filter((t: any) => t.assignee_id === a.user_id);
        const roleEntry = agentRoles.find((r: any) => r.user_id === a.user_id);
        return { id: a.user_id, name: a.name, role: roleEntry?.role === 'admin' ? 'Admin' : roleEntry?.role === 'manager' ? 'Manager' : 'Agent', activeTickets: myTickets.length, avgResponseMin: Math.round(Math.random() * 30 + 5) };
      }));
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = role === 'admin' || role === 'manager';

  return (
    <motion.div className="space-y-5" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.welcome')}, {profile?.name || 'Admin'}!</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.howAreYou')}</p>
        </div>
      </motion.div>

      {isAdmin && (
        <motion.div variants={itemVariants}>
          <DashboardFilters filters={filters} onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))} onReset={() => setFilters(defaultFilters)} departments={departments} agents={agents} />
        </motion.div>
      )}

      <motion.div variants={itemVariants}><KPICards {...kpi} /></motion.div>

      {isAdmin && attentionItems.length > 0 && (
        <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><AttentionBlock items={attentionItems} onTicketClick={(id) => navigate(`/tickets/${id}`)} /></div>
          <QuickActions />
        </motion.div>
      )}

      {isAdmin && attentionItems.length === 0 && (
        <motion.div variants={itemVariants} className="max-w-sm"><QuickActions /></motion.div>
      )}

      <motion.div variants={itemVariants}>
        <DashboardCharts ticketsByDay={ticketsByDay} ticketsByStatus={ticketsByStatus} ticketsByPriority={ticketsByPriority} slaPerformance={slaPerformance} />
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><RecentTicketsTable tickets={recentTickets} /></div>
        {isAdmin && <TeamWorkload members={teamMembers} />}
      </motion.div>

      <motion.div variants={itemVariants}><RecentActivity items={recentActivity} /></motion.div>
    </motion.div>
  );
}

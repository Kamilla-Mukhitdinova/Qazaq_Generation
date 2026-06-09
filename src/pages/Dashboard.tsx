import { useEffect, useMemo, useState } from 'react';
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
import EmployeeKpiSummary from '@/components/dashboard/EmployeeKpiSummary';

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
const dateRangeOptions = ['all', 'today', 'week', 'month'] as const;
const priorityOptions = ['all', 'critical', 'high', 'medium', 'low'] as const;
const statusOptions = ['all', 'new', 'assigned', 'in_progress', 'resolved', 'closed'] as const;

interface DashboardFilterOptions {
  dateRange: string[];
  priority: string[];
  status: string[];
  assignee: string[];
  department: string[];
}

interface DashboardRawData {
  tickets: any[];
  slaData: any[];
  profiles: any[];
  groups: any[];
  historyData: any[];
  agentUsers: any[];
  agentRoles: any[];
  performanceRows: any[];
}

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key] as T;
  }
  return undefined;
};

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
  const [employeeKpiRows, setEmployeeKpiRows] = useState<any[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string; nameEn?: string }[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [rawData, setRawData] = useState<DashboardRawData | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!rawData) return;
    applyDashboardFilters(rawData);
  }, [filters, rawData, departments]);

  const filterOptions = useMemo<DashboardFilterOptions>(() => {
    if (!rawData) {
      return {
        dateRange: [...dateRangeOptions],
        priority: [...priorityOptions],
        status: [...statusOptions],
        assignee: ['all'],
        department: ['all'],
      };
    }

    return getAvailableFilterOptions(rawData);
  }, [filters, rawData]);

  useEffect(() => {
    if (!rawData) return;

    const nextFilters = { ...filters };
    let changed = false;

    (Object.keys(filterOptions) as Array<keyof FiltersState>).forEach((key) => {
      if (nextFilters[key] !== 'all' && !filterOptions[key].includes(nextFilters[key])) {
        nextFilters[key] = 'all';
        changed = true;
      }
    });

    if (changed) setFilters(nextFilters);
  }, [filterOptions, filters, rawData]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const periodMonth = new Date().toISOString().slice(0, 7);
      const [ticketsRes, slaData, profiles, historyData, deptsData, groupsData, rolesData, performanceData] = await Promise.all([
        api.getTickets({ limit: '1000' }),
        api.getTicketSla(),
        api.getProfiles(),
        api.getTicketHistory(),
        api.getDepartments(),
        api.getGroups(),
        api.getUserRoles(),
        ['admin', 'manager', 'agent'].includes(role || '') ? api.getPerformanceKpi(periodMonth).catch(() => ({ rows: [] })) : Promise.resolve({ rows: [] }),
      ]);

      const tickets = (ticketsRes.data || []).map((ticket: any) => ({
        ...ticket,
        requester_id: pick<string>(ticket, 'requester_id', 'requesterId') || '',
        assignee_id: pick<string | null>(ticket, 'assignee_id', 'assigneeId') || null,
        created_at: pick<string>(ticket, 'created_at', 'createdAt') || new Date().toISOString(),
      }));

      // Departments & agents
      setDepartments(deptsData || []);
      const normalizedProfiles = (profiles || []).map((profile: any) => ({
        ...profile,
        user_id: pick<string>(profile, 'user_id', 'userId') || '',
        department_id: pick<string | null>(profile, 'department_id', 'departmentId') || null,
        group_id: pick<string | null>(profile, 'group_id', 'groupId') || null,
      }));
      const normalizedRoles = (rolesData || []).map((userRole: any) => ({
        ...userRole,
        user_id: pick<string>(userRole, 'user_id', 'userId') || '',
      }));
      const agentRoles = normalizedRoles.filter((r: any) => ['agent', 'admin', 'manager'].includes(r.role));
      const agentUsers = normalizedProfiles.filter((p: any) => agentRoles.some((r: any) => r.user_id === p.user_id));
      setAgents(agentUsers.map((a: any) => ({ id: a.user_id, name: a.name })));
      setRawData({
        tickets,
        slaData: slaData || [],
        profiles: normalizedProfiles,
        groups: groupsData || [],
        historyData: historyData || [],
        agentUsers,
        agentRoles,
        performanceRows: performanceData.rows || [],
      });
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = (tickets: any[], profileMap: Map<string, any>) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = subDays(startOfToday, 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return tickets.filter((ticket: any) => {
      if (filters.priority !== 'all' && ticket.priority !== filters.priority) return false;
      if (filters.status !== 'all' && ticket.status !== filters.status) return false;
      if (filters.assignee !== 'all' && ticket.assignee_id !== filters.assignee) return false;

      if (filters.dateRange !== 'all') {
        const createdAt = new Date(ticket.created_at);
        if (Number.isNaN(createdAt.getTime())) return false;
        if (filters.dateRange === 'today' && createdAt < startOfToday) return false;
        if (filters.dateRange === 'week' && createdAt < startOfWeek) return false;
        if (filters.dateRange === 'month' && createdAt < startOfMonth) return false;
      }

      if (filters.department !== 'all') {
        const requesterDepartment = profileMap.get(ticket.requester_id)?.department_id;
        const assigneeDepartment = ticket.assignee_id ? profileMap.get(ticket.assignee_id)?.department_id : null;
        if (requesterDepartment !== filters.department && assigneeDepartment !== filters.department) return false;
      }

      return true;
    });
  };

  function getAvailableFilterOptions(data: DashboardRawData): DashboardFilterOptions {
    const profileMap = new Map(data.profiles.map((p: any) => [p.user_id, p]));
    const baseFilters = filters;
    const hasMatches = (override: Partial<FiltersState>) => (
      filterTicketsWithFilters(data.tickets, profileMap, { ...baseFilters, ...override }).length > 0
    );

    return {
      dateRange: dateRangeOptions.filter(value => value === 'all' || hasMatches({ dateRange: value })),
      priority: priorityOptions.filter(value => value === 'all' || hasMatches({ priority: value })),
      status: statusOptions.filter(value => value === 'all' || hasMatches({ status: value })),
      assignee: [
        'all',
        ...data.agentUsers
          .map((agent: any) => agent.user_id)
          .filter((id: string) => hasMatches({ assignee: id })),
      ],
      department: [
        'all',
        ...departments
          .map(department => department.id)
          .filter((id: string) => hasMatches({ department: id })),
      ],
    };
  }

  function filterTicketsWithFilters(tickets: any[], profileMap: Map<string, any>, activeFilters: FiltersState) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = subDays(startOfToday, 6);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return tickets.filter((ticket: any) => {
      if (activeFilters.priority !== 'all' && ticket.priority !== activeFilters.priority) return false;
      if (activeFilters.status !== 'all' && ticket.status !== activeFilters.status) return false;
      if (activeFilters.assignee !== 'all' && ticket.assignee_id !== activeFilters.assignee) return false;

      if (activeFilters.dateRange !== 'all') {
        const createdAt = new Date(ticket.created_at);
        if (Number.isNaN(createdAt.getTime())) return false;
        if (activeFilters.dateRange === 'today' && createdAt < startOfToday) return false;
        if (activeFilters.dateRange === 'week' && createdAt < startOfWeek) return false;
        if (activeFilters.dateRange === 'month' && createdAt < startOfMonth) return false;
      }

      if (activeFilters.department !== 'all') {
        const requesterDepartment = profileMap.get(ticket.requester_id)?.department_id;
        const assigneeDepartment = ticket.assignee_id ? profileMap.get(ticket.assignee_id)?.department_id : null;
        if (requesterDepartment !== activeFilters.department && assigneeDepartment !== activeFilters.department) return false;
      }

      return true;
    });
  }

  const applyDashboardFilters = (data: DashboardRawData) => {
    const profileMap = new Map(data.profiles.map((p: any) => [p.user_id, p]));
    const tickets = filterTickets(data.tickets, profileMap);
    const visibleTicketIds = new Set(tickets.map((ticket: any) => ticket.id));
    const visibleSlaData = data.slaData.filter((s: any) => visibleTicketIds.has(pick<string>(s, 'ticket_id', 'ticketId')));
    const breachedTicketIds = new Set(visibleSlaData
      .filter((s: any) => pick<boolean>(s, 'breached_response', 'breachedResponse') || pick<boolean>(s, 'breached_resolve', 'breachedResolve'))
      .map((s: any) => pick<string>(s, 'ticket_id', 'ticketId')));
    const slaByTicketId = new Map(visibleSlaData.map((s: any) => [pick<string>(s, 'ticket_id', 'ticketId'), s]));
    const groupMap = new Map(data.groups.map((group: any) => [group.id, group.name]));

    setEmployeeKpiRows(data.performanceRows);

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
      const totalSla = visibleSlaData.length;
      const withinSla = visibleSlaData.filter((s: any) =>
        !pick<boolean>(s, 'breached_response', 'breachedResponse') &&
        !pick<boolean>(s, 'breached_resolve', 'breachedResolve')
      ).length;
      setSlaPerformance(totalSla > 0 ? Math.round((withinSla / totalSla) * 100) : 100);

      // Recent tickets with names
      const recent = tickets.slice(0, 8);
      setRecentTickets(recent.map((t: any) => ({
        ...t,
        requester_name: profileMap.get(t.requester_id)?.name || '-',
        assignee_name: t.assignee_id ? profileMap.get(t.assignee_id)?.name || '-' : '-',
      })));

      // Recent activity
      const history = data.historyData
        .filter((historyItem: any) => visibleTicketIds.has(pick<string>(historyItem, 'ticket_id', 'ticketId')))
        .map((historyItem: any) => ({
        ...historyItem,
        actor_id: pick<string>(historyItem, 'actor_id', 'actorId') || '',
        ticket_id: pick<string>(historyItem, 'ticket_id', 'ticketId') || '',
        old_value: pick<string | null>(historyItem, 'old_value', 'oldValue') || null,
        new_value: pick<string | null>(historyItem, 'new_value', 'newValue') || null,
        created_at: pick<string>(historyItem, 'created_at', 'createdAt') || new Date().toISOString(),
      })).slice(0, 15);
      const ticketMap = new Map(tickets.map((t: any) => [t.id, t.title]));
      setRecentActivity(history.map((h: any) => ({
        ...h,
        actor_name: profileMap.get(h.actor_id)?.name || '-',
        ticket_title: ticketMap.get(h.ticket_id) || '-',
      })));

      // Team workload
      const activeTickets = tickets.filter((t: any) => ['new', 'assigned', 'in_progress'].includes(t.status));
      setTeamMembers(data.agentUsers.map((a: any) => {
        const myTickets = activeTickets.filter((t: any) => t.assignee_id === a.user_id);
        const roleEntry = data.agentRoles.find((r: any) => r.user_id === a.user_id);
        const responseTimes = myTickets
          .map((ticket: any) => {
            const sla = slaByTicketId.get(ticket.id);
            const respondedAt = pick<string>(sla, 'responded_at', 'respondedAt');
            if (!respondedAt) return null;
            const createdAt = new Date(ticket.created_at).getTime();
            const responseAt = new Date(respondedAt).getTime();
            if (Number.isNaN(createdAt) || Number.isNaN(responseAt) || responseAt < createdAt) return null;
            return Math.round((responseAt - createdAt) / 60000);
          })
          .filter((minutes): minutes is number => minutes !== null);
        const avgResponseMin = responseTimes.length
          ? Math.round(responseTimes.reduce((sum, minutes) => sum + minutes, 0) / responseTimes.length)
          : 0;
        const position = a.group_id ? groupMap.get(a.group_id) : null;
        return {
          id: a.user_id,
          name: a.name,
          role: position || (roleEntry?.role === 'admin' ? 'Admin' : roleEntry?.role === 'manager' ? 'Manager' : 'Agent'),
          activeTickets: myTickets.length,
          avgResponseMin,
        };
      }));
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
          <DashboardFilters filters={filters} onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))} onReset={() => setFilters(defaultFilters)} departments={departments} agents={agents} filterOptions={filterOptions} />
        </motion.div>
      )}

      <motion.div variants={itemVariants}><KPICards {...kpi} /></motion.div>

      {isAdmin && (
        <motion.div variants={itemVariants}>
          <EmployeeKpiSummary rows={employeeKpiRows} />
        </motion.div>
      )}

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

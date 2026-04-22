import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface FiltersState {
  dateRange: string;
  priority: string;
  status: string;
  assignee: string;
  department: string;
}

interface DashboardFiltersProps {
  filters: FiltersState;
  onFilterChange: (key: keyof FiltersState, value: string) => void;
  onReset: () => void;
  departments: { id: string; name: string }[];
  agents: { id: string; name: string }[];
}

export default function DashboardFilters({ filters, onFilterChange, onReset, departments, agents }: DashboardFiltersProps) {
  const { t } = useLanguage();
  const hasFilters = Object.values(filters).some(v => v && v !== 'all');

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border bg-card">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        {t('dashboard.filters')}
      </div>

      <Select value={filters.dateRange} onValueChange={(v) => onFilterChange('dateRange', v)}>
        <SelectTrigger className="w-[150px] h-9 text-xs">
          <SelectValue placeholder={t('dashboard.filter.period')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('dashboard.filter.allTime')}</SelectItem>
          <SelectItem value="today">{t('dashboard.filter.today')}</SelectItem>
          <SelectItem value="week">{t('dashboard.filter.week')}</SelectItem>
          <SelectItem value="month">{t('dashboard.filter.month')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={(v) => onFilterChange('priority', v)}>
        <SelectTrigger className="w-[140px] h-9 text-xs">
          <SelectValue placeholder={t('dashboard.filter.priority')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('ticket.list.allPriorities')}</SelectItem>
          <SelectItem value="critical">{t('ticket.priority.critical')}</SelectItem>
          <SelectItem value="high">{t('ticket.priority.high')}</SelectItem>
          <SelectItem value="medium">{t('ticket.priority.medium')}</SelectItem>
          <SelectItem value="low">{t('ticket.priority.low')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => onFilterChange('status', v)}>
        <SelectTrigger className="w-[140px] h-9 text-xs">
          <SelectValue placeholder={t('dashboard.filter.status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('ticket.list.allStatuses')}</SelectItem>
          <SelectItem value="new">{t('ticket.status.new')}</SelectItem>
          <SelectItem value="assigned">{t('ticket.status.assigned')}</SelectItem>
          <SelectItem value="in_progress">{t('ticket.status.inProgress')}</SelectItem>
          <SelectItem value="resolved">{t('ticket.status.resolved')}</SelectItem>
          <SelectItem value="closed">{t('ticket.status.closed')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.department} onValueChange={(v) => onFilterChange('department', v)}>
        <SelectTrigger className="w-[150px] h-9 text-xs">
          <SelectValue placeholder={t('dashboard.filter.department')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('dashboard.filter.allDepartments')}</SelectItem>
          {departments.map(d => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.assignee} onValueChange={(v) => onFilterChange('assignee', v)}>
        <SelectTrigger className="w-[150px] h-9 text-xs">
          <SelectValue placeholder={t('dashboard.filter.assignee')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all')}</SelectItem>
          {agents.map(a => (
            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-9 text-xs text-muted-foreground">
          <X className="h-3 w-3 mr-1" />
          {t('dashboard.filter.reset')}
        </Button>
      )}
    </div>
  );
}

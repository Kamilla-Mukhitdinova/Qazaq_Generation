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

interface DashboardFilterOptions {
  dateRange: string[];
  priority: string[];
  status: string[];
  assignee: string[];
  department: string[];
}

interface DashboardFiltersProps {
  filters: FiltersState;
  onFilterChange: (key: keyof FiltersState, value: string) => void;
  onReset: () => void;
  departments: { id: string; name: string; nameEn?: string }[];
  agents: { id: string; name: string }[];
  filterOptions: DashboardFilterOptions;
}

export default function DashboardFilters({ filters, onFilterChange, onReset, departments, agents, filterOptions }: DashboardFiltersProps) {
  const { t, language } = useLanguage();
  const deptName = (d: { name: string; nameEn?: string }) => {
    if (language !== 'en') return d.name;
    const fallback: Record<string, string> = {
      'HR бөлімі': 'HR Department',
      'IT бөлімі': 'IT Department',
      'Қаржы бөлімі': 'Finance Department',
      'ПТО': 'Engineering Department',
    };
    return d.nameEn || fallback[d.name] || d.name;
  };
  const personName = (name: string) => {
    if (language !== 'en') return name;
    const map: Record<string, string> = {
      'Лия Жарылқасын': 'Liya Zharylkassyn',
      'Аиша Нурланова': 'Aisha Nurlanova',
      'Камилла Қайратқызы': 'Kamilla Kairatkyzy',
      'Камилла Мұхитдинова': 'Kamilla Mukhitdinova',
      'Дәулетова Дильмира Дильмуратовна': 'Dauletova Dilmira Dilmuratovna',
    };
    return map[name] || name;
  };
  const hasFilters = Object.values(filters).some(v => v && v !== 'all');
  const hasOption = (key: keyof DashboardFilterOptions, value: string) => filterOptions[key].includes(value);

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
          <SelectItem value="today" disabled={!hasOption('dateRange', 'today')}>{t('dashboard.filter.today')}</SelectItem>
          <SelectItem value="week" disabled={!hasOption('dateRange', 'week')}>{t('dashboard.filter.week')}</SelectItem>
          <SelectItem value="month" disabled={!hasOption('dateRange', 'month')}>{t('dashboard.filter.month')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={(v) => onFilterChange('priority', v)}>
        <SelectTrigger className="w-[140px] h-9 text-xs">
          <SelectValue placeholder={t('dashboard.filter.priority')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('ticket.list.allPriorities')}</SelectItem>
          <SelectItem value="critical" disabled={!hasOption('priority', 'critical')}>{t('ticket.priority.critical')}</SelectItem>
          <SelectItem value="high" disabled={!hasOption('priority', 'high')}>{t('ticket.priority.high')}</SelectItem>
          <SelectItem value="medium" disabled={!hasOption('priority', 'medium')}>{t('ticket.priority.medium')}</SelectItem>
          <SelectItem value="low" disabled={!hasOption('priority', 'low')}>{t('ticket.priority.low')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => onFilterChange('status', v)}>
        <SelectTrigger className="w-[140px] h-9 text-xs">
          <SelectValue placeholder={t('dashboard.filter.status')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('ticket.list.allStatuses')}</SelectItem>
          <SelectItem value="new" disabled={!hasOption('status', 'new')}>{t('ticket.status.new')}</SelectItem>
          <SelectItem value="assigned" disabled={!hasOption('status', 'assigned')}>{t('ticket.status.assigned')}</SelectItem>
          <SelectItem value="in_progress" disabled={!hasOption('status', 'in_progress')}>{t('ticket.status.inProgress')}</SelectItem>
          <SelectItem value="resolved" disabled={!hasOption('status', 'resolved')}>{t('ticket.status.resolved')}</SelectItem>
          <SelectItem value="closed" disabled={!hasOption('status', 'closed')}>{t('ticket.status.closed')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.department} onValueChange={(v) => onFilterChange('department', v)}>
        <SelectTrigger className="w-[150px] h-9 text-xs">
          <SelectValue placeholder={t('dashboard.filter.department')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('dashboard.filter.allDepartments')}</SelectItem>
          {departments.map(d => (
            <SelectItem key={d.id} value={d.id} disabled={!hasOption('department', d.id)}>{deptName(d)}</SelectItem>
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
            <SelectItem key={a.id} value={a.id} disabled={!hasOption('assignee', a.id)}>{personName(a.name)}</SelectItem>
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

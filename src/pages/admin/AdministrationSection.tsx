import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import {
  BookOpen,
  Bot,
  Boxes,
  Cable,
  CheckSquare,
  CircleAlert,
  ClipboardList,
  CloudDownload,
  Copy,
  Database,
  Download,
  FilePenLine,
  FileText,
  FolderTree,
  History,
  Import,
  KeyRound,
  Laptop,
  Layers,
  Link as LinkIcon,
  ListFilter,
  Loader2,
  Logs,
  Mail,
  MapPin,
  Monitor,
  Network,
  PenLine,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
  Upload,
  UserCog,
  UserPlus,
  Users,
  UsersRound,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

type AdminSection =
  | 'users'
  | 'groups'
  | 'organizations'
  | 'rules'
  | 'directories'
  | 'profiles'
  | 'notification-queue'
  | 'logs'
  | 'equipment'
  | 'glpi-inventory'
  | 'forms';

interface SectionMeta {
  title: string;
  icon: LucideIcon;
}

interface TableColumn {
  key: string;
  label: string;
  className?: string;
}

type TableRowData = Record<string, React.ReactNode>;
type AppRole = 'employee' | 'agent' | 'manager' | 'admin';

type AdminUserRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  departmentId: string | null;
  groupId: string | null;
  createdAt: string;
  role: AppRole;
};

type AdminGroupRow = {
  id: string;
  name: string;
  departmentId: string | null;
  createdAt: string;
};

type AdminDepartmentRow = {
  id: string;
  name: string;
  createdAt: string;
};

type NewAdminUserForm = {
  name: string;
  email: string;
  password: string;
  role: AppRole;
  departmentId: string | null;
  groupId: string | null;
};

function displayDepartmentName(name: string, language: string, nameEn?: string | null) {
  if (language !== 'en') return name;
  const map: Record<string, string> = {
    'HR бөлімі': 'HR Department',
    'IT бөлімі': 'IT Department',
    'Қаржы бөлімі': 'Finance Department',
    'ПТО': 'Engineering Department',
  };
  return nameEn || map[name] || name;
}

function displayGroupName(name: string, language: string) {
  if (language !== 'en') return name;
  const value = name.toLowerCase();
  if (value.includes('перв') || value.includes('1 линия') || value.includes('1-линия')) return 'First-line Engineer';
  if (value.includes('втор') || value.includes('2 линия') || value.includes('2-линия')) return 'Second-line Engineer';
  if (value.includes('трет') || value.includes('3 линия') || value.includes('3-линия')) return 'Third-line Engineer';
  if (value.includes('инженер')) return 'Engineer';
  const map: Record<string, string> = {
    'Не указана': 'Not specified',
    'Группа не указана': 'Group not specified',
  };
  return map[name] || name;
}

function displayPersonName(name: string, language: string) {
  if (language !== 'en') return name;
  const map: Record<string, string> = {
    'Лия Жарылқасын': 'Liya Zharylkassyn',
    'Аиша Нурланова': 'Aisha Nurlanova',
    'Камилла Қайратқызы': 'Kamilla Kairatkyzy',
    'Камилла Мұхитдинова': 'Kamilla Mukhitdinova',
    'Даулетова Дильмира Дильмурратовна': 'Dauletova Dilmira Dilmuratovna',
    'Дәулетова Дильмира Дильмуртовна': 'Dauletova Dilmira Dilmuratovna',
    'Дәулетова Дильмира Дильмуратовна': 'Dauletova Dilmira Dilmuratovna',
  };
  return map[name] || name;
}

const initialNewAdminUserForm: NewAdminUserForm = {
  name: '',
  email: '',
  password: 'qazaq123',
  role: 'employee',
  departmentId: null,
  groupId: null,
};

const sectionMeta: Record<AdminSection, SectionMeta> = {
  users: { title: 'Пользователи', icon: UserCog },
  groups: { title: 'Группы', icon: UsersRound },
  organizations: { title: 'Отделы', icon: Layers },
  rules: { title: 'Правила', icon: BookOpen },
  directories: { title: 'Справочники', icon: BookOpen },
  profiles: { title: 'Профили', icon: UserCog },
  'notification-queue': { title: 'Очередь уведомлений', icon: ClipboardList },
  logs: { title: 'Логи', icon: Logs },
  equipment: { title: 'Оборудование', icon: CloudDownload },
  'glpi-inventory': { title: 'GLPI Inventory', icon: Settings },
  forms: { title: 'Формы', icon: FilePenLine },
};

const fallbackUsers = [
  ['A-Abdrakhmanova', 'Абдрахманова', 'Алмаз', 'A.Abdrakhmanova@sk.kz', '+7 7172 55 2669', 'Да', 'Департамент бухгалтерского учета и финансовой отчетности', '238'],
  ['A-Abdugaliyev', 'Абдугалиев', 'Ауэзхан', 'a.abdugaliyev@sk.kz', '+7 7172 55 4117', 'Нет', 'Департамент энергетических и горнорудных активов', '1191'],
  ['A-Adambekova', 'Адамбекова', 'Айжан', 'A.Adambekova@sk.kz', '+7 7172 55 2679', 'Да', 'Департамент бухгалтерского учета и финансовой отчетности', '237'],
  ['A-Aidarbaeyeva', 'Айдана', 'Айдарбаева', 'a.aidarbaeyeva@sk.kz', '+7 7172 55 2617', 'Да', 'Департамент финансово-экономического управления активами', '1384'],
  ['a-akbergenova', 'Акбергенова', 'Айгерим', 'A.Akbergenova@sk.kz', '+7 7172 55 2693', 'Нет', 'Департамент по связям с общественностью', '80'],
];

const profileRows = [
  ['01 Пользователь (Self-Service)', '1', 'Да', '24-12-2024 17:47', 'Пользователи систем'],
  ['Hotliner', '5', 'Нет', '', ''],
  ['IT архитектор (Фонд SK)', '13', 'Нет', '23-05-2024 20:49', 'Работники ДИТ SK'],
  ['Observer', '2', 'Нет', '', ''],
  ['Read-Only', '8', 'Нет', '', 'This profile defines read-only access. It is used when objects are locked.'],
  ['Super-Admin', '4', 'Нет', '07-11-2023 17:24', ''],
  ['Supervisor', '7', 'Нет', '', ''],
  ['Администратор управления (ID Support)', '3', 'Нет', '10-01-2025 17:34', ''],
  ['Аудитор (Фонд SK)', '19', 'Нет', '24-12-2024 18:00', 'Аудит'],
  ['Техническая поддержка (ID Support)', '6', 'Нет', '10-01-2025 17:28', ''],
  ['Техническая поддержка (MPS Support)', '16', 'Нет', '23-05-2024 20:59', ''],
];

const groupFallbackRows = [
  ['Group VIP', 'АО ФНБ Самрук Казына', 'Только VIP пользователи', 'Да', '10'],
  ['Service Desk (ID Support SK)', 'АО ФНБ Самрук Казына', '', 'Да', '16'],
  ['Service Desk (ID Support SK) > 1 и 2 линия, техническая поддержка (IDSupport SK)', 'АО ФНБ Самрук Казына', '', 'Да', '19'],
  ['Service Desk (ID Support SK) > 1 линия, Операторы ID Support', 'АО ФНБ Самрук Казына', '', 'Да', '1'],
  ['Service Desk (ID Support SK) > 2 линия, Инженеры ID Support', 'АО ФНБ Самрук Казына', '', 'Да', '2'],
  ['Service Desk (ID Support SK) > 3 линия, Администраторы ID Support', 'АО ФНБ Самрук Казына', '', 'Да', '14'],
  ['Service Desk (MPS)', 'АО ФНБ Самрук Казына', '', 'Да', '25'],
];

const ruleRows = [
  ['No creation on partial import', 'Это часть ▸ равен ▸ Да\nАктив > Тип элемента ▸ не существует ▸ Да', 'Связь Оборудования ▸ Назначить ▸ Импорт запрещён (без лога)'],
  ['Global update (by mac+ifnumber restricted port)', 'Актив > Тип элемента ▸ не существует ▸ Да\nАктив > Сетевой порт > MAC ▸ уже присутствует ▸ Да\nАктив > Сетевой порт > Номер порта ▸ уже присутствует ▸ Да', 'Связь Оборудования ▸ Назначить ▸ Связать по возможности'],
  ['Global update (by mac+ifnumber not restricted port)', 'Актив > Тип элемента ▸ не существует ▸ Да\nАктив > Сетевой порт > MAC ▸ существует ▸ Да', 'Связь Оборудования ▸ Назначить ▸ Связать по возможности'],
];

const logRows = [
  ['Система', '', '12-05-2026 05:43', 'Подключение', '3', 'b-karipbayev login from IP 10.75.14.72'],
  ['Система', '', '12-05-2026 05:43', 'Подключение', '3', 'B-Karipbayev login from IP 10.75.14.72'],
  ['Система', '', '08-05-2026 10:49', 'Подключение', '3', 'Failed login for from IP 10.75.14.77'],
  ['Система', '', '04-05-2026 12:38', 'Подключение', '3', 'n-dauletkhan login from IP 10.75.14.165'],
  ['Заявки', '55332', '04-05-2026 12:15', 'Заявки', '4', 'B-Karipbayev обновил объект'],
  ['Заявки', '55332', '04-05-2026 12:09', 'Заявки', '4', 'B-Karipbayev добавляет объект 55332'],
  ['Система', '', '30-04-2026 05:21', 'Подключение', '3', 'b-karipbayev login from IP 10.75.14.73'],
  ['Заявки', '55269', '04-05-2026 06:52', 'Заявки', '4', 'n-dauletkhan удалил объект'],
];

const formRows = [
  ['Заявка на доступ', 'Активна', 'Пользователи', '12', 'ID Support'],
  ['Регистрация инцидента', 'Активна', 'Служба поддержки', '8', 'Service Desk'],
  ['Запрос оборудования', 'Черновик', 'Активы', '5', 'ITSM'],
  ['Согласование изменений', 'Активна', 'Менеджеры', '4', 'Change management'],
];

function getSection(pathname: string): AdminSection {
  const value = pathname.split('/').filter(Boolean).pop() as AdminSection | undefined;
  return value && value in sectionMeta ? value : 'users';
}

function AdminShell({ section, children, actions }: { section: AdminSection; children: React.ReactNode; actions?: React.ReactNode }) {
  const meta = sectionMeta[section];
  const Icon = meta.icon;

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50 pb-8 text-slate-700">
      <div className="sticky top-0 z-10 -mx-6 -mt-6 border-b bg-white px-8 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-2 text-lg text-slate-500">
            <span>Главная</span>
            <span>/</span>
            <ShieldCheck className="mt-1 h-5 w-5" />
            <span>Администрирование</span>
            <span>/</span>
            <Icon className="mt-1 h-5 w-5" />
            <span className="font-medium text-slate-700">{meta.title}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {actions}
            <div className="relative w-80 max-w-full">
              <Input placeholder="Поиск..." className="h-11 rounded-md border-slate-300 bg-white pr-11 text-base" />
              <Search className="absolute right-3 top-3 h-5 w-5 text-blue-800" />
            </div>
            <div className="hidden min-w-48 md:block">
              <p className="text-lg text-slate-600">Super-Admin</p>
              <p className="text-sm text-slate-500">...азына &gt; ID Support</p>
            </div>
            <Button className="h-12 rounded-md bg-blue-500 px-4 text-base text-white hover:bg-blue-600">БК</Button>
          </div>
        </div>
      </div>
      <div className="pt-7">{children}</div>
    </div>
  );
}

function SearchBox({ globalRule = true }: { globalRule?: boolean }) {
  return (
    <div className="mb-7 overflow-hidden rounded-md border border-blue-300 bg-white">
      <div className="flex flex-wrap items-center gap-2 bg-blue-50 px-6 py-5">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-900">-</Button>
        <Select defaultValue="blank"><SelectTrigger className="h-11 w-24 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="blank">-----</SelectItem></SelectContent></Select>
        <Select defaultValue="visible"><SelectTrigger className="h-11 w-56 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="visible">Видимые объекты</SelectItem></SelectContent></Select>
        <Select defaultValue="contains"><SelectTrigger className="h-11 w-36 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contains">содержит</SelectItem></SelectContent></Select>
        <Input className="h-11 w-64 bg-white" />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t px-6 py-4">
        <Button variant="outline" className="h-9 border-blue-900 text-blue-900"><Plus className="mr-2 h-4 w-4" /> правило</Button>
        {globalRule && <Button variant="outline" className="h-9 border-blue-900 text-blue-900"><Plus className="mr-2 h-4 w-4" /> глобальное правило</Button>}
        <Button variant="outline" className="h-9 border-blue-900 text-blue-900">{"{+}"} группа</Button>
        <Button className="h-9 bg-amber-400 text-slate-900 hover:bg-amber-500"><ListFilter className="mr-2 h-4 w-4" /> Поиск</Button>
        <Button variant="ghost" size="icon"><Star className="h-5 w-5 text-blue-900" /></Button>
        <Button variant="ghost" size="icon"><CircleAlert className="h-5 w-5 text-blue-900" /></Button>
      </div>
    </div>
  );
}

function TableToolbar({ extraIcons = true }: { extraIcons?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-white px-6 py-4">
      <Button variant="outline" className="h-10 border-blue-900 text-blue-900">↩ Действие</Button>
      <Switch defaultChecked />
      {extraIcons && (
        <>
          <Search className="h-6 w-6 text-blue-900" />
          <Wrench className="h-6 w-6 text-blue-900" />
          <Download className="h-5 w-5 text-blue-900" />
        </>
      )}
    </div>
  );
}

function DataTable({ columns, rows, count, className }: { columns: TableColumn[]; rows: TableRowData[]; count?: string; className?: string }) {
  return (
    <Card className={cn('overflow-hidden rounded-md border-slate-200 shadow-sm', className)}>
      <TableToolbar />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-12 px-4 py-3 text-left"><input type="checkbox" className="h-5 w-5 rounded border-slate-300" /></th>
              {columns.map((column) => <th key={column.key} className={cn('px-4 py-3 text-left font-semibold', column.className)}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className={cn(index % 2 ? 'bg-slate-100/70' : 'bg-white', 'border-t border-slate-200 align-top')}>
                <td className="px-4 py-3"><input type="checkbox" className="h-5 w-5 rounded border-slate-300" /></td>
                {columns.map((column) => <td key={column.key} className={cn('px-4 py-3 leading-6', column.className)}>{row[column.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-slate-50 px-6 py-4 text-sm text-slate-500">
        <div className="flex items-center gap-3"><Select defaultValue="50"><SelectTrigger className="h-9 w-28 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="50">50</SelectItem></SelectContent></Select><span>строк на странице</span></div>
        <span>{count || `Отображаются строки с 1 по ${rows.length} из ${rows.length}`}</span>
      </div>
    </Card>
  );
}

function UsersView() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { language } = useLanguage();
  const t = (ru: string, en: string) => (language === 'en' ? en : ru);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUserRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewAdminUserForm>(initialNewAdminUserForm);
  const [saving, setSaving] = useState(false);

  const roleLabels: Record<AppRole, string> = {
    admin: t('Администратор', 'Administrator'),
    manager: t('Менеджер', 'Manager'),
    agent: t('Инженер', 'Engineer'),
    employee: t('Пользователь', 'User'),
  };

  const roleDescriptions: Record<AppRole, string> = {
    employee: t('Может создать заявку и отслеживать только свои обращения.', 'Can create tickets and track only their own requests.'),
    agent: t('Работает с заявками поддержки. Для инженера нужно выбрать линию/группу.', 'Works with support tickets. Select a line/group for an engineer.'),
    manager: t('Видит управленческие разделы и отчеты без администрирования ролей.', 'Can view management sections and reports without role administration.'),
    admin: t('Полный доступ, включая перевод пользователей в инженеры и другие роли.', 'Full access, including assigning users to engineer and other roles.'),
  };

  const roleColors: Record<AppRole, string> = {
    admin: 'bg-red-500/10 text-red-700 border-red-500/20',
    manager: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
    agent: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    employee: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
  };

  const getRoleLabel = (user: AdminUserRow) => {
    if (user.role !== 'agent') return roleLabels[user.role];

    const group = groupName(user.groupId).toLowerCase();
    if (group.includes('1 линия') || group.includes('1-линия') || group.includes('перв') || group.includes('first')) return t('Инженер первой линии', 'First-line Engineer');
    if (group.includes('2 линия') || group.includes('2-линия') || group.includes('втор') || group.includes('second')) return t('Инженер второй линии', 'Second-line Engineer');
    if (group.includes('3 линия') || group.includes('3-линия') || group.includes('трет') || group.includes('third')) return t('Инженер третьей линии', 'Third-line Engineer');
    return roleLabels.agent;
  };

  const normalizeUser = (profile: any, roleMap: Map<string, AppRole>, index: number): AdminUserRow => {
    const userId = profile.user_id || profile.userId || profile.id || `user-${index}`;
    return {
      id: profile.id || userId,
      userId,
      name: profile.name || t('Без имени', 'Unnamed user'),
      email: profile.email || '-',
      departmentId: profile.department_id || profile.departmentId || null,
      groupId: profile.group_id || profile.groupId || null,
      createdAt: profile.created_at || profile.createdAt || new Date().toISOString(),
      role: roleMap.get(userId) || 'employee',
    };
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [profiles, roles, depts, grps] = await Promise.all([
        api.getProfiles(),
        api.getUserRoles(),
        api.getDepartments(),
        api.getGroups(),
      ]);
      const roleMap = new Map<string, AppRole>((roles || []).map((role: any) => [
        role.user_id || role.userId,
        role.role || 'employee',
      ]));
      setDepartments(depts || []);
      setGroups(grps || []);
      setUsers((profiles || []).map((profile: any, index: number) => normalizeUser(profile, roleMap, index)));
    } catch (error) {
      console.error(error);
      toast({ title: t('Ошибка', 'Error'), description: t('Не удалось загрузить пользователей', 'Failed to load users'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const departmentName = (id: string | null) => {
    const department = departments.find((item) => item.id === id);
    return department ? displayDepartmentName(department.name, language, department.name_en || department.nameEn) : t('Не указан', 'Not specified');
  };
  const groupName = (id: string | null) => {
    const group = groups.find((item) => item.id === id);
    return group ? displayGroupName(group.name, language) : t('Не указана', 'Not specified');
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || [
      user.name,
      user.email,
      getRoleLabel(user),
      departmentName(user.departmentId),
      groupName(user.groupId),
    ].some((value) => value.toLowerCase().includes(query));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    if (editingUser.role === 'agent' && !editingUser.groupId) {
      toast({ title: t('Выберите линию', 'Select a line'), description: t('Для инженера нужно указать группу: первая, вторая или третья линия.', 'For an engineer, select a first, second, or third-line group.'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await api.updateUser(editingUser.userId, {
        name: editingUser.name,
        departmentId: editingUser.departmentId,
        groupId: editingUser.groupId,
      });
      await api.updateUserRole(editingUser.userId, editingUser.role);
      setEditingUser(null);
      toast({ title: t('Готово', 'Done'), description: t('Пользователь обновлён', 'User updated') });
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast({ title: t('Ошибка', 'Error'), description: t('Не удалось обновить пользователя', 'Failed to update user'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name.trim()) {
      toast({ title: t('Ошибка', 'Error'), description: t('Укажите имя пользователя', 'Enter the user name'), variant: 'destructive' });
      return;
    }
    if (!newUser.email.trim() || !newUser.email.includes('@')) {
      toast({ title: t('Ошибка', 'Error'), description: t('Укажите корректный email', 'Enter a valid email'), variant: 'destructive' });
      return;
    }
    if (newUser.password.length < 6) {
      toast({ title: t('Ошибка', 'Error'), description: t('Пароль должен быть не короче 6 символов', 'Password must be at least 6 characters long'), variant: 'destructive' });
      return;
    }
    if (newUser.role === 'agent' && !newUser.groupId) {
      toast({ title: t('Выберите линию', 'Select a line'), description: t('Для инженера нужно указать группу: первая, вторая или третья линия.', 'For an engineer, select a first, second, or third-line group.'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await api.createUser({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
        departmentId: newUser.departmentId,
        groupId: newUser.groupId,
      });
      setCreateOpen(false);
      setNewUser(initialNewAdminUserForm);
      toast({ title: t('Готово', 'Done'), description: t('Пользователь добавлен', 'User added') });
      fetchUsers();
    } catch (error: any) {
      toast({ title: t('Ошибка', 'Error'), description: error.message || t('Не удалось добавить пользователя', 'Failed to add user'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    if (deletingUser.userId === currentUser?.id) {
      toast({ title: t('Ошибка', 'Error'), description: t('Нельзя удалить свой текущий аккаунт', 'You cannot delete your current account'), variant: 'destructive' });
      setDeletingUser(null);
      return;
    }

    setSaving(true);
    try {
      await api.deleteUser(deletingUser.userId);
      toast({ title: t('Готово', 'Done'), description: t('Пользователь удалён', 'User deleted') });
      setDeletingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: t('Ошибка', 'Error'), description: error.message || t('Не удалось удалить пользователя', 'Failed to delete user'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    { label: t('Всего пользователей', 'Total users'), value: users.length },
    { label: t('Обычные пользователи', 'Regular users'), value: users.filter((user) => user.role === 'employee').length },
    { label: t('Инженеры', 'Engineers'), value: users.filter((user) => user.role === 'agent').length },
    { label: t('Админы и менеджеры', 'Admins and managers'), value: users.filter((user) => user.role === 'manager' || user.role === 'admin').length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{t('Главная', 'Dashboard')}</span>
            <span>/</span>
            <span>{t('Администрирование', 'Administration')}</span>
            <span>/</span>
            <span className="font-medium text-foreground">{t('Пользователи', 'Users')}</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <UserCog className="h-6 w-6 text-primary" />
            {t('Управление пользователями', 'User Management')}
          </h1>
          <p className="text-muted-foreground">{t('Новые регистрации становятся обычными пользователями. Админ при необходимости назначает роль инженера или сотрудника.', 'New registrations become regular users. An admin can assign engineer or staff roles when needed.')}</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" />
          {t('Добавить пользователя', 'Add User')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="rounded-lg">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-lg">
        <CardHeader className="gap-4 border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>{t('Список пользователей', 'User List')}</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('Поиск по имени, email, отделу', 'Search by name, email, department')}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={(value: AppRole | 'all') => setRoleFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('Все роли', 'All roles')}</SelectItem>
                  {(['employee', 'agent', 'manager', 'admin'] as AppRole[]).map((role) => (
                    <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-56 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">{t('Пользователь', 'User')}</th>
                    <th className="px-5 py-3 font-medium">{t('Роль', 'Role')}</th>
                    <th className="px-5 py-3 font-medium">{t('Отдел', 'Department')}</th>
                    <th className="px-5 py-3 font-medium">{t('Группа', 'Group')}</th>
                    <th className="px-5 py-3 font-medium">{t('Дата регистрации', 'Registration Date')}</th>
                    <th className="px-5 py-3 text-right font-medium">{t('Действия', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/35">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {displayPersonName(user.name, language).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{displayPersonName(user.name, language)}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className={roleColors[user.role]}>{getRoleLabel(user)}</Badge>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{departmentName(user.departmentId)}</td>
                      <td className="px-5 py-4 text-muted-foreground">{groupName(user.groupId)}</td>
                      <td className="px-5 py-4 text-muted-foreground">{format(new Date(user.createdAt), 'dd.MM.yyyy')}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingUser({ ...user })} aria-label={t('Редактировать пользователя', 'Edit user')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeletingUser(user)}
                            disabled={user.userId === currentUser?.id}
                            aria-label={t('Удалить пользователя', 'Delete user')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="h-40 px-5 text-center text-muted-foreground">{t('Пользователи не найдены', 'No users found')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Редактировать пользователя', 'Edit User')}</DialogTitle>
            <DialogDescription>{t('Переведите пользователя в нужную роль и укажите линию для инженера', 'Assign the required role and select a line for an engineer')}</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('Имя', 'Name')}</Label>
                <Input value={editingUser.name} onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Роль', 'Role')}</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value: AppRole) => setEditingUser({
                    ...editingUser,
                    role: value,
                    groupId: value === 'agent' ? editingUser.groupId : null,
                  })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['employee', 'agent', 'manager', 'admin'] as AppRole[]).map((role) => (
                      <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{roleDescriptions[editingUser.role]}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('Отдел', 'Department')}</Label>
                <Select value={editingUser.departmentId || 'none'} onValueChange={(value) => setEditingUser({ ...editingUser, departmentId: value === 'none' ? null : value, groupId: null })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('Не указан', 'Not specified')}</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>{displayDepartmentName(department.name, language, department.name_en || department.nameEn)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{editingUser.role === 'agent' ? t('Линия / группа инженера *', 'Engineer line / group *') : t('Группа', 'Group')}</Label>
                <Select value={editingUser.groupId || 'none'} onValueChange={(value) => setEditingUser({ ...editingUser, groupId: value === 'none' ? null : value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('Не указана', 'Not specified')}</SelectItem>
                    {groups
                      .filter((group) => !editingUser.departmentId || group.department_id === editingUser.departmentId || group.departmentId === editingUser.departmentId)
                      .map((group) => (
                        <SelectItem key={group.id} value={group.id}>{displayGroupName(group.name, language)}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {editingUser.role === 'agent' && !editingUser.groupId && (
                  <p className="text-xs text-destructive">{t('Выберите линию, чтобы инженер получал правильный доступ и маршрутизацию.', 'Select a line so the engineer receives the correct access and routing.')}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>{t('Отмена', 'Cancel')}</Button>
            <Button onClick={handleUpdateUser} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Сохранить', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Удалить пользователя?', 'Delete user?')}</DialogTitle>
            <DialogDescription>
              {deletingUser
                ? t(`Аккаунт ${deletingUser.name} будет удалён из системы. Это действие нельзя отменить.`, `The account ${displayPersonName(deletingUser.name, language)} will be deleted from the system. This action cannot be undone.`)
                : t('Аккаунт будет удалён из системы.', 'The account will be deleted from the system.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>{t('Отмена', 'Cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Удалить', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Добавить пользователя', 'Add User')}</DialogTitle>
            <DialogDescription>{t('По умолчанию создается обычный пользователь. Инженеру выберите роль и линию.', 'A regular user is created by default. For an engineer, select the role and line.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Имя', 'Name')}</Label>
              <Input value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} placeholder={t('ФИО сотрудника', 'Employee full name')} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} placeholder="name@qazaq.gen" />
            </div>
            <div className="space-y-2">
              <Label>{t('Временный пароль', 'Temporary Password')}</Label>
              <Input value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} type="password" />
            </div>
            <div className="space-y-2">
              <Label>{t('Роль', 'Role')}</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: AppRole) => setNewUser({
                  ...newUser,
                  role: value,
                  groupId: value === 'agent' ? newUser.groupId : null,
                })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['employee', 'agent', 'manager', 'admin'] as AppRole[]).map((role) => (
                    <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{roleDescriptions[newUser.role]}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('Отдел', 'Department')}</Label>
              <Select value={newUser.departmentId || 'none'} onValueChange={(value) => setNewUser({ ...newUser, departmentId: value === 'none' ? null : value, groupId: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('Не указан', 'Not specified')}</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>{displayDepartmentName(department.name, language, department.name_en || department.nameEn)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{newUser.role === 'agent' ? t('Линия / группа инженера *', 'Engineer line / group *') : t('Группа', 'Group')}</Label>
              <Select value={newUser.groupId || 'none'} onValueChange={(value) => setNewUser({ ...newUser, groupId: value === 'none' ? null : value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('Не указана', 'Not specified')}</SelectItem>
                  {groups
                    .filter((group) => !newUser.departmentId || group.department_id === newUser.departmentId || group.departmentId === newUser.departmentId)
                    .map((group) => (
                      <SelectItem key={group.id} value={group.id}>{displayGroupName(group.name, language)}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('Отмена', 'Cancel')}</Button>
            <Button onClick={handleCreateUser} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Создать', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function fallbackUserRows(): TableRowData[] {
  return fallbackUsers.map((user) => ({
    login: <span className="font-medium text-blue-800">{user[0]}</span>,
    lastName: user[1],
    firstName: user[2],
    email: <span className="text-blue-800">{user[3]}</span>,
    phone: user[4],
    active: user[5],
    category: user[6],
    id: user[7],
    profile: '01 Пользователь (Self-Service)',
    organization: 'ID Support',
  }));
}

function GroupsView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<AdminGroupRow[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [editingGroup, setEditingGroup] = useState<AdminGroupRow | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<AdminGroupRow | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AdminGroupRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', departmentId: null as string | null });
  const [saving, setSaving] = useState(false);

  const normalizeGroup = (group: any): AdminGroupRow => ({
    id: group.id,
    name: group.name || 'Без названия',
    departmentId: group.department_id || group.departmentId || null,
    createdAt: group.created_at || group.createdAt || new Date().toISOString(),
  });

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const [groupsData, departmentsData, profilesData, assetsData] = await Promise.all([
        api.getGroups(),
        api.getDepartments(),
        api.getProfiles(),
        api.getAssets({ limit: '100' }),
      ]);
      setGroups((groupsData || []).map(normalizeGroup));
      setDepartments(departmentsData || []);
      setProfiles(profilesData || []);
      setAssets(assetsData?.data || []);
    } catch (error) {
      console.error(error);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить группы', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const departmentName = (id: string | null) => departments.find((department) => department.id === id)?.name || 'Не указан';
  const getProfileGroupId = (profile: any) => profile.group_id || profile.groupId || null;
  const getProfileUserId = (profile: any) => profile.user_id || profile.userId || profile.id;
  const getProfileName = (profile: any) => profile.name || profile.email || 'Без имени';
  const getAssetAssigneeId = (asset: any) => asset.assigned_to || asset.assignedTo || null;
  const getAssetName = (asset: any) => asset.name || [asset.manufacturer, asset.model].filter(Boolean).join(' ') || 'Актив';
  const getAssetLocation = (asset: any) => asset.location || 'Место не указано';
  const countUsersInGroup = (groupId: string) => profiles.filter((profile) => getProfileGroupId(profile) === groupId).length;
  const getGroupMembers = (groupId: string) => profiles.filter((profile) => getProfileGroupId(profile) === groupId);
  const getUserAssets = (userId: string) => assets.filter((asset) => getAssetAssigneeId(asset) === userId);

  const filteredGroups = groups.filter((group) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || [
      group.name,
      departmentName(group.departmentId),
    ].some((value) => value.toLowerCase().includes(query));
    const matchesDepartment = departmentFilter === 'all' || group.departmentId === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите название группы', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await api.createGroup({
        name: newGroup.name.trim(),
        departmentId: newGroup.departmentId,
      });
      setCreateOpen(false);
      setNewGroup({ name: '', departmentId: null });
      toast({ title: 'Готово', description: 'Группа добавлена' });
      fetchGroups();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message || 'Не удалось добавить группу', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;
    if (!editingGroup.name.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите название группы', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await api.updateGroup(editingGroup.id, {
        name: editingGroup.name.trim(),
        departmentId: editingGroup.departmentId,
      });
      setEditingGroup(null);
      toast({ title: 'Готово', description: 'Группа обновлена' });
      fetchGroups();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message || 'Не удалось обновить группу', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;

    setSaving(true);
    try {
      await api.deleteGroup(deletingGroup.id);
      setDeletingGroup(null);
      toast({ title: 'Готово', description: 'Группа удалена' });
      fetchGroups();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message || 'Не удалось удалить группу', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    { label: 'Всего групп', value: groups.length },
    { label: 'С сотрудниками', value: groups.filter((group) => countUsersInGroup(group.id) > 0).length },
    { label: 'Без отдела', value: groups.filter((group) => !group.departmentId).length },
    { label: 'Отделов', value: new Set(groups.map((group) => group.departmentId).filter(Boolean)).size },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Главная</span>
            <span>/</span>
            <span>Администрирование</span>
            <span>/</span>
            <span className="font-medium text-foreground">Группы</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <UsersRound className="h-6 w-6 text-primary" />
            Управление группами
          </h1>
          <p className="text-muted-foreground">Линии поддержки, команды и привязка к отделам</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Добавить группу
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="rounded-lg">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-lg">
        <CardHeader className="gap-4 border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Список групп</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Поиск по группе или отделу"
                  className="pl-10"
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все отделы</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newUser.role === 'agent' && !newUser.groupId && (
                <p className="text-xs text-destructive">Выберите первую, вторую или третью линию поддержки.</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-56 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Группа</th>
                    <th className="px-5 py-3 font-medium">Отдел</th>
                    <th className="px-5 py-3 font-medium">Сотрудники</th>
                    <th className="px-5 py-3 font-medium">Создана</th>
                    <th className="px-5 py-3 text-right font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group) => {
                    const usersCount = countUsersInGroup(group.id);
                    return (
                      <tr
                        key={group.id}
                        className="cursor-pointer border-b last:border-0 hover:bg-muted/35"
                        onClick={() => setSelectedGroup(group)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <UsersRound className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{group.name}</p>
                              <p className="text-xs text-muted-foreground">ID: {group.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline" className="bg-slate-500/10 text-slate-700 border-slate-500/20">
                            {departmentName(group.departmentId)}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">{usersCount}</td>
                        <td className="px-5 py-4 text-muted-foreground">{format(new Date(group.createdAt), 'dd.MM.yyyy')}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingGroup({ ...group });
                              }}
                              aria-label="Редактировать группу"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeletingGroup(group);
                              }}
                              aria-label="Удалить группу"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredGroups.length === 0 && (
                    <tr>
                      <td colSpan={5} className="h-40 px-5 text-center text-muted-foreground">Группы не найдены</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить группу</DialogTitle>
            <DialogDescription>Создайте команду или линию поддержки</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={newGroup.name} onChange={(event) => setNewGroup({ ...newGroup, name: event.target.value })} placeholder="Например: Инженер первой линии" />
            </div>
            <div className="space-y-2">
              <Label>Отдел</Label>
              <Select value={newGroup.departmentId || 'none'} onValueChange={(value) => setNewGroup({ ...newGroup, departmentId: value === 'none' ? null : value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не указан</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateGroup} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              {selectedGroup ? `${departmentName(selectedGroup.departmentId)} · ${countUsersInGroup(selectedGroup.id)} сотрудник(ов)` : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedGroup && (
            <div className="max-h-[65vh] overflow-y-auto pr-1">
              {getGroupMembers(selectedGroup.id).length === 0 ? (
                <div className="rounded-lg border py-12 text-center text-muted-foreground">
                  В этой группе пока нет сотрудников
                </div>
              ) : (
                <div className="space-y-3">
                  {getGroupMembers(selectedGroup.id).map((profile) => {
                    const userId = getProfileUserId(profile);
                    const userAssets = getUserAssets(userId);
                    const workplace = userAssets.find((asset) => asset.location)?.location || 'Не указано';

                    return (
                      <div key={userId} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {getProfileName(profile).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground">{getProfileName(profile)}</p>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5" />
                                  {profile.email || 'Email не указан'}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <FolderTree className="h-3.5 w-3.5" />
                                  {departmentName(selectedGroup.departmentId)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="w-fit bg-blue-500/10 text-blue-700 border-blue-500/20">
                            {selectedGroup.name}
                          </Badge>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-md bg-muted/45 p-3">
                            <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              Рабочее место
                            </p>
                            <p className="mt-1 text-sm font-medium">{workplace}</p>
                          </div>
                          <div className="rounded-md bg-muted/45 p-3">
                            <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                              <Laptop className="h-3.5 w-3.5" />
                              Закреплённое оборудование
                            </p>
                            {userAssets.length > 0 ? (
                              <div className="mt-1 space-y-1">
                                {userAssets.slice(0, 3).map((asset) => (
                                  <p key={asset.id} className="text-sm">
                                    {getAssetName(asset)}
                                    <span className="text-muted-foreground"> · {getAssetLocation(asset)}</span>
                                  </p>
                                ))}
                                {userAssets.length > 3 && (
                                  <p className="text-xs text-muted-foreground">Ещё {userAssets.length - 3}</p>
                                )}
                              </div>
                            ) : (
                              <p className="mt-1 text-sm text-muted-foreground">Нет закреплённых активов</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedGroup(null)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать группу</DialogTitle>
            <DialogDescription>Измените название или отдел группы</DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={editingGroup.name} onChange={(event) => setEditingGroup({ ...editingGroup, name: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Отдел</Label>
                <Select value={editingGroup.departmentId || 'none'} onValueChange={(value) => setEditingGroup({ ...editingGroup, departmentId: value === 'none' ? null : value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не указан</SelectItem>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>Отмена</Button>
            <Button onClick={handleUpdateGroup} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingGroup} onOpenChange={(open) => !open && setDeletingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить группу?</DialogTitle>
            <DialogDescription>
              {deletingGroup
                ? `Группа ${deletingGroup.name} будет удалена. Если к ней привязаны сотрудники или заявки, сервер может отклонить удаление.`
                : 'Группа будет удалена.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingGroup(null)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function fallbackGroupRows(): TableRowData[] {
  return groupFallbackRows.map((row) => ({
    name: <span className="font-medium text-blue-800">{row[0]}</span>,
    organization: <Badge variant="secondary" className="font-normal text-blue-800">{row[1]}</Badge>,
    comment: row[2],
    users: row[3],
    id: row[4],
  }));
}

function OrganizationsView() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<AdminDepartmentRow[]>([]);
  const [groups, setGroups] = useState<AdminGroupRow[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDepartment, setEditingDepartment] = useState<AdminDepartmentRow | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<AdminDepartmentRow | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<AdminDepartmentRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newDepartment, setNewDepartment] = useState({ name: '', groupIds: [] as string[], userIds: [] as string[] });
  const [editDepartmentLinks, setEditDepartmentLinks] = useState({ groupIds: [] as string[], userIds: [] as string[] });
  const [saving, setSaving] = useState(false);

  const normalizeDepartment = (department: any): AdminDepartmentRow => ({
    id: department.id,
    name: department.name || 'Без названия',
    createdAt: department.created_at || department.createdAt || new Date().toISOString(),
  });

  const normalizeGroup = (group: any): AdminGroupRow => ({
    id: group.id,
    name: group.name || 'Без названия',
    departmentId: group.department_id || group.departmentId || null,
    createdAt: group.created_at || group.createdAt || new Date().toISOString(),
  });

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const [departmentsData, groupsData, profilesData, assetsData] = await Promise.all([
        api.getDepartments(),
        api.getGroups(),
        api.getProfiles(),
        api.getAssets({ limit: '100' }),
      ]);
      setDepartments((departmentsData || []).map(normalizeDepartment));
      setGroups((groupsData || []).map(normalizeGroup));
      setProfiles(profilesData || []);
      setAssets(assetsData?.data || []);
    } catch (error) {
      console.error(error);
      toast({ title: 'Ошибка', description: 'Не удалось загрузить отделы', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const getProfileDepartmentId = (profile: any) => profile.department_id || profile.departmentId || null;
  const getProfileGroupId = (profile: any) => profile.group_id || profile.groupId || null;
  const getProfileUserId = (profile: any) => profile.user_id || profile.userId || profile.id;
  const getProfileName = (profile: any) => profile.name || profile.email || 'Без имени';
  const getAssetAssigneeId = (asset: any) => asset.assigned_to || asset.assignedTo || null;
  const getAssetName = (asset: any) => asset.name || [asset.manufacturer, asset.model].filter(Boolean).join(' ') || 'Актив';
  const getAssetLocation = (asset: any) => asset.location || 'Место не указано';
  const countGroupsInDepartment = (departmentId: string) => groups.filter((group) => group.departmentId === departmentId).length;
  const countUsersInDepartment = (departmentId: string) => profiles.filter((profile) => getProfileDepartmentId(profile) === departmentId).length;
  const countUsersInGroup = (groupId: string) => profiles.filter((profile) => getProfileGroupId(profile) === groupId).length;
  const getDepartmentGroups = (departmentId: string) => groups.filter((group) => group.departmentId === departmentId);
  const getDepartmentMembers = (departmentId: string) => profiles.filter((profile) => getProfileDepartmentId(profile) === departmentId);
  const getUserAssets = (userId: string) => assets.filter((asset) => getAssetAssigneeId(asset) === userId);
  const groupName = (id: string | null) => groups.find((group) => group.id === id)?.name || 'Группа не указана';

  const filteredDepartments = departments.filter((department) => {
    const query = searchQuery.toLowerCase().trim();
    return !query || department.name.toLowerCase().includes(query);
  });

  const toggleSelected = (items: string[], id: string, checked: boolean) => (
    checked ? Array.from(new Set([...items, id])) : items.filter((item) => item !== id)
  );

  const openEditDepartment = (department: AdminDepartmentRow) => {
    setEditingDepartment({ ...department });
    setEditDepartmentLinks({
      groupIds: groups.filter((group) => group.departmentId === department.id).map((group) => group.id),
      userIds: profiles
        .filter((profile) => getProfileDepartmentId(profile) === department.id)
        .map((profile) => getProfileUserId(profile)),
    });
  };

  const applyDepartmentLinks = async (departmentId: string, groupIds: string[], userIds: string[]) => {
    const groupsToUpdate = groups.filter((group) => group.departmentId === departmentId || groupIds.includes(group.id));
    const usersToUpdate = profiles.filter((profile) => {
      const userId = getProfileUserId(profile);
      return getProfileDepartmentId(profile) === departmentId || userIds.includes(userId);
    });

    await Promise.all([
      ...groupsToUpdate.map((group) => api.updateGroup(group.id, {
        departmentId: groupIds.includes(group.id) ? departmentId : null,
      })),
      ...usersToUpdate.map((profile) => api.updateUser(getProfileUserId(profile), {
        departmentId: userIds.includes(getProfileUserId(profile)) ? departmentId : null,
      })),
    ]);
  };

  const handleCreateDepartment = async () => {
    if (!newDepartment.name.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите название отдела', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const created: any = await api.createDepartment({ name: newDepartment.name.trim() });
      const departmentId = created.id;
      if (departmentId) {
        await applyDepartmentLinks(departmentId, newDepartment.groupIds, newDepartment.userIds);
      }
      setCreateOpen(false);
      setNewDepartment({ name: '', groupIds: [], userIds: [] });
      toast({ title: 'Готово', description: 'Отдел добавлен' });
      fetchDepartments();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message || 'Не удалось добавить отдел', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartment) return;
    if (!editingDepartment.name.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите название отдела', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await api.updateDepartment(editingDepartment.id, { name: editingDepartment.name.trim() });
      await applyDepartmentLinks(editingDepartment.id, editDepartmentLinks.groupIds, editDepartmentLinks.userIds);
      setEditingDepartment(null);
      setEditDepartmentLinks({ groupIds: [], userIds: [] });
      toast({ title: 'Готово', description: 'Отдел обновлён' });
      fetchDepartments();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message || 'Не удалось обновить отдел', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!deletingDepartment) return;

    setSaving(true);
    try {
      await api.deleteDepartment(deletingDepartment.id);
      setDeletingDepartment(null);
      toast({ title: 'Готово', description: 'Отдел удалён' });
      fetchDepartments();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message || 'Не удалось удалить отдел', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    { label: 'Всего отделов', value: departments.length },
    { label: 'Групп в отделах', value: groups.filter((group) => group.departmentId).length },
    { label: 'Сотрудников в отделах', value: profiles.filter((profile) => getProfileDepartmentId(profile)).length },
    { label: 'Без отдела', value: profiles.filter((profile) => !getProfileDepartmentId(profile)).length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Главная</span>
            <span>/</span>
            <span>Администрирование</span>
            <span>/</span>
            <span className="font-medium text-foreground">Отделы</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <FolderTree className="h-6 w-6 text-primary" />
            Отделы компании
          </h1>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Добавить отдел
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="rounded-lg">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-lg">
        <CardHeader className="gap-4 border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Список отделов</CardTitle>
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск по отделу"
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-56 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Отдел</th>
                    <th className="px-5 py-3 font-medium">Группы</th>
                    <th className="px-5 py-3 font-medium">Сотрудники</th>
                    <th className="px-5 py-3 font-medium">Создан</th>
                    <th className="px-5 py-3 text-right font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map((department) => {
                    const groupsCount = countGroupsInDepartment(department.id);
                    const usersCount = countUsersInDepartment(department.id);
                    return (
                      <tr
                        key={department.id}
                        className="cursor-pointer border-b last:border-0 hover:bg-muted/35"
                        onClick={() => setSelectedDepartment(department)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <FolderTree className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{department.name}</p>
                              <p className="text-xs text-muted-foreground">ID: {department.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">{groupsCount}</td>
                        <td className="px-5 py-4 text-muted-foreground">{usersCount}</td>
                        <td className="px-5 py-4 text-muted-foreground">{format(new Date(department.createdAt), 'dd.MM.yyyy')}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditDepartment(department);
                              }}
                              aria-label="Редактировать отдел"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeletingDepartment(department);
                              }}
                              aria-label="Удалить отдел"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDepartments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="h-40 px-5 text-center text-muted-foreground">Отделы не найдены</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDepartment} onOpenChange={(open) => !open && setSelectedDepartment(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selectedDepartment?.name}</DialogTitle>
            <DialogDescription>
              {selectedDepartment
                ? `${countGroupsInDepartment(selectedDepartment.id)} групп · ${countUsersInDepartment(selectedDepartment.id)} сотрудников`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedDepartment && (
            <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Группы</p>
                  <p className="mt-2 text-2xl font-semibold">{countGroupsInDepartment(selectedDepartment.id)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Сотрудники</p>
                  <p className="mt-2 text-2xl font-semibold">{countUsersInDepartment(selectedDepartment.id)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Оборудование сотрудников</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {getDepartmentMembers(selectedDepartment.id).reduce((total, profile) => total + getUserAssets(getProfileUserId(profile)).length, 0)}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-lg border">
                  <div className="border-b px-4 py-3">
                    <p className="font-medium">Группы отдела</p>
                  </div>
                  <div className="divide-y">
                    {getDepartmentGroups(selectedDepartment.id).map((group) => (
                      <div key={group.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{countUsersInGroup(group.id)} сотрудник(ов)</p>
                        </div>
                        <Badge variant="outline">{group.id.slice(0, 8)}</Badge>
                      </div>
                    ))}
                    {getDepartmentGroups(selectedDepartment.id).length === 0 && (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">Групп нет</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border">
                  <div className="border-b px-4 py-3">
                    <p className="font-medium">Сотрудники отдела</p>
                  </div>
                  <div className="divide-y">
                    {getDepartmentMembers(selectedDepartment.id).map((profile) => {
                      const userId = getProfileUserId(profile);
                      const userAssets = getUserAssets(userId);
                      const workplace = userAssets.find((asset) => asset.location)?.location || 'Не указано';

                      return (
                        <div key={userId} className="px-4 py-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                {getProfileName(profile).slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium">{getProfileName(profile)}</p>
                                <p className="truncate text-sm text-muted-foreground">{profile.email || 'Email не указан'}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="w-fit bg-blue-500/10 text-blue-700 border-blue-500/20">
                              {groupName(getProfileGroupId(profile))}
                            </Badge>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-md bg-muted/45 p-3">
                              <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                Рабочее место
                              </p>
                              <p className="mt-1 text-sm font-medium">{workplace}</p>
                            </div>
                            <div className="rounded-md bg-muted/45 p-3">
                              <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                                <Laptop className="h-3.5 w-3.5" />
                                Оборудование
                              </p>
                              {userAssets.length > 0 ? (
                                <div className="mt-1 space-y-1">
                                  {userAssets.slice(0, 2).map((asset) => (
                                    <p key={asset.id} className="text-sm">
                                      {getAssetName(asset)}
                                      <span className="text-muted-foreground"> · {getAssetLocation(asset)}</span>
                                    </p>
                                  ))}
                                  {userAssets.length > 2 && (
                                    <p className="text-xs text-muted-foreground">Ещё {userAssets.length - 2}</p>
                                  )}
                                </div>
                              ) : (
                                <p className="mt-1 text-sm text-muted-foreground">Нет закреплённых активов</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {getDepartmentMembers(selectedDepartment.id).length === 0 && (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">Сотрудников нет</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDepartment(null)}>Закрыть</Button>
            {selectedDepartment && (
              <Button onClick={() => {
                openEditDepartment(selectedDepartment);
                setSelectedDepartment(null);
              }}>
                Редактировать состав
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить отдел</DialogTitle>
            <DialogDescription>Создайте отдел и сразу привяжите к нему группы или сотрудников</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={newDepartment.name} onChange={(event) => setNewDepartment({ ...newDepartment, name: event.target.value })} placeholder="Например: IT бөлімі" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Группы</Label>
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                  {groups.map((group) => (
                    <label key={group.id} className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50">
                      <Checkbox
                        checked={newDepartment.groupIds.includes(group.id)}
                        onCheckedChange={(checked) => setNewDepartment({
                          ...newDepartment,
                          groupIds: toggleSelected(newDepartment.groupIds, group.id, checked === true),
                        })}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{group.name}</span>
                        <span className="block text-xs text-muted-foreground">{group.departmentId ? 'Уже привязана к отделу' : 'Без отдела'}</span>
                      </span>
                    </label>
                  ))}
                  {groups.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Групп пока нет</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Сотрудники</Label>
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                  {profiles.map((profile) => {
                    const userId = getProfileUserId(profile);
                    return (
                      <label key={userId} className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50">
                        <Checkbox
                          checked={newDepartment.userIds.includes(userId)}
                          onCheckedChange={(checked) => setNewDepartment({
                            ...newDepartment,
                            userIds: toggleSelected(newDepartment.userIds, userId, checked === true),
                          })}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium">{getProfileName(profile)}</span>
                          <span className="block truncate text-xs text-muted-foreground">{profile.email || 'Без email'}</span>
                        </span>
                      </label>
                    );
                  })}
                  {profiles.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Сотрудников пока нет</p>}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateDepartment} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDepartment} onOpenChange={(open) => !open && setEditingDepartment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать отдел</DialogTitle>
            <DialogDescription>Измените название и состав отдела</DialogDescription>
          </DialogHeader>
          {editingDepartment && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={editingDepartment.name} onChange={(event) => setEditingDepartment({ ...editingDepartment, name: event.target.value })} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Группы</Label>
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                    {groups.map((group) => (
                      <label key={group.id} className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50">
                        <Checkbox
                          checked={editDepartmentLinks.groupIds.includes(group.id)}
                          onCheckedChange={(checked) => setEditDepartmentLinks({
                            ...editDepartmentLinks,
                            groupIds: toggleSelected(editDepartmentLinks.groupIds, group.id, checked === true),
                          })}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium">{group.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {group.departmentId === editingDepartment.id ? 'В этом отделе' : group.departmentId ? 'В другом отделе' : 'Без отдела'}
                          </span>
                        </span>
                      </label>
                    ))}
                    {groups.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Групп пока нет</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Сотрудники</Label>
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                    {profiles.map((profile) => {
                      const userId = getProfileUserId(profile);
                      return (
                        <label key={userId} className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50">
                          <Checkbox
                            checked={editDepartmentLinks.userIds.includes(userId)}
                            onCheckedChange={(checked) => setEditDepartmentLinks({
                              ...editDepartmentLinks,
                              userIds: toggleSelected(editDepartmentLinks.userIds, userId, checked === true),
                            })}
                          />
                          <span className="min-w-0">
                            <span className="block font-medium">{getProfileName(profile)}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {getProfileDepartmentId(profile) === editingDepartment.id ? 'В этом отделе' : profile.email || 'Без email'}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                    {profiles.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Сотрудников пока нет</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDepartment(null)}>Отмена</Button>
            <Button onClick={handleUpdateDepartment} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingDepartment} onOpenChange={(open) => !open && setDeletingDepartment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить отдел?</DialogTitle>
            <DialogDescription>
              {deletingDepartment
                ? `Отдел ${deletingDepartment.name} будет удалён. Если к нему привязаны группы или сотрудники, сервер может отклонить удаление.`
                : 'Отдел будет удалён.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingDepartment(null)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDeleteDepartment} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfilesView() {
  type AccessProfile = {
    id: string;
    name: string;
    description: string;
    users: number;
    defaultProfile: boolean;
    updatedAt: string;
    permissions: Record<string, boolean>;
  };

  const permissionLabels: Record<string, string> = {
    tickets: 'Заявки',
    assets: 'Активы',
    users: 'Пользователи',
    reports: 'Отчёты',
    settings: 'Настройки',
    administration: 'Администрирование',
  };

  const [profiles, setProfiles] = useState<AccessProfile[]>([
    {
      id: 'self-service',
      name: 'Пользователь',
      description: 'Базовый доступ для сотрудников: заявки, база знаний и свои обращения',
      users: 42,
      defaultProfile: true,
      updatedAt: '2026-06-08',
      permissions: { tickets: true, assets: false, users: false, reports: false, settings: false, administration: false },
    },
    {
      id: 'support',
      name: 'Инженер поддержки',
      description: 'Работа с заявками, активами и назначениями внутри своей линии',
      users: 9,
      defaultProfile: false,
      updatedAt: '2026-06-08',
      permissions: { tickets: true, assets: true, users: false, reports: true, settings: false, administration: false },
    },
    {
      id: 'manager',
      name: 'Руководитель',
      description: 'Контроль SLA, отчёты, сотрудники и распределение нагрузки',
      users: 3,
      defaultProfile: false,
      updatedAt: '2026-06-07',
      permissions: { tickets: true, assets: true, users: true, reports: true, settings: false, administration: false },
    },
    {
      id: 'admin',
      name: 'Администратор',
      description: 'Полный доступ к настройкам системы и структуре компании',
      users: 2,
      defaultProfile: false,
      updatedAt: '2026-06-07',
      permissions: { tickets: true, assets: true, users: true, reports: true, settings: true, administration: true },
    },
    {
      id: 'readonly',
      name: 'Только просмотр',
      description: 'Безопасный профиль для аудита и просмотра объектов без изменений',
      users: 1,
      defaultProfile: false,
      updatedAt: '2026-06-05',
      permissions: { tickets: true, assets: true, users: false, reports: true, settings: false, administration: false },
    },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftProfile, setDraftProfile] = useState<Omit<AccessProfile, 'id' | 'updatedAt' | 'users'>>({
    name: '',
    description: '',
    defaultProfile: false,
    permissions: { tickets: true, assets: false, users: false, reports: false, settings: false, administration: false },
  });

  const filteredProfiles = profiles.filter((profile) => {
    const query = searchQuery.toLowerCase().trim();
    return !query || [profile.name, profile.description].some((value) => value.toLowerCase().includes(query));
  });

  const togglePermission = (profile: AccessProfile, key: string, checked: boolean) => ({
    ...profile,
    permissions: { ...profile.permissions, [key]: checked },
  });

  const saveDraftProfile = () => {
    if (!draftProfile.name.trim()) return;
    setProfiles((current) => [
      ...current.map((profile) => draftProfile.defaultProfile ? { ...profile, defaultProfile: false } : profile),
      {
        ...draftProfile,
        id: `profile-${Date.now()}`,
        name: draftProfile.name.trim(),
        description: draftProfile.description.trim(),
        users: 0,
        updatedAt: '2026-06-08',
      },
    ]);
    setCreateOpen(false);
    setDraftProfile({
      name: '',
      description: '',
      defaultProfile: false,
      permissions: { tickets: true, assets: false, users: false, reports: false, settings: false, administration: false },
    });
  };

  const saveEditingProfile = () => {
    if (!editingProfile) return;
    setProfiles((current) => current.map((profile) => {
      if (profile.id === editingProfile.id) return { ...editingProfile, updatedAt: '2026-06-08' };
      if (editingProfile.defaultProfile) return { ...profile, defaultProfile: false };
      return profile;
    }));
    setEditingProfile(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Главная</span>
            <span>/</span>
            <span>Администрирование</span>
            <span>/</span>
            <span className="font-medium text-foreground">Профили</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <UserCog className="h-6 w-6 text-primary" />
            Профили доступа
          </h1>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Добавить профиль
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Профилей</p><p className="mt-2 text-2xl font-semibold">{profiles.length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Пользователей</p><p className="mt-2 text-2xl font-semibold">{profiles.reduce((sum, profile) => sum + profile.users, 0)}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">По умолчанию</p><p className="mt-2 text-2xl font-semibold">{profiles.find((profile) => profile.defaultProfile)?.name || '-'}</p></CardContent></Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader className="gap-4 border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Список профилей</CardTitle>
            <div className="relative min-w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Поиск по профилю" className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Профиль</th>
                  <th className="px-5 py-3 font-medium">Пользователи</th>
                  <th className="px-5 py-3 font-medium">Права</th>
                  <th className="px-5 py-3 font-medium">По умолчанию</th>
                  <th className="px-5 py-3 font-medium">Обновлён</th>
                  <th className="px-5 py-3 text-right font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((profile) => {
                  const enabledPermissions = Object.entries(profile.permissions).filter(([, enabled]) => enabled);
                  return (
                    <tr key={profile.id} className="border-b last:border-0 hover:bg-muted/35">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <ShieldCheck className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{profile.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{profile.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{profile.users}</td>
                      <td className="px-5 py-4">
                        <div className="flex max-w-[420px] flex-wrap gap-1.5">
                          {enabledPermissions.map(([key]) => (
                            <Badge key={key} variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">{permissionLabels[key]}</Badge>
                          ))}
                          {enabledPermissions.length === 0 && <span className="text-muted-foreground">Нет прав</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {profile.defaultProfile ? <Badge>Да</Badge> : <span className="text-muted-foreground">Нет</span>}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{profile.updatedAt}</td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditingProfile({ ...profile })} aria-label="Редактировать профиль">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="h-40 px-5 text-center text-muted-foreground">Профили не найдены</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Добавить профиль</DialogTitle>
            <DialogDescription>Настройте профиль доступа и его разрешения</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Название</Label><Input value={draftProfile.name} onChange={(event) => setDraftProfile({ ...draftProfile, name: event.target.value })} /></div>
            <div className="space-y-2"><Label>Описание</Label><Input value={draftProfile.description} onChange={(event) => setDraftProfile({ ...draftProfile, description: event.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(permissionLabels).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <Switch checked={draftProfile.permissions[key]} onCheckedChange={(checked) => setDraftProfile({ ...draftProfile, permissions: { ...draftProfile.permissions, [key]: checked } })} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <label className="flex items-center gap-3 rounded-md border px-3 py-2">
              <Switch checked={draftProfile.defaultProfile} onCheckedChange={(checked) => setDraftProfile({ ...draftProfile, defaultProfile: checked })} />
              <span>Профиль по умолчанию</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={saveDraftProfile}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать профиль</DialogTitle>
            <DialogDescription>Измените название, описание и набор прав</DialogDescription>
          </DialogHeader>
          {editingProfile && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Название</Label><Input value={editingProfile.name} onChange={(event) => setEditingProfile({ ...editingProfile, name: event.target.value })} /></div>
              <div className="space-y-2"><Label>Описание</Label><Input value={editingProfile.description} onChange={(event) => setEditingProfile({ ...editingProfile, description: event.target.value })} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(permissionLabels).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 rounded-md border px-3 py-2">
                    <Switch checked={editingProfile.permissions[key]} onCheckedChange={(checked) => setEditingProfile(togglePermission(editingProfile, key, checked))} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                <Switch checked={editingProfile.defaultProfile} onCheckedChange={(checked) => setEditingProfile({ ...editingProfile, defaultProfile: checked })} />
                <span>Профиль по умолчанию</span>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(null)}>Отмена</Button>
            <Button onClick={saveEditingProfile}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RulesView() {
  type RuleKind = 'import' | 'assignment' | 'location' | 'mail' | 'auth' | 'software' | 'tickets' | 'assets' | 'migration' | 'blacklist';
  type AdminRule = {
    id: string;
    kind: RuleKind;
    name: string;
    condition: string;
    action: string;
    priority: number;
    active: boolean;
    updatedAt: string;
  };

  const ruleKinds: { id: RuleKind; title: string; description: string; icon: LucideIcon }[] = [
    { id: 'import', title: 'Импорт оборудования', description: 'Автоматически определяет тип и отдел для новых активов', icon: Download },
    { id: 'assignment', title: 'Назначение объекта', description: 'Привязывает активы к отделам и ответственным', icon: Layers },
    { id: 'location', title: 'Расположение', description: 'Заполняет рабочие места, кабинеты и зоны', icon: MapPin },
    { id: 'mail', title: 'Почтовые заявки', description: 'Назначает заявки, созданные из входящей почты', icon: Mail },
    { id: 'auth', title: 'Авторизация', description: 'Назначает профиль, отдел и группу при входе', icon: UserCog },
    { id: 'software', title: 'Категории ПО', description: 'Определяет категории программного обеспечения', icon: Boxes },
    { id: 'tickets', title: 'Бизнес-правила заявок', description: 'Приоритеты, SLA и автоматическое назначение', icon: CircleAlert },
    { id: 'assets', title: 'Бизнес-правила активов', description: 'Проверки и заполнение данных по активам', icon: BookOpen },
    { id: 'migration', title: 'Перенос', description: 'Правила переноса данных между разделами', icon: Import },
    { id: 'blacklist', title: 'Чёрные списки', description: 'Исключения для импорта и обработки', icon: CircleAlert },
  ];

  const [rules, setRules] = useState<AdminRule[]>([
    { id: 'r1', kind: 'import', name: 'Ноутбуки Dell в IT', condition: 'Название содержит Dell или Latitude', action: 'Тип: Компьютер, отдел: IT бөлімі', priority: 10, active: true, updatedAt: '2026-06-08' },
    { id: 'r2', kind: 'import', name: 'Сетевые устройства без IP', condition: 'Тип: network, IP пустой', action: 'Добавить в сохранённый поиск "Активы без IP"', priority: 20, active: true, updatedAt: '2026-06-08' },
    { id: 'r3', kind: 'tickets', name: 'Критичная заявка в первую линию', condition: 'Приоритет: critical, категория: Инцидент', action: 'Назначить: Инженер первой линии, SLA: срочный', priority: 5, active: true, updatedAt: '2026-06-07' },
    { id: 'r4', kind: 'tickets', name: 'Заявки по финансам', condition: 'Тема содержит счёт, оплата или договор', action: 'Отдел: Қаржы бөлімі', priority: 30, active: false, updatedAt: '2026-06-07' },
    { id: 'r5', kind: 'auth', name: 'Инженеры второй линии', condition: 'Email содержит .engineer или группа указана вручную', action: 'Роль: Инженер, группа: Инженер второй линии', priority: 15, active: true, updatedAt: '2026-06-06' },
  ]);
  const [selectedKind, setSelectedKind] = useState<RuleKind>('import');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRule, setEditingRule] = useState<AdminRule | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftRule, setDraftRule] = useState<Omit<AdminRule, 'id' | 'updatedAt'>>({
    kind: 'import',
    name: '',
    condition: '',
    action: '',
    priority: 10,
    active: true,
  });

  const selectedKindMeta = ruleKinds.find((kind) => kind.id === selectedKind) || ruleKinds[0];
  const filteredRules = rules
    .filter((rule) => rule.kind === selectedKind)
    .filter((rule) => {
      const query = searchQuery.toLowerCase().trim();
      return !query || [rule.name, rule.condition, rule.action].some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => a.priority - b.priority);

  const toggleRule = (id: string, active: boolean) => {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, active, updatedAt: '2026-06-08' } : rule));
  };

  const saveDraftRule = () => {
    if (!draftRule.name.trim()) return;
    setRules((current) => [
      ...current,
      {
        ...draftRule,
        id: `rule-${Date.now()}`,
        name: draftRule.name.trim(),
        condition: draftRule.condition.trim() || 'Условие не задано',
        action: draftRule.action.trim() || 'Действие не задано',
        updatedAt: '2026-06-08',
      },
    ]);
    setCreateOpen(false);
    setDraftRule({ kind: selectedKind, name: '', condition: '', action: '', priority: 10, active: true });
  };

  const saveEditingRule = () => {
    if (!editingRule) return;
    setRules((current) => current.map((rule) => rule.id === editingRule.id ? { ...editingRule, updatedAt: '2026-06-08' } : rule));
    setEditingRule(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Главная</span>
            <span>/</span>
            <span>Администрирование</span>
            <span>/</span>
            <span className="font-medium text-foreground">Правила</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <BookOpen className="h-6 w-6 text-primary" />
            Правила автоматизации
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" />Импорт</Button>
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Экспорт</Button>
          <Button className="gap-2" onClick={() => {
            setDraftRule({ kind: selectedKind, name: '', condition: '', action: '', priority: 10, active: true });
            setCreateOpen(true);
          }}>
            <Plus className="h-4 w-4" />
            Добавить правило
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Всего правил</p><p className="mt-2 text-2xl font-semibold">{rules.length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Активные</p><p className="mt-2 text-2xl font-semibold">{rules.filter((rule) => rule.active).length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Типов правил</p><p className="mt-2 text-2xl font-semibold">{ruleKinds.length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">В выбранном типе</p><p className="mt-2 text-2xl font-semibold">{rules.filter((rule) => rule.kind === selectedKind).length}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <CardTitle>Типы правил</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {ruleKinds.map((kind) => {
              const Icon = kind.icon;
              const active = selectedKind === kind.id;
              return (
                <button
                  key={kind.id}
                  onClick={() => setSelectedKind(kind.id)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-muted/70',
                    active && 'bg-primary/10 text-primary'
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-medium">{kind.title}</span>
                    <span className={cn('block text-xs text-muted-foreground', active && 'text-primary/75')}>{kind.description}</span>
                  </span>
                  <Badge variant="outline" className="ml-auto shrink-0">{rules.filter((rule) => rule.kind === kind.id).length}</Badge>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="gap-4 border-b">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>{selectedKindMeta.title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{selectedKindMeta.description}</p>
              </div>
              <div className="relative min-w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Поиск по правилу" className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Приоритет</th>
                    <th className="px-5 py-3 font-medium">Правило</th>
                    <th className="px-5 py-3 font-medium">Условие</th>
                    <th className="px-5 py-3 font-medium">Действие</th>
                    <th className="px-5 py-3 font-medium">Статус</th>
                    <th className="px-5 py-3 text-right font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((rule) => (
                    <tr key={rule.id} className="border-b last:border-0 hover:bg-muted/35">
                      <td className="px-5 py-4 font-medium">{rule.priority}</td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">Обновлено: {rule.updatedAt}</p>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{rule.condition}</td>
                      <td className="px-5 py-4 text-muted-foreground">{rule.action}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Switch checked={rule.active} onCheckedChange={(checked) => toggleRule(rule.id, checked)} />
                          <span className="text-muted-foreground">{rule.active ? 'Активно' : 'Выключено'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditingRule({ ...rule })} aria-label="Редактировать правило">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredRules.length === 0 && (
                    <tr>
                      <td colSpan={6} className="h-40 px-5 text-center text-muted-foreground">Правила не найдены</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить правило</DialogTitle>
            <DialogDescription>Опишите условие и действие для автоматизации</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Тип</Label>
              <Select value={draftRule.kind} onValueChange={(value: RuleKind) => setDraftRule({ ...draftRule, kind: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ruleKinds.map((kind) => <SelectItem key={kind.id} value={kind.id}>{kind.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Название</Label><Input value={draftRule.name} onChange={(event) => setDraftRule({ ...draftRule, name: event.target.value })} /></div>
            <div className="space-y-2"><Label>Условие</Label><Input value={draftRule.condition} onChange={(event) => setDraftRule({ ...draftRule, condition: event.target.value })} /></div>
            <div className="space-y-2"><Label>Действие</Label><Input value={draftRule.action} onChange={(event) => setDraftRule({ ...draftRule, action: event.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Приоритет</Label><Input type="number" value={draftRule.priority} onChange={(event) => setDraftRule({ ...draftRule, priority: Number(event.target.value) || 0 })} /></div>
              <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                <Switch checked={draftRule.active} onCheckedChange={(checked) => setDraftRule({ ...draftRule, active: checked })} />
                <span>Активно</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={saveDraftRule}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать правило</DialogTitle>
            <DialogDescription>Измените условие, действие или приоритет</DialogDescription>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Название</Label><Input value={editingRule.name} onChange={(event) => setEditingRule({ ...editingRule, name: event.target.value })} /></div>
              <div className="space-y-2"><Label>Условие</Label><Input value={editingRule.condition} onChange={(event) => setEditingRule({ ...editingRule, condition: event.target.value })} /></div>
              <div className="space-y-2"><Label>Действие</Label><Input value={editingRule.action} onChange={(event) => setEditingRule({ ...editingRule, action: event.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Приоритет</Label><Input type="number" value={editingRule.priority} onChange={(event) => setEditingRule({ ...editingRule, priority: Number(event.target.value) || 0 })} /></div>
                <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <Switch checked={editingRule.active} onCheckedChange={(checked) => setEditingRule({ ...editingRule, active: checked })} />
                  <span>Активно</span>
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>Отмена</Button>
            <Button onClick={saveEditingRule}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function DirectoriesView() {
  const { language } = useLanguage();
  const t = (ru: string, en: string) => (language === 'en' ? en : ru);
  type DirectoryCategory = {
    id: string;
    group: string;
    groupEn: string;
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
    icon: LucideIcon;
  };
  type DirectoryEntry = {
    id: string;
    categoryId: string;
    name: string;
    code: string;
    description: string;
    active: boolean;
    updatedAt: string;
  };

  const categories: DirectoryCategory[] = [
    { id: 'software', group: 'Общий каталог', groupEn: 'General Catalog', title: 'Программное обеспечение', titleEn: 'Software', description: 'ПО, сервисы и лицензируемые продукты', descriptionEn: 'Software, services, and licensed products', icon: Boxes },
    { id: 'manufacturers', group: 'Общий каталог', groupEn: 'General Catalog', title: 'Производители', titleEn: 'Manufacturers', description: 'Вендоры оборудования и ПО', descriptionEn: 'Hardware and software vendors', icon: PenLine },
    { id: 'printers', group: 'Общий каталог', groupEn: 'General Catalog', title: 'Принтеры', titleEn: 'Printers', description: 'Семейства и справочные типы принтеров', descriptionEn: 'Printer families and reference types', icon: Printer },
    { id: 'computer-models', group: 'Модели', groupEn: 'Models', title: 'Модели компьютеров', titleEn: 'Computer Models', description: 'Ноутбуки, ПК и рабочие станции', descriptionEn: 'Laptops, PCs, and workstations', icon: Laptop },
    { id: 'monitor-models', group: 'Модели', groupEn: 'Models', title: 'Модели мониторов', titleEn: 'Monitor Models', description: 'Мониторы и дисплеи', descriptionEn: 'Monitors and displays', icon: Monitor },
    { id: 'network-models', group: 'Модели', groupEn: 'Models', title: 'Модели сетевого оборудования', titleEn: 'Network Equipment Models', description: 'Коммутаторы, роутеры и точки доступа', descriptionEn: 'Switches, routers, and access points', icon: Network },
    { id: 'computer-types', group: 'Типы', groupEn: 'Types', title: 'Типы компьютеров', titleEn: 'Computer Types', description: 'Классификация компьютерной техники', descriptionEn: 'Computer equipment classification', icon: Laptop },
    { id: 'device-types', group: 'Типы', groupEn: 'Types', title: 'Типы устройств', titleEn: 'Device Types', description: 'Периферия и вспомогательные устройства', descriptionEn: 'Peripheral and auxiliary devices', icon: Boxes },
    { id: 'os', group: 'Операционные системы', groupEn: 'Operating Systems', title: 'Операционные системы', titleEn: 'Operating Systems', description: 'ОС, версии, редакции и архитектуры', descriptionEn: 'OS versions, editions, and architectures', icon: PenLine },
  ];

  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<DirectoryEntry[]>([
    { id: 'd1', categoryId: 'software', name: 'Microsoft 365', code: 'M365', description: 'Офисный пакет и облачные сервисы', active: true, updatedAt: '2026-06-08' },
    { id: 'd2', categoryId: 'software', name: 'AnyDesk', code: 'REMOTE', description: 'Удаленная поддержка пользователей', active: true, updatedAt: '2026-06-08' },
    { id: 'd3', categoryId: 'manufacturers', name: 'Dell', code: 'DELL', description: 'Компьютеры и серверное оборудование', active: true, updatedAt: '2026-06-07' },
    { id: 'd4', categoryId: 'manufacturers', name: 'HP', code: 'HP', description: 'Ноутбуки, ПК, принтеры', active: true, updatedAt: '2026-06-07' },
    { id: 'd5', categoryId: 'computer-models', name: 'Latitude 5440', code: 'LAT-5440', description: 'Ноутбук сотрудника', active: true, updatedAt: '2026-06-06' },
    { id: 'd6', categoryId: 'network-models', name: 'Cisco Catalyst 9200', code: 'C9200', description: 'Коммутатор доступа', active: true, updatedAt: '2026-06-06' },
    { id: 'd7', categoryId: 'os', name: 'Windows 11 Pro', code: 'WIN11-PRO', description: 'Рабочая станция пользователя', active: true, updatedAt: '2026-06-05' },
  ]);
  const [editingEntry, setEditingEntry] = useState<DirectoryEntry | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftEntry, setDraftEntry] = useState<Omit<DirectoryEntry, 'id' | 'updatedAt'>>({
    categoryId: categories[0].id,
    name: '',
    code: '',
    description: '',
    active: true,
  });

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) || categories[0];
  const groupedCategories = categories.reduce<Record<string, DirectoryCategory[]>>((acc, category) => {
    const groupLabel = language === 'en' ? category.groupEn : category.group;
    acc[groupLabel] = [...(acc[groupLabel] || []), category];
    return acc;
  }, {});
  const categoryTitle = (category: DirectoryCategory) => language === 'en' ? category.titleEn : category.title;
  const categoryDescription = (category: DirectoryCategory) => language === 'en' ? category.descriptionEn : category.description;
  const entryDescription = (description: string) => {
    if (language !== 'en') return description;
    const map: Record<string, string> = {
      'Офисный пакет и облачные сервисы': 'Office suite and cloud services',
      'Удаленная поддержка пользователей': 'Remote user support',
      'Компьютеры и серверное оборудование': 'Computers and server equipment',
      'Ноутбуки, ПК, принтеры': 'Laptops, PCs, printers',
      'Ноутбук сотрудника': 'Employee laptop',
      'Коммутатор доступа': 'Access switch',
      'Рабочая станция пользователя': 'User workstation',
    };
    return map[description] || description;
  };
  const filteredEntries = entries
    .filter((entry) => entry.categoryId === selectedCategoryId)
    .filter((entry) => {
      const query = searchQuery.toLowerCase().trim();
      return !query || [entry.name, entry.code, entry.description].some((value) => value.toLowerCase().includes(query));
    });

  const saveDraftEntry = () => {
    if (!draftEntry.name.trim()) return;
    setEntries((current) => [
      ...current,
      {
        ...draftEntry,
        id: `dir-${Date.now()}`,
        name: draftEntry.name.trim(),
        code: draftEntry.code.trim() || draftEntry.name.trim().toUpperCase().replace(/\s+/g, '-'),
        description: draftEntry.description.trim(),
        updatedAt: '2026-06-08',
      },
    ]);
    setCreateOpen(false);
    setDraftEntry({ categoryId: selectedCategoryId, name: '', code: '', description: '', active: true });
  };

  const saveEditingEntry = () => {
    if (!editingEntry) return;
    setEntries((current) => current.map((entry) => entry.id === editingEntry.id ? { ...editingEntry, updatedAt: '2026-06-08' } : entry));
    setEditingEntry(null);
  };

  const deleteEntry = (id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{t('Главная', 'Dashboard')}</span>
            <span>/</span>
            <span>{t('Администрирование', 'Administration')}</span>
            <span>/</span>
            <span className="font-medium text-foreground">{t('Справочники', 'Directories')}</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <BookOpen className="h-6 w-6 text-primary" />
            {t('Справочники', 'Directories')}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" />{t('Импорт', 'Import')}</Button>
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />{t('Экспорт', 'Export')}</Button>
          <Button
            className="gap-2"
            onClick={() => {
              setDraftEntry({ categoryId: selectedCategoryId, name: '', code: '', description: '', active: true });
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t('Добавить запись', 'Add Entry')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t('Справочников', 'Directories')}</p><p className="mt-2 text-2xl font-semibold">{categories.length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t('Записей', 'Entries')}</p><p className="mt-2 text-2xl font-semibold">{entries.length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t('Активные записи', 'Active entries')}</p><p className="mt-2 text-2xl font-semibold">{entries.filter((entry) => entry.active).length}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <CardTitle>{t('Каталоги', 'Catalogs')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-3">
            {Object.entries(groupedCategories).map(([group, items]) => (
              <div key={group}>
                <p className="mb-2 px-2 text-xs font-medium uppercase text-muted-foreground">{group}</p>
                <div className="space-y-1">
                  {items.map((category) => {
                    const Icon = category.icon;
                    const active = selectedCategoryId === category.id;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategoryId(category.id)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-muted/70',
                          active && 'bg-primary/10 text-primary'
                        )}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                          <span className="block font-medium">{categoryTitle(category)}</span>
                          <span className={cn('block text-xs text-muted-foreground', active && 'text-primary/75')}>{categoryDescription(category)}</span>
                        </span>
                        <Badge variant="outline" className="ml-auto shrink-0">{entries.filter((entry) => entry.categoryId === category.id).length}</Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader className="gap-4 border-b">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>{categoryTitle(selectedCategory)}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{categoryDescription(selectedCategory)}</p>
              </div>
              <div className="relative min-w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('Поиск по записи', 'Search entries')} className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">{t('Запись', 'Entry')}</th>
                    <th className="px-5 py-3 font-medium">{t('Код', 'Code')}</th>
                    <th className="px-5 py-3 font-medium">{t('Описание', 'Description')}</th>
                    <th className="px-5 py-3 font-medium">{t('Статус', 'Status')}</th>
                    <th className="px-5 py-3 text-right font-medium">{t('Действия', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/35">
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">{t('Обновлено:', 'Updated:')} {entry.updatedAt}</p>
                      </td>
                      <td className="px-5 py-4"><Badge variant="outline">{entry.code}</Badge></td>
                      <td className="px-5 py-4 text-muted-foreground">{entryDescription(entry.description) || '-'}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Switch checked={entry.active} onCheckedChange={(checked) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, active: checked, updatedAt: '2026-06-08' } : item))} />
                          <span className="text-muted-foreground">{entry.active ? t('Активна', 'Active') : t('Выключена', 'Disabled')}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingEntry({ ...entry })} aria-label={t('Редактировать запись', 'Edit entry')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteEntry(entry.id)} aria-label={t('Удалить запись', 'Delete entry')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="h-40 px-5 text-center text-muted-foreground">{t('Записи не найдены', 'No entries found')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Добавить запись', 'Add Entry')}</DialogTitle>
            <DialogDescription>{t('Создайте значение для выбранного справочника', 'Create a value for the selected directory')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Справочник', 'Directory')}</Label>
              <Select value={draftEntry.categoryId} onValueChange={(value) => setDraftEntry({ ...draftEntry, categoryId: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{categoryTitle(category)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{t('Название', 'Name')}</Label><Input value={draftEntry.name} onChange={(event) => setDraftEntry({ ...draftEntry, name: event.target.value })} /></div>
            <div className="space-y-2"><Label>{t('Код', 'Code')}</Label><Input value={draftEntry.code} onChange={(event) => setDraftEntry({ ...draftEntry, code: event.target.value })} /></div>
            <div className="space-y-2"><Label>{t('Описание', 'Description')}</Label><Input value={draftEntry.description} onChange={(event) => setDraftEntry({ ...draftEntry, description: event.target.value })} /></div>
            <label className="flex items-center gap-3 rounded-md border px-3 py-2">
              <Switch checked={draftEntry.active} onCheckedChange={(checked) => setDraftEntry({ ...draftEntry, active: checked })} />
              <span>{t('Активна', 'Active')}</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('Отмена', 'Cancel')}</Button>
            <Button onClick={saveDraftEntry}>{t('Создать', 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Редактировать запись', 'Edit Entry')}</DialogTitle>
            <DialogDescription>{t('Измените значение справочника', 'Update the directory value')}</DialogDescription>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>{t('Название', 'Name')}</Label><Input value={editingEntry.name} onChange={(event) => setEditingEntry({ ...editingEntry, name: event.target.value })} /></div>
              <div className="space-y-2"><Label>{t('Код', 'Code')}</Label><Input value={editingEntry.code} onChange={(event) => setEditingEntry({ ...editingEntry, code: event.target.value })} /></div>
              <div className="space-y-2"><Label>{t('Описание', 'Description')}</Label><Input value={editingEntry.description} onChange={(event) => setEditingEntry({ ...editingEntry, description: event.target.value })} /></div>
              <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                <Switch checked={editingEntry.active} onCheckedChange={(checked) => setEditingEntry({ ...editingEntry, active: checked })} />
                <span>{t('Активна', 'Active')}</span>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>{t('Отмена', 'Cancel')}</Button>
            <Button onClick={saveEditingEntry}>{t('Сохранить', 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotificationQueueView() {
  type QueueStatus = 'pending' | 'sent' | 'failed' | 'read';
  type QueueItem = {
    id: string;
    date: string;
    type: string;
    recipient: string;
    subject: string;
    message: string;
    status: QueueStatus;
    attempts: number;
    channel: 'push' | 'email' | 'system';
  };

  const [items, setItems] = useState<QueueItem[]>([
    { id: 'n1', date: '08.06.2026 09:00', type: 'Заявка', recipient: 'Камилла Мұхитдинова', subject: 'Назначена новая заявка', message: 'Вам назначена заявка по рабочему месту.', status: 'pending', attempts: 1, channel: 'system' },
    { id: 'n2', date: '08.06.2026 08:44', type: 'SLA', recipient: 'Инженер второй линии', subject: 'SLA близко к нарушению', message: 'Проверьте заявку с высоким приоритетом.', status: 'failed', attempts: 3, channel: 'push' },
    { id: 'n3', date: '07.06.2026 18:20', type: 'Комментарий', recipient: 'Service Desk', subject: 'Новый комментарий по заявке', message: 'Пользователь добавил уточнение.', status: 'sent', attempts: 1, channel: 'email' },
    { id: 'n4', date: '07.06.2026 16:10', type: 'Отчёт', recipient: 'Администратор', subject: 'AI отчёт сформирован', message: 'Ежемесячный отчёт готов к просмотру.', status: 'read', attempts: 1, channel: 'system' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QueueStatus | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);

  const statusLabels: Record<QueueStatus, string> = {
    pending: 'Ожидает',
    sent: 'Отправлено',
    failed: 'Ошибка',
    read: 'Прочитано',
  };

  const statusStyles: Record<QueueStatus, string> = {
    pending: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    sent: 'bg-green-500/10 text-green-700 border-green-500/20',
    failed: 'bg-red-500/10 text-red-700 border-red-500/20',
    read: 'bg-slate-500/10 text-slate-700 border-slate-500/20',
  };

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || [item.type, item.recipient, item.subject, item.message].some((value) => value.toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateItemStatus = (id: string, status: QueueStatus) => {
    setItems((current) => current.map((item) => item.id === id ? {
      ...item,
      status,
      attempts: status === 'pending' ? item.attempts + 1 : item.attempts,
    } : item));
  };

  const deleteItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Главная</span>
            <span>/</span>
            <span>Администрирование</span>
            <span>/</span>
            <span className="font-medium text-foreground">Очередь уведомлений</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ClipboardList className="h-6 w-6 text-primary" />
            Очередь уведомлений
          </h1>
        </div>
        <Button className="gap-2" onClick={() => setItems((current) => current.map((item) => item.status === 'failed' ? { ...item, status: 'pending', attempts: item.attempts + 1 } : item))}>
          <RefreshCw className="h-4 w-4" />
          Повторить ошибки
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Всего</p><p className="mt-2 text-2xl font-semibold">{items.length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Ожидают</p><p className="mt-2 text-2xl font-semibold">{items.filter((item) => item.status === 'pending').length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Ошибки</p><p className="mt-2 text-2xl font-semibold">{items.filter((item) => item.status === 'failed').length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Отправлено</p><p className="mt-2 text-2xl font-semibold">{items.filter((item) => item.status === 'sent' || item.status === 'read').length}</p></CardContent></Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader className="gap-4 border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Список уведомлений</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Поиск по уведомлению" className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={(value: QueueStatus | 'all') => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="pending">Ожидает</SelectItem>
                  <SelectItem value="sent">Отправлено</SelectItem>
                  <SelectItem value="failed">Ошибка</SelectItem>
                  <SelectItem value="read">Прочитано</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Дата</th>
                  <th className="px-5 py-3 font-medium">Тип</th>
                  <th className="px-5 py-3 font-medium">Получатель</th>
                  <th className="px-5 py-3 font-medium">Тема</th>
                  <th className="px-5 py-3 font-medium">Канал</th>
                  <th className="px-5 py-3 font-medium">Статус</th>
                  <th className="px-5 py-3 text-right font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/35" onClick={() => setSelectedItem(item)}>
                    <td className="px-5 py-4 text-muted-foreground">{item.date}</td>
                    <td className="px-5 py-4"><Badge variant="outline">{item.type}</Badge></td>
                    <td className="px-5 py-4 text-muted-foreground">{item.recipient}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{item.subject}</p>
                      <p className="text-xs text-muted-foreground">Попыток: {item.attempts}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{item.channel}</td>
                    <td className="px-5 py-4"><Badge variant="outline" className={statusStyles[item.status]}>{statusLabels[item.status]}</Badge></td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); updateItemStatus(item.id, 'pending'); }} aria-label="Повторить отправку">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); updateItemStatus(item.id, 'sent'); }} aria-label="Отметить отправленным">
                          <CheckSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(event) => { event.stopPropagation(); deleteItem(item.id); }} aria-label="Удалить уведомление">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="h-40 px-5 text-center text-muted-foreground">Уведомления не найдены</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedItem?.subject}</DialogTitle>
            <DialogDescription>{selectedItem ? `${selectedItem.type} · ${selectedItem.recipient}` : ''}</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-muted/45 p-3"><p className="text-xs uppercase text-muted-foreground">Статус</p><Badge variant="outline" className={cn('mt-2', statusStyles[selectedItem.status])}>{statusLabels[selectedItem.status]}</Badge></div>
                <div className="rounded-md bg-muted/45 p-3"><p className="text-xs uppercase text-muted-foreground">Канал</p><p className="mt-2 font-medium">{selectedItem.channel}</p></div>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Сообщение</p>
                <p className="mt-2">{selectedItem.message}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function notificationFallbackRows(): TableRowData[] {
  return [
    ['15-05-2026 09:00', 'Заявки', 'B-Karipbayev', 'Назначена новая заявка', 'Ожидает отправки', '1'],
    ['15-05-2026 08:40', 'SLA', 'Super-Admin', 'Нарушение срока реакции', 'Отправлено', '2'],
    ['14-05-2026 18:20', 'Комментарии', 'Service Desk', 'Новый комментарий по заявке', 'Отправлено', '3'],
  ].map((row) => ({ date: row[0], type: row[1], recipient: row[2], subject: <span className="font-medium text-blue-800">{row[3]}</span>, status: row[4], id: row[5] }));
}

function LogsView() {
  type LogEntry = {
    id: string;
    source: 'Система' | 'Заявки' | 'Активы' | 'Безопасность';
    objectId: string;
    date: string;
    service: string;
    level: 'info' | 'warning' | 'error' | 'audit';
    message: string;
    user: string;
    ip: string;
  };

  const initialEntries: LogEntry[] = logRows.map((row, index) => {
    const message = String(row[5]);
    const isFailed = message.toLowerCase().includes('failed');
    const isTicket = row[0] === 'Заявки';
    return {
      id: `log-${index + 1}`,
      source: isFailed ? 'Безопасность' : String(row[0]) as LogEntry['source'],
      objectId: String(row[1]),
      date: String(row[2]),
      service: String(row[3]),
      level: isFailed ? 'error' : isTicket ? 'audit' : 'info',
      message,
      user: message.split(' ')[0] || 'system',
      ip: message.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/)?.[0] || 'Не указан',
    };
  });

  const [entries, setEntries] = useState<LogEntry[]>(initialEntries);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<LogEntry['source'] | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<LogEntry['level'] | 'all'>('all');
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);

  const levelLabels: Record<LogEntry['level'], string> = {
    info: 'Информация',
    warning: 'Внимание',
    error: 'Ошибка',
    audit: 'Аудит',
  };

  const levelStyles: Record<LogEntry['level'], string> = {
    info: 'border-blue-500/20 bg-blue-500/10 text-blue-700',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-700',
    error: 'border-red-500/20 bg-red-500/10 text-red-700',
    audit: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
  };

  const filteredEntries = entries.filter((entry) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || [entry.source, entry.objectId, entry.date, entry.service, entry.message, entry.user, entry.ip].some((value) => value.toLowerCase().includes(query));
    const matchesSource = sourceFilter === 'all' || entry.source === sourceFilter;
    const matchesLevel = levelFilter === 'all' || entry.level === levelFilter;
    return matchesSearch && matchesSource && matchesLevel;
  });

  const clearInfoLogs = () => {
    setEntries((current) => current.filter((entry) => entry.level !== 'info'));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Главная</span>
            <span>/</span>
            <span>Администрирование</span>
            <span>/</span>
            <span className="font-medium text-foreground">Логи</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Logs className="h-6 w-6 text-primary" />
            Журнал событий
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Экспорт
          </Button>
          <Button variant="outline" className="gap-2" onClick={clearInfoLogs}>
            <Trash2 className="h-4 w-4" />
            Очистить информационные
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Всего записей</p><p className="mt-2 text-2xl font-semibold">{entries.length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Ошибки</p><p className="mt-2 text-2xl font-semibold text-red-600">{entries.filter((entry) => entry.level === 'error').length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Действия по заявкам</p><p className="mt-2 text-2xl font-semibold">{entries.filter((entry) => entry.source === 'Заявки').length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Уникальные IP</p><p className="mt-2 text-2xl font-semibold">{new Set(entries.map((entry) => entry.ip).filter((ip) => ip !== 'Не указан')).size}</p></CardContent></Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader className="gap-4 border-b">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <CardTitle>События системы</CardTitle>
            <div className="flex flex-col gap-2 lg:flex-row">
              <div className="relative min-w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Поиск по пользователю, IP, сообщению" className="pl-10" />
              </div>
              <Select value={sourceFilter} onValueChange={(value: LogEntry['source'] | 'all') => setSourceFilter(value)}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все источники</SelectItem>
                  <SelectItem value="Система">Система</SelectItem>
                  <SelectItem value="Заявки">Заявки</SelectItem>
                  <SelectItem value="Активы">Активы</SelectItem>
                  <SelectItem value="Безопасность">Безопасность</SelectItem>
                </SelectContent>
              </Select>
              <Select value={levelFilter} onValueChange={(value: LogEntry['level'] | 'all') => setLevelFilter(value)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уровни</SelectItem>
                  <SelectItem value="info">Информация</SelectItem>
                  <SelectItem value="warning">Внимание</SelectItem>
                  <SelectItem value="error">Ошибка</SelectItem>
                  <SelectItem value="audit">Аудит</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Дата</th>
                  <th className="px-5 py-3 font-medium">Источник</th>
                  <th className="px-5 py-3 font-medium">Служба</th>
                  <th className="px-5 py-3 font-medium">Пользователь</th>
                  <th className="px-5 py-3 font-medium">IP</th>
                  <th className="px-5 py-3 font-medium">Уровень</th>
                  <th className="px-5 py-3 font-medium">Сообщение</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/35" onClick={() => setSelectedEntry(entry)}>
                    <td className="px-5 py-4 text-muted-foreground">{entry.date}</td>
                    <td className="px-5 py-4"><Badge variant="outline">{entry.source}</Badge></td>
                    <td className="px-5 py-4 text-muted-foreground">{entry.service}</td>
                    <td className="px-5 py-4 font-medium">{entry.user}</td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{entry.ip}</td>
                    <td className="px-5 py-4"><Badge variant="outline" className={levelStyles[entry.level]}>{levelLabels[entry.level]}</Badge></td>
                    <td className="px-5 py-4">
                      <p className="max-w-[440px] truncate text-foreground">{entry.message}</p>
                      {entry.objectId && <p className="text-xs text-muted-foreground">Объект: {entry.objectId}</p>}
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="h-40 px-5 text-center text-muted-foreground">События не найдены</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>Показано: {filteredEntries.length} из {entries.length}</span>
            <span>Данные журнала обновляются автоматически в рабочей системе</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Детали события</DialogTitle>
            <DialogDescription>{selectedEntry ? `${selectedEntry.date} · ${selectedEntry.source}` : ''}</DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-muted/45 p-3"><p className="text-xs uppercase text-muted-foreground">Уровень</p><Badge variant="outline" className={cn('mt-2', levelStyles[selectedEntry.level])}>{levelLabels[selectedEntry.level]}</Badge></div>
                <div className="rounded-md bg-muted/45 p-3"><p className="text-xs uppercase text-muted-foreground">Служба</p><p className="mt-2 font-medium">{selectedEntry.service}</p></div>
                <div className="rounded-md bg-muted/45 p-3"><p className="text-xs uppercase text-muted-foreground">Пользователь</p><p className="mt-2 font-medium">{selectedEntry.user}</p></div>
                <div className="rounded-md bg-muted/45 p-3"><p className="text-xs uppercase text-muted-foreground">IP адрес</p><p className="mt-2 font-mono text-sm">{selectedEntry.ip}</p></div>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Сообщение</p>
                <p className="mt-2">{selectedEntry.message}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEntry(null)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EquipmentView() {
  type InventoryOption = {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
    category: 'assets' | 'network' | 'virtualization' | 'components';
  };

  const { toast } = useToast();
  const [inventoryEnabled, setInventoryEnabled] = useState(true);
  const [frequency, setFrequency] = useState('24');
  const [monitorPartialMatch, setMonitorPartialMatch] = useState(true);
  const [options, setOptions] = useState<InventoryOption[]>([
    { id: 'sections', label: 'Разделы', description: 'Создавать структуру разделов при импорте', enabled: false, category: 'assets' },
    { id: 'removable', label: 'Тома съёмных дисков', description: 'Учитывать внешние и съёмные накопители', enabled: false, category: 'assets' },
    { id: 'monitors', label: 'Мониторы', description: 'Подгружать модели, серийные номера и привязку к рабочему месту', enabled: true, category: 'assets' },
    { id: 'devices', label: 'Устройства', description: 'Импортировать периферию и подключенные устройства', enabled: true, category: 'assets' },
    { id: 'unmanaged', label: 'Неуправляемые активы', description: 'Показывать активы, которые не привязаны к агенту', enabled: false, category: 'assets' },
    { id: 'network-volumes', label: 'Тома сетевых дисков', description: 'Собирать сетевые диски и общие ресурсы', enabled: true, category: 'network' },
    { id: 'software', label: 'Программное обеспечение', description: 'Обновлять список установленного ПО', enabled: true, category: 'network' },
    { id: 'printers', label: 'Принтеры', description: 'Импортировать локальные и сетевые принтеры', enabled: true, category: 'network' },
    { id: 'antivirus', label: 'Антивирусы', description: 'Фиксировать статус защиты на рабочих станциях', enabled: true, category: 'network' },
    { id: 'vm-import', label: 'Виртуальные машины', description: 'Создавать карточки виртуальных машин из данных хоста', enabled: false, category: 'virtualization' },
    { id: 'vm-computer', label: 'Компьютер для виртуальной машины', description: 'Создавать отдельный компьютер для каждой ВМ', enabled: false, category: 'virtualization' },
    { id: 'vm-components', label: 'Компоненты виртуальных машин', description: 'Заполнять CPU, память и диски для ВМ', enabled: false, category: 'virtualization' },
    { id: 'cpu', label: 'Процессоры', description: 'Импортировать процессоры и количество ядер', enabled: true, category: 'components' },
    { id: 'ram', label: 'Память', description: 'Импортировать модули памяти', enabled: true, category: 'components' },
    { id: 'disks', label: 'Жёсткие диски', description: 'Импортировать накопители и объём', enabled: true, category: 'components' },
    { id: 'network-cards', label: 'Сетевые карты', description: 'Импортировать MAC, интерфейсы и скорость', enabled: true, category: 'components' },
  ]);

  const toggleOption = (id: string, enabled: boolean) => {
    setOptions((current) => current.map((option) => option.id === id ? { ...option, enabled } : option));
  };

  const saveSettings = () => {
    toast({ title: 'Готово', description: 'Настройки оборудования сохранены' });
  };

  const categoryMeta: Record<InventoryOption['category'], { title: string; description: string; icon: LucideIcon }> = {
    assets: { title: 'Активы', description: 'Что создавать и обновлять при импорте', icon: Laptop },
    network: { title: 'Сеть и ПО', description: 'Сетевые ресурсы, принтеры и установленное ПО', icon: Network },
    virtualization: { title: 'Виртуализация', description: 'Как обрабатывать виртуальные машины', icon: Boxes },
    components: { title: 'Компоненты', description: 'Аппаратные данные, которые попадут в карточку актива', icon: Monitor },
  };

  const enabledCount = options.filter((option) => option.enabled).length;
  const categoryOptions = (category: InventoryOption['category']) => options.filter((option) => option.category === category);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Главная</span>
            <span>/</span>
            <span>Администрирование</span>
            <span>/</span>
            <span className="font-medium text-foreground">Оборудование</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Wrench className="h-6 w-6 text-primary" />
            Настройки оборудования
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2">
            <Bot className="h-4 w-4" />
            Агенты
          </Button>
          <Button variant="outline" className="gap-2">
            <KeyRound className="h-4 w-4" />
            Заблокированные поля
          </Button>
          <Button className="gap-2" onClick={saveSettings}>
            <CheckSquare className="h-4 w-4" />
            Сохранить
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Инвентаризация</p><p className="mt-2 text-2xl font-semibold">{inventoryEnabled ? 'Включена' : 'Выключена'}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Активных опций</p><p className="mt-2 text-2xl font-semibold">{enabledCount} из {options.length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Частота</p><p className="mt-2 text-2xl font-semibold">{frequency} ч</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Агенты</p><p className="mt-2 text-2xl font-semibold">2 онлайн</p></CardContent></Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Основные параметры</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Управление импортом данных с агентов и сетевых устройств</p>
            </div>
            <label className="flex items-center gap-3 rounded-md border px-4 py-3">
              <Switch checked={inventoryEnabled} onCheckedChange={setInventoryEnabled} />
              <span className="font-medium">Включить инвентаризацию</span>
            </label>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Частота инвентаризации</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Каждые 6 часов</SelectItem>
                <SelectItem value="12">Каждые 12 часов</SelectItem>
                <SelectItem value="24">Каждые 24 часа</SelectItem>
                <SelectItem value="48">Каждые 48 часов</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
            <span>
              <span className="block font-medium">Частичное совпадение мониторов</span>
              <span className="text-sm text-muted-foreground">Разрешить поиск монитора по части серийного номера</span>
            </span>
            <Switch checked={monitorPartialMatch} onCheckedChange={setMonitorPartialMatch} />
          </label>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {(Object.keys(categoryMeta) as InventoryOption['category'][]).map((category) => {
          const meta = categoryMeta[category];
          const Icon = meta.icon;
          return (
            <Card key={category} className="rounded-lg">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {meta.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{meta.description}</p>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {categoryOptions(category).map((option) => (
                  <label key={option.id} className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 hover:bg-muted/35">
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{option.label}</span>
                      <span className="block text-sm text-muted-foreground">{option.description}</span>
                    </span>
                    <Switch checked={option.enabled} onCheckedChange={(checked) => toggleOption(option.id, checked)} disabled={!inventoryEnabled} />
                  </label>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-lg">
        <CardHeader className="border-b">
          <CardTitle>Связанные настройки</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-5 md:grid-cols-3">
          {[
            ['Правила импорта', 'Настроить правила подключения оборудования'],
            ['Назначение к отделу', 'Автоматически привязывать активы к отделам'],
            ['Типы сетевых портов', 'Управлять справочником сетевых интерфейсов'],
          ].map(([title, description]) => (
            <button key={title} className="rounded-md border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5">
              <p className="font-medium text-foreground">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function OptionRow({ label, checked = false }: { label: string; checked?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_40px] items-center gap-4 py-2">
      <span>{label}</span>
      <span className={cn('h-5 w-5 rounded border', checked ? 'border-amber-400 bg-amber-400' : 'border-slate-300 bg-white')} />
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="bg-slate-50 px-2 py-3 text-xl font-bold">{title}</h3>;
}

function GlpiInventoryView() {
  type Agent = {
    id: string;
    name: string;
    device: string;
    ip: string;
    status: 'online' | 'offline' | 'warning';
    lastSync: string;
    inventory: string;
  };
  type InventoryTask = {
    id: string;
    name: string;
    target: string;
    status: 'running' | 'done' | 'waiting' | 'failed';
    progress: number;
    updatedAt: string;
  };

  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([
    { id: 'a1', name: 'QG-AGENT-01', device: 'Kamilla-MacBook', ip: '10.75.14.72', status: 'online', lastSync: '08.06.2026 09:12', inventory: 'Компьютер, ПО, монитор' },
    { id: 'a2', name: 'QG-AGENT-02', device: 'ServiceDesk-PC', ip: '10.75.14.91', status: 'warning', lastSync: '08.06.2026 08:40', inventory: 'Компьютер, принтеры' },
    { id: 'a3', name: 'QG-AGENT-03', device: 'Finance-PC', ip: '10.75.15.10', status: 'offline', lastSync: '07.06.2026 18:05', inventory: 'Ожидает синхронизации' },
  ]);
  const [tasks, setTasks] = useState<InventoryTask[]>([
    { id: 't1', name: 'Полная инвентаризация рабочих станций', target: 'Все агенты', status: 'running', progress: 65, updatedAt: '08.06.2026 09:15' },
    { id: 't2', name: 'Сканирование сетевых устройств', target: '10.75.14.0/24', status: 'waiting', progress: 0, updatedAt: '08.06.2026 08:30' },
    { id: 't3', name: 'Проверка программного обеспечения', target: 'IT бөлімі', status: 'done', progress: 100, updatedAt: '07.06.2026 19:10' },
  ]);
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'tasks'>('overview');

  const statusLabels = {
    online: 'Онлайн',
    offline: 'Офлайн',
    warning: 'Требует внимания',
    running: 'Выполняется',
    done: 'Готово',
    waiting: 'Ожидает',
    failed: 'Ошибка',
  } as const;

  const statusStyles: Record<Agent['status'] | InventoryTask['status'], string> = {
    online: 'border-green-500/20 bg-green-500/10 text-green-700',
    offline: 'border-slate-500/20 bg-slate-500/10 text-slate-700',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-700',
    running: 'border-blue-500/20 bg-blue-500/10 text-blue-700',
    done: 'border-green-500/20 bg-green-500/10 text-green-700',
    waiting: 'border-slate-500/20 bg-slate-500/10 text-slate-700',
    failed: 'border-red-500/20 bg-red-500/10 text-red-700',
  };

  const runSync = () => {
    setAgents((current) => current.map((agent) => agent.status === 'offline' ? { ...agent, status: 'warning', lastSync: 'Ожидает ответа агента' } : { ...agent, lastSync: '08.06.2026 09:30' }));
    toast({ title: 'Синхронизация запущена', description: 'Агенты получат задачу инвентаризации' });
  };

  const restartTask = (id: string) => {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: 'running', progress: 10, updatedAt: '08.06.2026 09:30' } : task));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Главная</span>
            <span>/</span>
            <span>Администрирование</span>
            <span>/</span>
            <span className="font-medium text-foreground">GLPI Inventory</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Network className="h-6 w-6 text-primary" />
            GLPI Inventory
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Настройки
          </Button>
          <Button className="gap-2" onClick={runSync}>
            <RefreshCw className="h-4 w-4" />
            Запустить синхронизацию
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Агенты</p><p className="mt-2 text-2xl font-semibold">{agents.length}</p><p className="text-sm text-muted-foreground">{agents.filter((agent) => agent.status === 'online').length} онлайн</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Компьютеры</p><p className="mt-2 text-2xl font-semibold">2</p><p className="text-sm text-muted-foreground">обновлены сегодня</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Сетевые устройства</p><p className="mt-2 text-2xl font-semibold">3</p><p className="text-sm text-muted-foreground">доступны для сканирования</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Задачи</p><p className="mt-2 text-2xl font-semibold">{tasks.length}</p><p className="text-sm text-muted-foreground">{tasks.filter((task) => task.status === 'running').length} выполняется</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['overview', 'Обзор'],
          ['agents', 'Агенты'],
          ['tasks', 'Задачи'],
        ].map(([id, label]) => (
          <Button key={id} variant={activeTab === id ? 'default' : 'outline'} onClick={() => setActiveTab(id as typeof activeTab)}>
            {label}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card className="rounded-lg">
            <CardHeader className="border-b">
              <CardTitle>Последняя инвентаризация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {tasks.map((task) => (
                <div key={task.id} className="rounded-md border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{task.name}</p>
                      <p className="text-sm text-muted-foreground">{task.target} · {task.updatedAt}</p>
                    </div>
                    <Badge variant="outline" className={statusStyles[task.status]}>{statusLabels[task.status]}</Badge>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="border-b">
              <CardTitle>Состояние</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <div className="rounded-md bg-green-500/10 p-4 text-green-800">
                <p className="font-medium">Служба работает</p>
                <p className="mt-1 text-sm">Сервер принимает данные от агентов.</p>
              </div>
              <div className="rounded-md bg-amber-500/10 p-4 text-amber-800">
                <p className="font-medium">1 агент требует внимания</p>
                <p className="mt-1 text-sm">Проверьте ServiceDesk-PC после синхронизации.</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Следующий запуск</p>
                <p className="mt-1 font-medium">08.06.2026 12:00</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'agents' && (
        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <CardTitle>Агенты инвентаризации</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Агент</th>
                    <th className="px-5 py-3 font-medium">Устройство</th>
                    <th className="px-5 py-3 font-medium">IP</th>
                    <th className="px-5 py-3 font-medium">Последняя синхронизация</th>
                    <th className="px-5 py-3 font-medium">Инвентаризация</th>
                    <th className="px-5 py-3 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.id} className="border-b last:border-0 hover:bg-muted/35">
                      <td className="px-5 py-4 font-medium">{agent.name}</td>
                      <td className="px-5 py-4 text-muted-foreground">{agent.device}</td>
                      <td className="px-5 py-4 font-mono text-xs">{agent.ip}</td>
                      <td className="px-5 py-4 text-muted-foreground">{agent.lastSync}</td>
                      <td className="px-5 py-4 text-muted-foreground">{agent.inventory}</td>
                      <td className="px-5 py-4"><Badge variant="outline" className={statusStyles[agent.status]}>{statusLabels[agent.status]}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'tasks' && (
        <Card className="rounded-lg">
          <CardHeader className="border-b">
            <CardTitle>Задачи инвентаризации</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Задача</th>
                    <th className="px-5 py-3 font-medium">Цель</th>
                    <th className="px-5 py-3 font-medium">Прогресс</th>
                    <th className="px-5 py-3 font-medium">Обновлена</th>
                    <th className="px-5 py-3 font-medium">Статус</th>
                    <th className="px-5 py-3 text-right font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b last:border-0 hover:bg-muted/35">
                      <td className="px-5 py-4 font-medium">{task.name}</td>
                      <td className="px-5 py-4 text-muted-foreground">{task.target}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-32 rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{task.progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{task.updatedAt}</td>
                      <td className="px-5 py-4"><Badge variant="outline" className={statusStyles[task.status]}>{statusLabels[task.status]}</Badge></td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => restartTask(task.id)} aria-label="Перезапустить задачу">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FormsView() {
  type FormStatus = 'active' | 'draft' | 'archived';
  type ServiceForm = {
    id: string;
    name: string;
    status: FormStatus;
    target: string;
    fields: number;
    owner: string;
    description: string;
    submissions: number;
    updatedAt: string;
  };

  const { toast } = useToast();
  const [forms, setForms] = useState<ServiceForm[]>(formRows.map((row, index) => ({
    id: `form-${index + 1}`,
    name: row[0],
    status: row[1] === 'Черновик' ? 'draft' : 'active',
    target: row[2],
    fields: Number(row[3]) || 0,
    owner: row[4],
    description: row[0] === 'Заявка на доступ'
      ? 'Форма для запроса доступа к системам, папкам и сервисам.'
      : row[0] === 'Регистрация инцидента'
        ? 'Быстрое создание инцидента с категорией, приоритетом и вложениями.'
        : row[0] === 'Запрос оборудования'
          ? 'Запрос ноутбука, монитора, периферии или расходных материалов.'
          : 'Форма согласования изменений с ответственными и сроками.',
    submissions: [18, 42, 7, 11][index] || 0,
    updatedAt: ['08.06.2026', '07.06.2026', '05.06.2026', '04.06.2026'][index] || '08.06.2026',
  })));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FormStatus | 'all'>('all');
  const [selectedForm, setSelectedForm] = useState<ServiceForm | null>(null);
  const [editingForm, setEditingForm] = useState<ServiceForm | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftForm, setDraftForm] = useState({
    name: '',
    target: 'Пользователи',
    owner: 'ID Support',
    fields: 5,
    description: '',
  });

  const statusLabels: Record<FormStatus, string> = {
    active: 'Активна',
    draft: 'Черновик',
    archived: 'Архив',
  };

  const statusStyles: Record<FormStatus, string> = {
    active: 'border-green-500/20 bg-green-500/10 text-green-700',
    draft: 'border-amber-500/20 bg-amber-500/10 text-amber-700',
    archived: 'border-slate-500/20 bg-slate-500/10 text-slate-700',
  };

  const filteredForms = forms.filter((form) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || [form.name, form.target, form.owner, form.description].some((value) => value.toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const saveDraftForm = () => {
    if (!draftForm.name.trim()) return;
    setForms((current) => [
      ...current,
      {
        id: `form-${Date.now()}`,
        name: draftForm.name.trim(),
        status: 'draft',
        target: draftForm.target,
        owner: draftForm.owner,
        fields: draftForm.fields,
        description: draftForm.description.trim() || 'Описание формы не заполнено.',
        submissions: 0,
        updatedAt: '08.06.2026',
      },
    ]);
    setCreateOpen(false);
    setDraftForm({ name: '', target: 'Пользователи', owner: 'ID Support', fields: 5, description: '' });
    toast({ title: 'Форма создана', description: 'Новая форма добавлена как черновик' });
  };

  const saveEditingForm = () => {
    if (!editingForm) return;
    setForms((current) => current.map((form) => form.id === editingForm.id ? { ...editingForm, updatedAt: '08.06.2026' } : form));
    setEditingForm(null);
    toast({ title: 'Готово', description: 'Форма обновлена' });
  };

  const toggleFormStatus = (id: string) => {
    setForms((current) => current.map((form) => form.id === id ? { ...form, status: form.status === 'active' ? 'draft' : 'active', updatedAt: '08.06.2026' } : form));
  };

  const deleteForm = (id: string) => {
    setForms((current) => current.filter((form) => form.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Главная</span>
            <span>/</span>
            <span>Администрирование</span>
            <span>/</span>
            <span className="font-medium text-foreground">Формы</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <FileText className="h-6 w-6 text-primary" />
            Формы заявок
          </h1>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Добавить форму
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Всего форм</p><p className="mt-2 text-2xl font-semibold">{forms.length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Активные</p><p className="mt-2 text-2xl font-semibold">{forms.filter((form) => form.status === 'active').length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Черновики</p><p className="mt-2 text-2xl font-semibold">{forms.filter((form) => form.status === 'draft').length}</p></CardContent></Card>
        <Card className="rounded-lg"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Отправок</p><p className="mt-2 text-2xl font-semibold">{forms.reduce((total, form) => total + form.submissions, 0)}</p></CardContent></Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader className="gap-4 border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Список форм</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-[300px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Поиск по форме" className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={(value: FormStatus | 'all') => setStatusFilter(value)}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="active">Активные</SelectItem>
                  <SelectItem value="draft">Черновики</SelectItem>
                  <SelectItem value="archived">Архив</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b bg-muted/45 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Форма</th>
                  <th className="px-5 py-3 font-medium">Назначение</th>
                  <th className="px-5 py-3 font-medium">Поля</th>
                  <th className="px-5 py-3 font-medium">Отправки</th>
                  <th className="px-5 py-3 font-medium">Владелец</th>
                  <th className="px-5 py-3 font-medium">Статус</th>
                  <th className="px-5 py-3 text-right font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredForms.map((form) => (
                  <tr key={form.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/35" onClick={() => setSelectedForm(form)}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-foreground">{form.name}</p>
                      <p className="max-w-[420px] truncate text-xs text-muted-foreground">{form.description}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{form.target}</td>
                    <td className="px-5 py-4">{form.fields}</td>
                    <td className="px-5 py-4">{form.submissions}</td>
                    <td className="px-5 py-4 text-muted-foreground">{form.owner}</td>
                    <td className="px-5 py-4"><Badge variant="outline" className={statusStyles[form.status]}>{statusLabels[form.status]}</Badge></td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); setEditingForm({ ...form }); }} aria-label="Редактировать форму">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); toggleFormStatus(form.id); }} aria-label="Изменить статус формы">
                          <CheckSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(event) => { event.stopPropagation(); deleteForm(form.id); }} aria-label="Удалить форму">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredForms.length === 0 && (
                  <tr>
                    <td colSpan={7} className="h-40 px-5 text-center text-muted-foreground">Формы не найдены</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedForm} onOpenChange={(open) => !open && setSelectedForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedForm?.name}</DialogTitle>
            <DialogDescription>{selectedForm?.target}</DialogDescription>
          </DialogHeader>
          {selectedForm && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-muted/45 p-3"><p className="text-xs uppercase text-muted-foreground">Статус</p><Badge variant="outline" className={cn('mt-2', statusStyles[selectedForm.status])}>{statusLabels[selectedForm.status]}</Badge></div>
                <div className="rounded-md bg-muted/45 p-3"><p className="text-xs uppercase text-muted-foreground">Поля</p><p className="mt-2 font-medium">{selectedForm.fields}</p></div>
                <div className="rounded-md bg-muted/45 p-3"><p className="text-xs uppercase text-muted-foreground">Отправки</p><p className="mt-2 font-medium">{selectedForm.submissions}</p></div>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Описание</p>
                <p className="mt-2">{selectedForm.description}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedForm(null)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить форму</DialogTitle>
            <DialogDescription>Создайте форму для заявок или согласований</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Название</Label><Input value={draftForm.name} onChange={(event) => setDraftForm({ ...draftForm, name: event.target.value })} /></div>
            <div className="space-y-2"><Label>Назначение</Label><Input value={draftForm.target} onChange={(event) => setDraftForm({ ...draftForm, target: event.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Владелец</Label><Input value={draftForm.owner} onChange={(event) => setDraftForm({ ...draftForm, owner: event.target.value })} /></div>
              <div className="space-y-2"><Label>Количество полей</Label><Input type="number" value={draftForm.fields} onChange={(event) => setDraftForm({ ...draftForm, fields: Number(event.target.value) || 0 })} /></div>
            </div>
            <div className="space-y-2"><Label>Описание</Label><Input value={draftForm.description} onChange={(event) => setDraftForm({ ...draftForm, description: event.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={saveDraftForm}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingForm} onOpenChange={(open) => !open && setEditingForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать форму</DialogTitle>
            <DialogDescription>Измените название, владельца или назначение</DialogDescription>
          </DialogHeader>
          {editingForm && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Название</Label><Input value={editingForm.name} onChange={(event) => setEditingForm({ ...editingForm, name: event.target.value })} /></div>
              <div className="space-y-2"><Label>Назначение</Label><Input value={editingForm.target} onChange={(event) => setEditingForm({ ...editingForm, target: event.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Владелец</Label><Input value={editingForm.owner} onChange={(event) => setEditingForm({ ...editingForm, owner: event.target.value })} /></div>
                <div className="space-y-2"><Label>Поля</Label><Input type="number" value={editingForm.fields} onChange={(event) => setEditingForm({ ...editingForm, fields: Number(event.target.value) || 0 })} /></div>
              </div>
              <div className="space-y-2"><Label>Описание</Label><Input value={editingForm.description} onChange={(event) => setEditingForm({ ...editingForm, description: event.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingForm(null)}>Отмена</Button>
            <Button onClick={saveEditingForm}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdministrationSection() {
  const location = useLocation();
  const section = getSection(location.pathname);
  const actions = useMemo(() => {
    if (section === 'rules' || section === 'directories' || section === 'logs') return null;
    if (section === 'equipment') {
      return (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-blue-900 text-blue-900"><Bot className="mr-2 h-4 w-4" />Агенты</Button>
          <Button variant="outline" className="border-blue-900 text-blue-900"><KeyRound className="mr-2 h-4 w-4" />Заблокированные поля</Button>
          <Button variant="outline" className="border-blue-900 text-blue-900"><Cable className="mr-2 h-4 w-4" />Учётные данные SNMP</Button>
        </div>
      );
    }
    if (section === 'glpi-inventory') {
      return <Button variant="outline" className="border-blue-900 text-blue-900"><Wrench className="mr-2 h-4 w-4" />Настройки</Button>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        <Button className="bg-blue-950 text-white hover:bg-blue-900"><Plus className="mr-2 h-4 w-4" />Добавить</Button>
        <Button variant="outline" className="border-blue-900 text-blue-900"><Search className="mr-2 h-4 w-4" />Поиск</Button>
        <Button variant="outline" className="border-blue-900 text-blue-900"><Star className="mr-2 h-4 w-4" />Список</Button>
      </div>
    );
  }, [section]);

  if (section === 'users') {
    return <UsersView />;
  }

  if (section === 'groups') {
    return <GroupsView />;
  }

  if (section === 'organizations') {
    return <OrganizationsView />;
  }

  if (section === 'rules') {
    return <RulesView />;
  }

  if (section === 'directories') {
    return <DirectoriesView />;
  }

  if (section === 'profiles') {
    return <ProfilesView />;
  }

  if (section === 'notification-queue') {
    return <NotificationQueueView />;
  }

  if (section === 'logs') {
    return <LogsView />;
  }

  if (section === 'equipment') {
    return <EquipmentView />;
  }

  if (section === 'glpi-inventory') {
    return <GlpiInventoryView />;
  }

  if (section === 'forms') {
    return <FormsView />;
  }

  return (
    <AdminShell section={section} actions={actions}>
    </AdminShell>
  );
}

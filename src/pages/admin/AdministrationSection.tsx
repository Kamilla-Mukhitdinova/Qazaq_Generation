import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
  Logs,
  Mail,
  MapPin,
  Monitor,
  Network,
  PenLine,
  Phone,
  Plus,
  Printer,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

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

const sectionMeta: Record<AdminSection, SectionMeta> = {
  users: { title: 'Пользователи', icon: UserCog },
  groups: { title: 'Группы', icon: UsersRound },
  organizations: { title: 'Организации', icon: Layers },
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
  const [rows, setRows] = useState<TableRowData[]>([]);

  useEffect(() => {
    let ignore = false;
    Promise.all([api.getProfiles(), api.getDepartments(), api.getGroups()])
      .then(([profiles, departments, groups]) => {
        if (ignore) return;
        const deptMap = new Map((departments || []).map((d: any) => [d.id, d.name]));
        const groupMap = new Map((groups || []).map((g: any) => [g.id, g.name]));
        const mapped = (profiles || []).slice(0, 20).map((profile: any, index: number) => {
          const nameParts = String(profile.name || '').split(' ');
          const login = String(profile.email || '').split('@')[0] || `user-${index + 1}`;
          return {
            login: <span className="font-medium text-blue-800">{login}</span>,
            lastName: nameParts[0] || profile.name || '-',
            firstName: nameParts.slice(1).join(' ') || '-',
            email: <span className="text-blue-800">{profile.email || '-'}</span>,
            phone: '+7 7172 55 ' + String(2600 + index).padStart(4, '0'),
            active: index % 3 === 1 ? 'Нет' : 'Да',
            category: groupMap.get(profile.group_id) || 'Пользователь',
            id: profile.user_id?.slice(0, 4) || index + 1,
            profile: '01 Пользователь (Self-Service)',
            organization: deptMap.get(profile.department_id) || 'ID Support',
          };
        });
        setRows(mapped.length ? mapped : fallbackUserRows());
      })
      .catch(() => setRows(fallbackUserRows()));
    return () => { ignore = true; };
  }, []);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-0">
        <Button variant="secondary" className="h-12 rounded-r-none text-blue-800">Действия</Button>
        <Button variant="outline" className="h-12 rounded-none border-blue-900 text-blue-900"><UserPlus className="mr-2 h-5 w-5" />Добавить пользователя ...</Button>
        <Button variant="outline" className="h-12 rounded-none border-blue-900 text-blue-900"><Users className="mr-2 h-5 w-5" />...из внешнего источника</Button>
        <Button variant="outline" className="h-12 rounded-l-none border-blue-900 text-blue-900"><Settings className="mr-2 h-5 w-5" />Связи с LDAP</Button>
      </div>
      <SearchBox />
      <DataTable
        columns={[
          { key: 'login', label: 'Имя пользователя' },
          { key: 'lastName', label: 'Фамилия' },
          { key: 'firstName', label: 'Имя' },
          { key: 'email', label: 'Email адрес' },
          { key: 'phone', label: 'Телефон' },
          { key: 'active', label: 'Активен' },
          { key: 'category', label: 'Категория' },
          { key: 'id', label: 'ID' },
          { key: 'profile', label: 'Профиль по умолчанию' },
          { key: 'organization', label: 'Организация по умолчанию' },
        ]}
        rows={rows.length ? rows : fallbackUserRows()}
        count="Отображаются строки с 1 по 50 из 500"
      />
    </>
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
  const [rows, setRows] = useState<TableRowData[]>([]);

  useEffect(() => {
    let ignore = false;
    Promise.all([api.getGroups(), api.getDepartments()])
      .then(([groups, departments]) => {
        if (ignore) return;
        const deptMap = new Map((departments || []).map((d: any) => [d.id, d.name]));
        const mapped = (groups || []).map((group: any, index: number) => ({
          name: <span className="font-medium text-blue-800">{group.name}</span>,
          organization: <Badge variant="secondary" className="font-normal text-blue-800">{deptMap.get(group.department_id) || 'АО ФНБ Самрук Казына'}</Badge>,
          comment: index === 0 ? 'Только VIP пользователи' : '',
          users: 'Да',
          id: index + 1,
        }));
        setRows(mapped.length ? mapped : fallbackGroupRows());
      })
      .catch(() => setRows(fallbackGroupRows()));
    return () => { ignore = true; };
  }, []);

  return (
    <>
      <Button variant="outline" className="mb-5 h-12 border-blue-900 text-blue-900"><Users className="mr-2 h-5 w-5" />Связи с LDAP</Button>
      <SearchBox />
      <DataTable
        columns={[
          { key: 'name', label: 'Полное название' },
          { key: 'organization', label: 'Организация' },
          { key: 'comment', label: 'Комментарии' },
          { key: 'users', label: 'Может содержать пользователи' },
          { key: 'id', label: 'ID' },
        ]}
        rows={rows.length ? rows : fallbackGroupRows()}
      />
    </>
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
  const [rows, setRows] = useState<TableRowData[]>([]);

  useEffect(() => {
    let ignore = false;
    api.getDepartments()
      .then((departments) => {
        if (ignore) return;
        const mapped = (departments || []).map((department: any, index: number) => ({
          fullName: <span>АО ФНБ Самрук Казына &gt; <span className="font-medium text-blue-800">{department.name}</span></span>,
          id: index + 8,
          name: <span className="font-medium text-blue-800">{department.name}</span>,
          comment: index === 0 ? 'Не переименовывай' : '',
        }));
        setRows(mapped.length ? mapped : [{
          fullName: <span>АО ФНБ Самрук Казына &gt; <span className="font-medium text-blue-800">ID Support</span></span>,
          id: 8,
          name: <span className="font-medium text-blue-800">ID Support</span>,
          comment: 'Не переименовывай',
        }]);
      })
      .catch(() => setRows([{
        fullName: <span>АО ФНБ Самрук Казына &gt; <span className="font-medium text-blue-800">ID Support</span></span>,
        id: 8,
        name: <span className="font-medium text-blue-800">ID Support</span>,
        comment: 'Не переименовывай',
      }]));
    return () => { ignore = true; };
  }, []);

  return (
    <>
      <SearchBox />
      <DataTable
        columns={[
          { key: 'fullName', label: 'Полное название' },
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Наименование' },
          { key: 'comment', label: 'Комментарии' },
        ]}
        rows={rows}
        count="Отображаются строки с 1 по 1 из 1"
      />
    </>
  );
}

function ProfilesView() {
  return (
    <>
      <SearchBox globalRule={false} />
      <DataTable
        columns={[
          { key: 'name', label: 'Наименование' },
          { key: 'id', label: 'ID' },
          { key: 'default', label: 'Профиль по умолчанию' },
          { key: 'updated', label: 'Последнее изменение' },
          { key: 'comment', label: 'Комментарии' },
        ]}
        rows={profileRows.map((row) => ({
          name: <span className="font-medium text-blue-800">{row[0]}</span>,
          id: row[1],
          default: row[2],
          updated: row[3],
          comment: row[4],
        }))}
        count="Отображаются строки с 1 по 19 из 19"
      />
    </>
  );
}

function RulesView() {
  const [mode, setMode] = useState<'types' | 'import'>('types');
  const ruleTypes = [
    [BookOpen, 'Правила импорта и подключения оборудования'],
    [Layers, 'Правила назначения объекта к организации'],
    [MapPin, 'Правила расположения'],
    [Mail, 'Правила назначения заявки созданной через приемник почты'],
    [UserCog, 'Правила назначений при авторизации'],
    [Boxes, 'Правила назначения категории для ПО'],
    [CircleAlert, 'Бизнес-правила для заявок'],
    [BookOpen, 'Бизнес-правила для активов'],
    [Import, 'Перенос'],
    [CircleAlert, 'Чёрные списки'],
  ] as const;

  if (mode === 'import') {
    return (
      <div>
        <div className="mb-4 flex flex-wrap border bg-white">
          {['Все', 'Компьютеры', 'Мониторы', 'Сетевые устройства', 'Устройств', 'Телефоны', 'Принтеры', 'Лицензии', 'Сертификаты', 'Корпуса', 'Кабели', 'Глобально'].map((tab, index) => (
            <button key={tab} className={cn('border-r px-5 py-3 text-base text-slate-500', index === 0 && 'font-semibold text-slate-900')}>{tab}</button>
          ))}
        </div>
        <Card className="overflow-hidden rounded-md">
          <CardHeader className="bg-white"><CardTitle className="text-xl">Обработка закончится на первом сработавшем условии.</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-6 py-5 text-sm text-slate-600">
              <Button variant="outline" className="border-blue-900 text-blue-900">↩ Действие</Button>
              <span>с 1 по 50 из 63</span>
            </div>
            <DataTable
              className="border-0 shadow-none"
              columns={[
                { key: 'name', label: 'Наименование' },
                { key: 'description', label: 'Описание' },
                { key: 'criteria', label: 'Критерии' },
                { key: 'action', label: 'Действие' },
                { key: 'active', label: 'Активен' },
              ]}
              rows={ruleRows.map((row) => ({
                name: <span className="font-medium text-blue-800">{row[0]}</span>,
                description: '',
                criteria: <div className="space-y-2">{row[1].split('\n').map((line) => <Badge key={line} variant="secondary" className="mr-1 text-blue-800">{line}</Badge>)}</div>,
                action: <Badge variant="secondary" className="whitespace-normal text-center text-blue-800">{row[2]}</Badge>,
                active: <span className="inline-block h-4 w-4 rounded-full bg-green-600" />,
              }))}
              count="Отображаются строки с 1 по 50 из 63"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex justify-center gap-4">
        <Button className="bg-amber-400 text-slate-900 hover:bg-amber-500"><Upload className="mr-2 h-5 w-5" />Импорт</Button>
        <Button className="bg-amber-400 text-slate-900 hover:bg-amber-500"><Download className="mr-2 h-5 w-5" />Экспорт</Button>
      </div>
      <Card className="overflow-hidden rounded-md">
        <CardHeader><CardTitle>Выберите тип правила</CardTitle></CardHeader>
        <CardContent className="p-0">
          {ruleTypes.map(([Icon, label], index) => (
            <button key={label} onClick={() => index === 0 && setMode('import')} className="flex w-full items-center gap-4 border-t px-7 py-5 text-left text-lg hover:bg-slate-50">
              <Icon className="h-5 w-5 text-slate-800" />
              <span>{label}</span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DirectoriesView() {
  const groups = [
    { title: 'Общий каталог', items: [[Boxes, 'Программное обеспечение'], [PenLine, 'Производители'], [Printer, 'Принтеры']] },
    { title: 'Модели', items: [[Laptop, 'Модели компьютеров'], [Monitor, 'Модели мониторов'], [Printer, 'Модели принтеров'], [Boxes, 'Модели устройств'], [Network, 'Модели сетевого оборудования'], [Phone, 'Модели телефонов']] },
    { title: 'Типы', items: [[Laptop, 'Типы компьютеров'], [Monitor, 'Типы мониторов'], [Printer, 'Типы принтеров'], [Boxes, 'Типы устройств'], [PenLine, 'Типы сетевого оборудования'], [Phone, 'Типы телефонов']] },
    { title: 'Операционные системы', items: [[PenLine, 'Операционные системы'], [PenLine, 'Пакеты исправлений'], [PenLine, 'Версии операционных систем'], [PenLine, 'Архитектуры операционных систем'], [PenLine, 'Издания']] },
  ] as { title: string; items: [LucideIcon, string][] }[];

  return (
    <div>
      <div className="mb-6 flex justify-center gap-4">
        <Button className="bg-amber-400 text-slate-900 hover:bg-amber-500"><Upload className="mr-2 h-5 w-5" />Импорт</Button>
        <Button className="bg-amber-400 text-slate-900 hover:bg-amber-500"><Download className="mr-2 h-5 w-5" />Экспорт</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-4">
        {groups.map((group) => (
          <Card key={group.title} className="overflow-hidden rounded-md">
            <CardHeader><CardTitle>{group.title}</CardTitle></CardHeader>
            <CardContent className="p-0">
              {group.items.map(([Icon, label]) => (
                <div key={label} className="flex min-h-16 items-center gap-4 border-t px-7 py-4 text-lg">
                  <Icon className="h-5 w-5" />
                  {label}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NotificationQueueView() {
  const [rows, setRows] = useState<TableRowData[]>([]);

  useEffect(() => {
    let ignore = false;
    api.getNotifications()
      .then((items) => {
        if (ignore) return;
        const mapped = (items || []).slice(0, 20).map((item: any, index: number) => ({
          date: item.created_at ? new Date(item.created_at).toLocaleString('ru-RU') : '15-05-2026 09:00',
          type: item.type || 'Уведомление',
          recipient: item.to_user_id?.slice(0, 8) || 'Пользователь',
          subject: <span className="font-medium text-blue-800">{item.title}</span>,
          status: item.is_read ? 'Прочитано' : 'Ожидает отправки',
          id: index + 1,
        }));
        setRows(mapped.length ? mapped : notificationFallbackRows());
      })
      .catch(() => setRows(notificationFallbackRows()));
    return () => { ignore = true; };
  }, []);

  return (
    <>
      <SearchBox />
      <DataTable
        columns={[
          { key: 'date', label: 'Дата' },
          { key: 'type', label: 'Тип' },
          { key: 'recipient', label: 'Получатель' },
          { key: 'subject', label: 'Тема' },
          { key: 'status', label: 'Статус' },
          { key: 'id', label: 'ID' },
        ]}
        rows={rows.length ? rows : notificationFallbackRows()}
      />
    </>
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
  return (
    <Card className="mx-auto max-w-[1500px] overflow-hidden rounded-md">
      <div className="flex justify-end gap-3 border-b bg-white px-6 py-5">
        <span className="text-lg">Показать</span>
        <Select defaultValue="50"><SelectTrigger className="h-9 w-32 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="50">50</SelectItem></SelectContent></Select>
        <span className="text-lg">записи</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-blue-900">
            <tr>{['Источник', 'ID', 'Дата', 'Служба', 'Уровень', 'Сообщение'].map((h) => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {logRows.map((row, index) => (
              <tr key={index} className="border-t bg-white">
                {row.map((cell, cellIndex) => <td key={cellIndex} className={cn('px-4 py-2', cellIndex === 1 && 'font-medium text-blue-800')}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between border-t bg-white px-8 py-4 text-slate-500">
        <span>50 строк на странице</span>
        <span>Отображаются строки с 1 по 50 из 762383</span>
      </div>
    </Card>
  );
}

function EquipmentView() {
  const leftOptions = ['Разделы', 'Тома съемных дисков', 'Мониторы', 'Устройства', 'Неуправляемые активы'];
  const rightOptions = ['Тома сетевых дисков', 'Программное обеспечение', 'Принтеры', 'Антивирусы'];

  return (
    <Card className="rounded-md">
      <div className="flex flex-wrap border-b">
        {['Конфигурация', 'Импортировать из файла', 'Все'].map((tab, index) => <button key={tab} className={cn('border-r px-5 py-3 text-lg', index === 0 ? 'font-semibold text-slate-900' : 'text-slate-500')}>{tab}</button>)}
      </div>
      <CardContent className="space-y-5 p-5 text-lg">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 text-xl font-bold">Включить инвентаризацию <CheckSquare className="ml-2 inline h-5 w-5 text-amber-400" /></h3>
            <h4 className="mb-3 bg-slate-50 py-3 text-xl font-bold">Опции импорта</h4>
            {leftOptions.map((item, index) => <OptionRow key={item} label={item} checked={index === 2 || index === 3} />)}
          </div>
          <div className="pt-16">
            {rightOptions.map((item) => <OptionRow key={item} label={item} checked />)}
            <div className="mt-7 grid grid-cols-[1fr_120px] items-center gap-4">
              <span>Частота инвентаризации (в часах)</span>
              <Select defaultValue="24"><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="24">24</SelectItem></SelectContent></Select>
              <span>Импорт монитора при частичном совпадении серийного номера</span>
              <CheckSquare className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        </div>
        <SectionTitle title="Сопутствующие конфигурации" />
        <div className="grid gap-4 text-blue-800 lg:grid-cols-2">
          <span>Правила импорта и подключения оборудования</span>
          <span>Правила назначения объекта к организации</span>
          <span>Типов сетевых портов</span>
        </div>
        <SectionTitle title="Виртуализация" />
        <div className="grid gap-5 lg:grid-cols-2">
          <OptionRow label="Импортировать виртуальные машины" />
          <div className="grid grid-cols-[1fr_170px] items-center gap-4"><span>Типы компьютеров</span><Select defaultValue="blank"><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="blank">-----</SelectItem></SelectContent></Select></div>
          <OptionRow label="Создать компьютер для виртуальных машин" />
          <OptionRow label="Создать компоненты для виртуальных машин" />
        </div>
        <p className="text-center text-lg text-red-600">Попытается создать компонент исходя из информации по ВМ, присланной хостовой машиной. Не используйте его, если планируете непосредственно инвентаризировать каждую ВМ.</p>
        <SectionTitle title="Компоненты" />
        <div className="grid gap-4 lg:grid-cols-2">
          <OptionRow label="Процессоры" checked />
          <OptionRow label="Жесткие диски" checked />
          <OptionRow label="Память" checked />
          <OptionRow label="Сетевые карты" checked />
        </div>
      </CardContent>
    </Card>
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
  const cards = [
    [Bot, '2', 'Количество: Агенты'],
    [ClipboardList, '0', 'Количество: Задачи'],
    [Printer, '0', 'Принтеры inventoried'],
    [Network, '3', 'Сетевые устройства'],
    [Phone, '0', 'Телефоны inventoried'],
    [Laptop, '2', 'Компьютеры inventoried'],
    [CircleAlert, '0', 'Количество: Неуправляемые'],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 rounded-md bg-blue-950 px-8 py-5 text-white">
        {['Панель', 'Основные', 'Задачи', 'Правила', 'Сеть', 'Развёртывание', 'Инструкция'].map((item) => <button key={item} className="flex items-center gap-2 text-lg text-white/80">{item}⌄</button>)}
      </div>
      <Card className="mx-auto min-h-[620px] max-w-[1500px] rounded-md">
        <CardContent className="p-8">
          <div className="mb-24 flex items-center justify-between">
            <Button variant="ghost" className="text-lg">Glpi inventory reports⌄</Button>
            <div className="flex gap-6 text-blue-900"><History /><Copy /><Share2 /><Trash2 /><PenLine /><MaximizeIcon /></div>
          </div>
          <div className="flex flex-wrap gap-4">
            {cards.map(([Icon, value, label], index) => (
              <div key={label} className={cn('h-24 w-40 p-3 text-white', index === cards.length - 1 ? 'bg-orange-400 text-slate-900' : 'bg-slate-500')}>
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{value}</span>
                  <Icon className="h-8 w-8 opacity-80" />
                </div>
                <p className="mt-1 text-base leading-5">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MaximizeIcon() {
  return <span className="text-2xl leading-none">□</span>;
}

function FormsView() {
  return (
    <>
      <SearchBox globalRule={false} />
      <DataTable
        columns={[
          { key: 'name', label: 'Наименование' },
          { key: 'status', label: 'Статус' },
          { key: 'target', label: 'Назначение' },
          { key: 'fields', label: 'Поля' },
          { key: 'owner', label: 'Владелец' },
        ]}
        rows={formRows.map((row) => ({
          name: <span className="font-medium text-blue-800">{row[0]}</span>,
          status: row[1],
          target: row[2],
          fields: row[3],
          owner: row[4],
        }))}
      />
    </>
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

  return (
    <AdminShell section={section} actions={actions}>
      {section === 'users' && <UsersView />}
      {section === 'groups' && <GroupsView />}
      {section === 'organizations' && <OrganizationsView />}
      {section === 'rules' && <RulesView />}
      {section === 'directories' && <DirectoriesView />}
      {section === 'profiles' && <ProfilesView />}
      {section === 'notification-queue' && <NotificationQueueView />}
      {section === 'logs' && <LogsView />}
      {section === 'equipment' && <EquipmentView />}
      {section === 'glpi-inventory' && <GlpiInventoryView />}
      {section === 'forms' && <FormsView />}
    </AdminShell>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import { motion } from 'framer-motion';
import {
  AppWindow,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileDown,
  Key,
  MapPin,
  Monitor,
  Mouse,
  Network,
  Package,
  Pencil,
  Plus,
  Search,
  Server,
  Trash2,
  Wifi,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

const ASSET_TYPES = ['hardware', 'software', 'license', 'network', 'peripheral'] as const;
const ASSET_STATUSES = ['active', 'in_stock', 'maintenance', 'retired', 'disposed'] as const;
const ASSET_SECTION_STORAGE_KEY = 'qazaq_asset_sections';
const SAVED_SEARCH_STORAGE_KEY = 'qazaq_saved_searches';
const NO_LOCATION_VALUE = 'none';

type AssetType = typeof ASSET_TYPES[number];
type AssetStatus = typeof ASSET_STATUSES[number];
type LanguageCode = 'kk' | 'ru' | 'en';

type SavedSearchItem = {
  id: string;
  title: string;
  scope: string;
  query: string;
  filters: string;
  owner: string;
  updatedAt: string;
  resultCount: number;
  targetSection?: string;
  searchText?: string;
  statusFilter?: string;
  specialFilter?: 'network_without_ip';
};

type NormalizedAsset = {
  id: string;
  name: string;
  asset_type: AssetType;
  status: AssetStatus;
  serial_number: string;
  inventory_number: string;
  manufacturer: string;
  model: string;
  location: string;
  assigned_to_name: string;
  department_id: string;
  purchase_date: string;
  warranty_expiry: string;
  purchase_cost: string;
  notes: string;
};

interface AssetForm {
  name: string;
  asset_type: AssetType;
  status: AssetStatus;
  serial_number: string;
  inventory_number: string;
  manufacturer: string;
  model: string;
  location: string;
  department_id: string;
  purchase_date: string;
  warranty_expiry: string;
  purchase_cost: string;
  notes: string;
}

const emptyForm: AssetForm = {
  name: '',
  asset_type: 'hardware',
  status: 'in_stock',
  serial_number: '',
  inventory_number: '',
  manufacturer: '',
  model: '',
  location: '',
  department_id: '',
  purchase_date: '',
  warranty_expiry: '',
  purchase_cost: '',
  notes: '',
};

const typeIcons: Record<AssetType, typeof Monitor> = {
  hardware: Server,
  software: AppWindow,
  license: Key,
  network: Wifi,
  peripheral: Mouse,
};

const typeLabels: Record<AssetType, Record<string, string>> = {
  hardware: { kk: 'Жабдық', ru: 'Оборудование', en: 'Hardware' },
  software: { kk: 'Бағдарлама', ru: 'ПО', en: 'Software' },
  license: { kk: 'Лицензия', ru: 'Лицензия', en: 'License' },
  network: { kk: 'Желі', ru: 'Сеть', en: 'Network' },
  peripheral: { kk: 'Перифери', ru: 'Периферия', en: 'Peripheral' },
};

const statusLabels: Record<AssetStatus, Record<string, string>> = {
  active: { kk: 'Белсенді', ru: 'Активный', en: 'Active' },
  in_stock: { kk: 'Қоймада', ru: 'На складе', en: 'In Stock' },
  maintenance: { kk: 'Жөндеуде', ru: 'На обслуживании', en: 'Maintenance' },
  retired: { kk: 'Шығарылған', ru: 'Списан', en: 'Retired' },
  disposed: { kk: 'Жойылған', ru: 'Утилизирован', en: 'Disposed' },
};

const statusColors: Record<AssetStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300',
  in_stock: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300',
  maintenance: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300',
  retired: 'bg-muted text-muted-foreground border-border',
  disposed: 'bg-destructive/10 text-destructive border-destructive/20',
};

const assetFallbacks = {
  notSpecified: { kk: 'Көрсетілмеген', ru: 'Не указано', en: 'Not specified' },
  notRequired: { kk: 'Қажет емес', ru: 'Не требуется', en: 'Not required' },
  warehouse: { kk: 'Қойма / ID Support', ru: 'Склад / ID Support', en: 'Warehouse / ID Support' },
  responsibleTeam: { kk: 'ID Support', ru: 'ID Support', en: 'ID Support' },
  noNetwork: { kk: 'Желілік IP қажет емес', ru: 'Сетевой IP не требуется', en: 'Network IP not required' },
  osNotRequired: { kk: 'ОЖ қажет емес', ru: 'ОС не требуется', en: 'OS not required' },
} as const;

const sectionConfig: Record<string, { labelKey: string; title: string; type: AssetType | 'all' }> = {
  panel: { labelKey: 'nav.assets.panel', title: 'Панель активов', type: 'all' },
  computers: { labelKey: 'nav.assets.computers', title: 'Компьютеры', type: 'hardware' },
  monitors: { labelKey: 'nav.assets.monitors', title: 'Мониторы', type: 'peripheral' },
  software: { labelKey: 'nav.assets.software', title: 'Программное обеспечение', type: 'software' },
  'network-devices': { labelKey: 'nav.assets.networkDevices', title: 'Сетевые устройства', type: 'network' },
  devices: { labelKey: 'nav.assets.devices', title: 'Устройства', type: 'peripheral' },
  printers: { labelKey: 'nav.assets.printers', title: 'Принтеры', type: 'peripheral' },
  cartridges: { labelKey: 'nav.assets.cartridges', title: 'Картриджи', type: 'peripheral' },
  consumables: { labelKey: 'nav.assets.consumables', title: 'Расходные материалы', type: 'peripheral' },
  phones: { labelKey: 'nav.assets.phones', title: 'Телефоны', type: 'peripheral' },
  racks: { labelKey: 'nav.assets.racks', title: 'Стойки', type: 'hardware' },
  cases: { labelKey: 'nav.assets.cases', title: 'Корпуса', type: 'hardware' },
  'power-distribution': { labelKey: 'nav.assets.powerDistribution', title: 'Распределители питания', type: 'hardware' },
  'passive-devices': { labelKey: 'nav.assets.passiveDevices', title: 'Пассивные устройства', type: 'network' },
  'unmanaged-assets': { labelKey: 'nav.assets.unmanagedAssets', title: 'Неуправляемые активы', type: 'peripheral' },
  cables: { labelKey: 'nav.assets.cables', title: 'Кабели', type: 'peripheral' },
  'sim-cards': { labelKey: 'nav.assets.simCards', title: 'SIM-карта элементы', type: 'peripheral' },
  vpn: { labelKey: 'nav.assets.vpn', title: 'VPN', type: 'license' },
  'report-analytics': { labelKey: 'nav.assets.reportAnalytics', title: 'Аналитика отчетов', type: 'software' },
  global: { labelKey: 'nav.assets.global', title: 'Глобально', type: 'all' },
  projects: { labelKey: 'nav.tools.projects', title: 'Проекты', type: 'software' },
  reminders: { labelKey: 'nav.tools.reminders', title: 'Напоминания', type: 'all' },
  'rss-feed': { labelKey: 'nav.tools.rssFeed', title: 'RSS лента', type: 'software' },
  bookings: { labelKey: 'nav.tools.bookings', title: 'Бронирования', type: 'peripheral' },
  'saved-searches': { labelKey: 'nav.tools.savedSearches', title: 'Сохраненные поисковые запросы', type: 'software' },
  cartography: { labelKey: 'nav.tools.cartography', title: 'Картография', type: 'network' },
  'ip-addressing': { labelKey: 'nav.tools.ipAddressing', title: 'IP Addressing', type: 'network' },
  licenses: { labelKey: 'nav.management.licenses', title: 'Лицензии', type: 'license' },
  budgets: { labelKey: 'nav.management.budgets', title: 'Бюджеты', type: 'software' },
  suppliers: { labelKey: 'nav.management.suppliers', title: 'Поставщики', type: 'software' },
  contacts: { labelKey: 'nav.management.contacts', title: 'Контакты', type: 'software' },
  contracts: { labelKey: 'nav.management.contracts', title: 'Договоры', type: 'software' },
  'phone-lines': { labelKey: 'nav.management.phoneLines', title: 'Телефонные линии', type: 'peripheral' },
  certificates: { labelKey: 'nav.management.certificates', title: 'Сертификаты', type: 'license' },
  'data-centers': { labelKey: 'nav.management.dataCenters', title: 'Дата-центры', type: 'hardware' },
  clusters: { labelKey: 'nav.management.clusters', title: 'Кластеры', type: 'network' },
  domains: { labelKey: 'nav.management.domains', title: 'Домены', type: 'software' },
  complexes: { labelKey: 'nav.management.complexes', title: 'Комплексы', type: 'hardware' },
  databases: { labelKey: 'nav.management.databases', title: 'Базы данных', type: 'software' },
};

const pageSizeOptions = [10, 25, 50, 100];

const defaultSavedSearches: SavedSearchItem[] = [
  {
    id: 'active-network-assets',
    title: 'Активные сетевые устройства',
    scope: 'Активы',
    query: 'тип: сеть, статус: активный',
    filters: 'Сеть / Активный / Data Center',
    owner: 'Камилла Мухитдинова',
    updatedAt: '2026-06-07',
    resultCount: 5,
    targetSection: 'network-devices',
    searchText: '',
    statusFilter: 'active',
  },
  {
    id: 'assets-without-ip',
    title: 'Активы без IP-адреса',
    scope: 'IP Addressing',
    query: 'ip: empty, тип: network',
    filters: 'Network / IP не указан',
    owner: 'Камилла Мухитдинова',
    updatedAt: '2026-06-07',
    resultCount: 3,
    targetSection: 'global',
    searchText: '',
    statusFilter: 'all',
    specialFilter: 'network_without_ip',
  },
  {
    id: 'warehouse-equipment',
    title: 'Оборудование на складе',
    scope: 'Активы',
    query: 'местоположение: склад',
    filters: 'Склад / На складе',
    owner: 'ID Support',
    updatedAt: '2026-06-06',
    resultCount: 12,
    targetSection: 'global',
    searchText: 'Склад',
    statusFilter: 'in_stock',
  },
  {
    id: 'warranty-control',
    title: 'Контроль гарантии',
    scope: 'Напоминания',
    query: 'гарантия <= 60 дней',
    filters: 'Гарантия / Ближайшие 60 дней',
    owner: 'ID Support',
    updatedAt: '2026-06-05',
    resultCount: 4,
    targetSection: 'reminders',
    searchText: '',
    statusFilter: 'all',
  },
];

const defaultLocationOptions = [
  'Astana Office',
  'Data Center A',
  'Data Center B',
  'Cloud',
  'Серверная комната',
  'Склад',
  'Сервисный центр',
  'Офис 102',
  'Офис 205',
  'Приемная',
  'Переговорная',
];

const departmentNameTranslations: Record<string, Record<string, string>> = {
  'it бөлімі': { kk: 'IT бөлімі', ru: 'IT отдел', en: 'IT Department' },
  'it отдел': { kk: 'IT бөлімі', ru: 'IT отдел', en: 'IT Department' },
  'it department': { kk: 'IT бөлімі', ru: 'IT отдел', en: 'IT Department' },
  'hr бөлімі': { kk: 'HR бөлімі', ru: 'HR отдел', en: 'HR Department' },
  'hr отдел': { kk: 'HR бөлімі', ru: 'HR отдел', en: 'HR Department' },
  'hr department': { kk: 'HR бөлімі', ru: 'HR отдел', en: 'HR Department' },
  'қаржы бөлімі': { kk: 'Қаржы бөлімі', ru: 'Финансовый отдел', en: 'Finance Department' },
  'финансовый отдел': { kk: 'Қаржы бөлімі', ru: 'Финансовый отдел', en: 'Finance Department' },
  'finance department': { kk: 'Қаржы бөлімі', ru: 'Финансовый отдел', en: 'Finance Department' },
};

const assetTextTranslations: Record<string, Record<string, string>> = {
  'жұмыс компьютері - it бөлімі': { kk: 'Жұмыс компьютері - IT бөлімі', ru: 'Рабочий компьютер - IT отдел', en: 'Work computer - IT department' },
  'ноутбук агента': { kk: 'Агент ноутбугы', ru: 'Ноутбук агента', en: 'Agent laptop' },
  'резервтік ноутбук': { kk: 'Резервтік ноутбук', ru: 'Резервный ноутбук', en: 'Backup laptop' },
  'принтер hr бөлімі': { kk: 'HR бөлімінің принтері', ru: 'Принтер HR отдела', en: 'HR department printer' },
  'негізгі коммутатор': { kk: 'Негізгі коммутатор', ru: 'Основной коммутатор', en: 'Main switch' },
  'ибп серверлік бөлме': { kk: 'Серверлік бөлме ИБП', ru: 'ИБП серверной комнаты', en: 'Server room UPS' },
  'негізгі сервер': { kk: 'Негізгі сервер', ru: 'Основной сервер', en: 'Main server' },
  'ескірген, пайдаланудан шығарылды': { kk: 'Ескірген, пайдаланудан шығарылды', ru: 'Устарел, выведен из эксплуатации', en: 'Outdated, decommissioned' },
  '50 лицензия, жылдық жазылым': { kk: '50 лицензия, жылдық жазылым', ru: '50 лицензий, годовая подписка', en: '50 licenses, annual subscription' },
  '50 лицензия': { kk: '50 лицензия', ru: '50 лицензий', en: '50 licenses' },
  '5 лицензия, дизайн тобы': { kk: '5 лицензия, дизайн тобы', ru: '5 лицензий, дизайн-группа', en: '5 licenses, design team' },
  '30 лицензиялық кілт': { kk: '30 лицензиялық кілт', ru: '30 лицензионных ключей', en: '30 license keys' },
  'виртуализация серверлік бөлме': { kk: 'Серверлік бөлме виртуализациясы', ru: 'Виртуализация серверной комнаты', en: 'Server room virtualization' },
  'жөндеуде - тонер ауыстыру': { kk: 'Жөндеуде - тонер ауыстыру', ru: 'На ремонте - замена тонера', en: 'Under repair - toner replacement' },
  'hp laserjet pro m404dn үшін қара тонер': { kk: 'HP LaserJet Pro M404dn үшін қара тонер', ru: 'Черный тонер для HP LaserJet Pro M404dn', en: 'Black toner for HP LaserJet Pro M404dn' },
  'жоғары сыйымдылықты қара тонер': { kk: 'Жоғары сыйымдылықты қара тонер', ru: 'Черный тонер повышенной емкости', en: 'High-yield black toner' },
  'brother mfc-l2750dw үшін тонер': { kk: 'Brother MFC-L2750DW үшін тонер', ru: 'Тонер для Brother MFC-L2750DW', en: 'Toner for Brother MFC-L2750DW' },
  'резервтік принтерлерге арналған тонер': { kk: 'Резервтік принтерлерге арналған тонер', ru: 'Тонер для резервных принтеров', en: 'Toner for backup printers' },
  'қабылдау бөлмесі үшін ip телефон': { kk: 'Қабылдау бөлмесі үшін IP телефон', ru: 'IP-телефон для приемной', en: 'IP phone for reception' },
  'байланыс орталығы операторы үшін телефон': { kk: 'Байланыс орталығы операторы үшін телефон', ru: 'Телефон для оператора контакт-центра', en: 'Phone for contact center operator' },
  'келіссөз бөлмесіне арналған конференц-телефон': { kk: 'Келіссөз бөлмесіне арналған конференц-телефон', ru: 'Конференц-телефон для переговорной', en: 'Conference phone for meeting room' },
  'серверлік бөлмедегі негізгі 42u стойка': { kk: 'Серверлік бөлмедегі негізгі 42U стойка', ru: 'Основная стойка 42U в серверной комнате', en: 'Main 42U rack in the server room' },
  'желілік жабдыққа арналған қабырға стойкасы': { kk: 'Желілік жабдыққа арналған қабырға стойкасы', ru: 'Настенная стойка для сетевого оборудования', en: 'Wall rack for network equipment' },
  'резервтік жабдыққа арналған стойка': { kk: 'Резервтік жабдыққа арналған стойка', ru: 'Стойка для резервного оборудования', en: 'Rack for backup equipment' },
  'қоймадағы сканерлеу құрылғысы': { kk: 'Қоймадағы сканерлеу құрылғысы', ru: 'Сканирующее устройство для склада', en: 'Warehouse scanning device' },
  'мобильді тексеріс планшеті': { kk: 'Мобильді тексеріс планшеті', ru: 'Планшет для мобильных проверок', en: 'Tablet for mobile inspections' },
  'қызметкерлер бейдждерін оқу құрылғысы': { kk: 'Қызметкерлер бейдждерін оқу құрылғысы', ru: 'Считыватель бейджей сотрудников', en: 'Employee badge reader' },
  'принтерлерге арналған a4 қағазы': { kk: 'Принтерлерге арналған A4 қағазы', ru: 'Бумага A4 для принтеров', en: 'A4 paper for printers' },
  'жабдықтарды тазалауға арналған майлықтар': { kk: 'Жабдықтарды тазалауға арналған майлықтар', ru: 'Салфетки для очистки оборудования', en: 'Equipment cleaning wipes' },
  'пернетақта мен тышқанға арналған батареялар': { kk: 'Пернетақта мен тышқанға арналған батареялар', ru: 'Батарейки для клавиатур и мышей', en: 'Batteries for keyboards and mice' },
  'жаңа жұмыс станциясын жинауға арналған корпус': { kk: 'Жаңа жұмыс станциясын жинауға арналған корпус', ru: 'Корпус для сборки новой рабочей станции', en: 'Case for a new workstation build' },
  'серверлік жабдыққа арналған корпус': { kk: 'Серверлік жабдыққа арналған корпус', ru: 'Корпус для серверного оборудования', en: 'Case for server equipment' },
  'кеңсе стойкасына арналған pdu': { kk: 'Кеңсе стойкасына арналған PDU', ru: 'PDU для офисной стойки', en: 'PDU for office rack' },
  'серверлік стойка үшін бақыланатын pdu': { kk: 'Серверлік стойка үшін бақыланатын PDU', ru: 'Управляемый PDU для серверной стойки', en: 'Managed PDU for server rack' },
  'коммутациялық панель': { kk: 'Коммутациялық панель', ru: 'Коммутационная панель', en: 'Patch panel' },
  'желі розеткаларына арналған keystone модульдері': { kk: 'Желі розеткаларына арналған Keystone модульдері', ru: 'Keystone-модули для сетевых розеток', en: 'Keystone modules for network outlets' },
  'уақытша жобаға берілген проектор': { kk: 'Уақытша жобаға берілген проектор', ru: 'Проектор для временного проекта', en: 'Projector for a temporary project' },
  'есепке алынбаған демонстрациялық экран': { kk: 'Есепке алынбаған демонстрациялық экран', ru: 'Неучтенный демонстрационный экран', en: 'Unmanaged demo display' },
  'cat6 патч-кордтар жинағы': { kk: 'Cat6 патч-кордтар жинағы', ru: 'Набор патч-кордов Cat6', en: 'Cat6 patch cable set' },
  'келіссөз бөлмесіне арналған hdmi кабельдер': { kk: 'Келіссөз бөлмесіне арналған HDMI кабельдер', ru: 'HDMI-кабели для переговорной', en: 'HDMI cables for meeting room' },
  'резервтік корпоративтік sim-карта': { kk: 'Резервтік корпоративтік SIM-карта', ru: 'Резервная корпоративная SIM-карта', en: 'Backup corporate SIM card' },
  'iot модеміне арналған sim-карта': { kk: 'IoT модеміне арналған SIM-карта', ru: 'SIM-карта для IoT-модема', en: 'SIM card for IoT modem' },
  'қашықтағы қызметкерлерге арналған vpn лицензиялары': { kk: 'Қашықтағы қызметкерлерге арналған VPN лицензиялары', ru: 'VPN-лицензии для удаленных сотрудников', en: 'VPN licenses for remote employees' },
  'аппараттық vpn токендері': { kk: 'Аппараттық VPN токендері', ru: 'Аппаратные VPN-токены', en: 'Hardware VPN tokens' },
  'itsm өнімділігі бойынша power bi есебі': { kk: 'ITSM өнімділігі бойынша Power BI есебі', ru: 'Power BI отчет по эффективности ITSM', en: 'Power BI report for ITSM performance' },
  'инфрақұрылым мониторингіне арналған dashboard': { kk: 'Инфрақұрылым мониторингіне арналған dashboard', ru: 'Dashboard для мониторинга инфраструктуры', en: 'Dashboard for infrastructure monitoring' },
  'қойма': { kk: 'Қойма', ru: 'Склад', en: 'Warehouse' },
  'серверлік бөлме': { kk: 'Серверлік бөлме', ru: 'Серверная комната', en: 'Server room' },
  'сервис орталығы': { kk: 'Сервис орталығы', ru: 'Сервисный центр', en: 'Service center' },
};

function normalizeAsset(asset: any): NormalizedAsset {
  return {
    id: asset.id,
    name: asset.name || '',
    asset_type: asset.asset_type || asset.assetType || 'hardware',
    status: asset.status || 'in_stock',
    serial_number: asset.serial_number || asset.serialNumber || '',
    inventory_number: asset.inventory_number || asset.inventoryNumber || '',
    manufacturer: asset.manufacturer || '',
    model: asset.model || '',
    location: asset.location || '',
    assigned_to_name: asset.assigned_to_name || asset.assignedToName || '',
    department_id: asset.department_id || asset.departmentId || '',
    purchase_date: asset.purchase_date || asset.purchaseDate || '',
    warranty_expiry: asset.warranty_expiry || asset.warrantyExpiry || '',
    purchase_cost: asset.purchase_cost?.toString() || asset.purchaseCost?.toString() || '',
    notes: asset.notes || '',
  };
}

function getAssetIp(asset: NormalizedAsset) {
  const candidates = [asset.location, asset.notes, asset.name].join(' ');
  return candidates.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)?.join('\n') || '-';
}

function getAssetDisplayName(asset: NormalizedAsset, language: string) {
  return asset.name || assetFallbacks.notSpecified[language as LanguageCode];
}

function getAssetSerial(asset: NormalizedAsset, language: string) {
  return asset.serial_number || asset.inventory_number || assetFallbacks.notSpecified[language as LanguageCode];
}

function getAssetInventory(asset: NormalizedAsset, language: string) {
  return asset.inventory_number || asset.serial_number || assetFallbacks.notSpecified[language as LanguageCode];
}

function getAssetNetwork(asset: NormalizedAsset, language: string) {
  const ip = getAssetIp(asset);
  if (ip !== '-') return ip;
  return asset.asset_type === 'network' || asset.asset_type === 'hardware'
    ? assetFallbacks.notSpecified[language as LanguageCode]
    : assetFallbacks.noNetwork[language as LanguageCode];
}

function getAssetAddressingValue(asset: NormalizedAsset, language: string) {
  const ip = getAssetIp(asset);
  if (ip !== '-') return ip;

  const text = [
    asset.name,
    asset.manufacturer,
    asset.model,
    asset.inventory_number,
    asset.serial_number,
    asset.location,
    asset.notes,
  ].join(' ').toLowerCase();

  if (text.includes('domain') || text.includes('dns') || text.includes('домен')) return '10.10.0.10\n10.10.0.11';
  if (text.includes('postgres')) return '10.10.20.31\n10.10.20.32';
  if (text.includes('vmware') || text.includes('cluster')) return '10.10.10.21\n10.10.10.22';
  if (text.includes('patch panel') || text.includes('keystone')) return '10.10.30.0/24';
  if (text.includes('catalyst') || text.includes('switch') || text.includes('коммутатор')) return '10.10.1.2';
  if (text.includes('router') || text.includes('gateway') || text.includes('шлюз')) return '10.10.1.1';
  if (asset.asset_type === 'network') return '10.10.0.0/24';

  return assetFallbacks.notSpecified[language as LanguageCode];
}

function getAssetModel(asset: NormalizedAsset, language: string) {
  return [asset.manufacturer, asset.model].filter(Boolean).join(' ')
    || asset.model
    || asset.manufacturer
    || asset.name
    || assetFallbacks.notSpecified[language as LanguageCode];
}

function getAssetUser(asset: NormalizedAsset, language: string) {
  if (asset.assigned_to_name) return asset.assigned_to_name;
  if (asset.location) return getLocalizedAssetText(asset.location, language);
  if (asset.status === 'in_stock') return assetFallbacks.warehouse[language as LanguageCode];
  return assetFallbacks.responsibleTeam[language as LanguageCode];
}

function getAssetComments(asset: NormalizedAsset, language: string) {
  if (asset.notes) return getLocalizedAssetText(asset.notes, language);
  if (asset.location) return getLocalizedAssetText(asset.location, language);
  return assetFallbacks.notSpecified[language as LanguageCode];
}

function getAssetOperatingSystem(asset: NormalizedAsset, language: string) {
  if (asset.asset_type === 'hardware') return 'Linux / Windows';
  if (asset.asset_type === 'software') return statusLabels[asset.status][language];
  return assetFallbacks.osNotRequired[language as LanguageCode];
}

function getDepartmentName(name: string, language: string) {
  const normalizedName = name.trim().toLowerCase();
  return departmentNameTranslations[normalizedName]?.[language] || name;
}

function getLocalizedAssetText(value: string, language: string) {
  const normalizedValue = value.trim().toLowerCase();
  return assetTextTranslations[normalizedValue]?.[language] || value;
}

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function matchesAssetKeywords(asset: NormalizedAsset, keywords: string[]) {
  const text = [
    asset.name,
    asset.manufacturer,
    asset.model,
    asset.inventory_number,
    asset.serial_number,
    asset.notes,
  ].join(' ').toLowerCase();

  return includesAny(text, keywords);
}

function matchesNetworkAddressing(asset: NormalizedAsset) {
  const text = [
    asset.name,
    asset.manufacturer,
    asset.model,
    asset.inventory_number,
    asset.serial_number,
    asset.location,
    asset.notes,
  ].join(' ').toLowerCase();

  if (getAssetIp(asset) !== '-') return true;
  if (asset.asset_type === 'network') return true;
  if (asset.asset_type === 'software' && /\b(dns|dhcp|domain|домен)\b/.test(text)) return true;

  return /\b(router|switch|gateway|firewall|subnet|vlan|dns|dhcp)\b/.test(text)
    || /\b(маршрутизатор|коммутатор|шлюз|подсеть|домен)\b/.test(text);
}

function getStoredAssetSections() {
  try {
    return JSON.parse(localStorage.getItem(ASSET_SECTION_STORAGE_KEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function getStoredSavedSearches() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAVED_SEARCH_STORAGE_KEY) || 'null') as SavedSearchItem[] | null;
    const items = stored || defaultSavedSearches;
    return items.map(normalizeSavedSearchItem);
  } catch {
    return defaultSavedSearches;
  }
}

function normalizeSavedSearchItem(item: SavedSearchItem): SavedSearchItem {
  const query = item.query.toLowerCase();
  const isNetworkWithoutIp = item.id === 'assets-without-ip'
    || (query.includes('ip: empty') && (query.includes('тип: network') || query.includes('тип: сеть') || query.includes('type: network')));

  if (!isNetworkWithoutIp) return item;

  return {
    ...item,
    targetSection: 'global',
    searchText: '',
    statusFilter: item.statusFilter || 'all',
    specialFilter: 'network_without_ip',
  };
}

function matchesAssetSection(
  asset: NormalizedAsset,
  section: string,
  currentSection: { type: AssetType | 'all' },
  assetSections: Record<string, string>,
) {
  if (section === 'panel' || section === 'global') return true;

  const savedSection = assetSections[asset.id];
  if (savedSection) return savedSection === section;

  switch (section) {
    case 'computers':
      return matchesAssetKeywords(asset, ['optiplex', 'probook', 'thinkpad', 'elitedesk', 'computer', 'компьютер', 'ноутбук']);
    case 'monitors':
      return matchesAssetKeywords(asset, ['monitor', 'монитор', 'display', 's27a']);
    case 'printers':
      return matchesAssetKeywords(asset, ['printer', 'принтер', 'laserjet', 'mfc-l2750dw', 'brother mfc']);
    case 'cartridges':
      return matchesAssetKeywords(asset, ['cartridge', 'картридж', 'toner', 'тонер', 'cf259', 'tn-2420', 'crg057']);
    case 'phones':
      return matchesAssetKeywords(asset, ['phone', 'телефон', 'yealink', 'cisco ip', 'polycom', 'conference']);
    case 'racks':
      return matchesAssetKeywords(asset, ['rack', 'стойка', 'шкаф', '42u', '12u', 'apc netshelter', 'wall mount']);
    case 'cables':
      return matchesAssetKeywords(asset, ['cable', 'кабель', 'кабели', 'кабельдер']);
    case 'network-devices':
      return matchesAssetKeywords(asset, ['switch', 'router', 'cisco catalyst', 'catalyst', 'коммутатор']);
    case 'devices':
      return matchesAssetKeywords(asset, ['scanner', 'tablet', 'reader', 'сканер', 'планшет', 'badge']);
    case 'consumables':
      return matchesAssetKeywords(asset, ['paper', 'wipe', 'battery', 'бумага', 'салфетки', 'batteries', 'a4']);
    case 'cases':
      return matchesAssetKeywords(asset, ['case', 'корпус', 'tower', 'chassis', 'cse-825']);
    case 'power-distribution':
      return matchesAssetKeywords(asset, ['pdu', 'power distribution', 'распределитель', 'ap7553', 'ap8853']);
    case 'passive-devices':
      return matchesAssetKeywords(asset, ['patch panel', 'keystone', 'патч-панель', 'коммутационная панель', 'module']);
    case 'unmanaged-assets':
      return matchesAssetKeywords(asset, ['unmanaged', 'demo', 'projector', 'демо', 'проектор', 'неучтенный']);
    case 'sim-cards':
      return matchesAssetKeywords(asset, ['sim', 'сим', 'iot']);
    case 'vpn':
      return matchesAssetKeywords(asset, ['vpn', 'fortinet', 'token', 'yubikey']);
    case 'report-analytics':
      return matchesAssetKeywords(asset, ['power bi', 'grafana', 'dashboard', 'analytics', 'report', 'отчет']);
    case 'projects':
      return matchesAssetKeywords(asset, ['project', 'проект', 'complex', 'комплекс', 'projector', 'проектор']);
    case 'reminders':
      return asset.status === 'maintenance' || Boolean(asset.warranty_expiry) || matchesAssetKeywords(asset, ['maintenance', 'ремонт', 'жөндеуде', 'renewal', 'обновление']);
    case 'rss-feed':
      return matchesAssetKeywords(asset, ['rss', 'feed', 'news', 'новости', 'dashboard', 'monitoring', 'мониторинг', 'grafana']);
    case 'bookings':
      return matchesAssetKeywords(asset, ['booking', 'брон', 'meeting', 'переговор', 'conference', 'конференц', 'projector', 'проектор']);
    case 'saved-searches':
      return false;
    case 'cartography':
      return matchesAssetKeywords(asset, ['switch', 'router', 'cisco catalyst', 'catalyst', 'коммутатор', 'map', 'карта', 'topology', 'топология', 'gis']);
    case 'ip-addressing':
      return matchesNetworkAddressing(asset);
    case 'licenses':
      return matchesAssetKeywords(asset, ['license', 'лиценз', 'microsoft 365', 'adobe', 'forticlient', 'vpn', 'ssl']);
    case 'budgets':
      return matchesAssetKeywords(asset, ['budget', 'бюджет', 'opex', 'capex', 'финанс', 'cost center']);
    case 'suppliers':
      return matchesAssetKeywords(asset, ['supplier', 'поставщик', 'vendor', 'kaspi office', 'techno', 'softline']);
    case 'contacts':
      return matchesAssetKeywords(asset, ['contact', 'контакт', 'account manager', 'support contact', 'ответственный']);
    case 'contracts':
      return matchesAssetKeywords(asset, ['contract', 'договор', 'agreement', 'service agreement', 'sla contract']);
    case 'phone-lines':
      return matchesAssetKeywords(asset, ['phone line', 'телефонная линия', 'sip trunk', 'pbx', 'ats', 'АТС'.toLowerCase()]);
    case 'certificates':
      return matchesAssetKeywords(asset, ['certificate', 'сертификат', 'ssl', 'tls', 'wildcard']);
    case 'data-centers':
      return matchesAssetKeywords(asset, ['data center', 'дата-центр', 'dc-', 'colocation', 'серверная площадка']);
    case 'clusters':
      return matchesAssetKeywords(asset, ['cluster', 'кластер', 'kubernetes', 'postgres ha', 'vmware cluster']);
    case 'domains':
      return matchesAssetKeywords(asset, ['domain', 'домен', 'dns', '.kz', '.local']);
    case 'complexes':
      return matchesAssetKeywords(asset, ['complex', 'комплекс', 'инфраструктурный комплекс', 'itsm complex']);
    case 'databases':
      return matchesAssetKeywords(asset, ['database', 'база данных', 'postgres', 'mysql', 'oracle', 'backup db']);
    default:
      return asset.asset_type === currentSection.type;
  }
}

function SavedSearchesPanel({
  canManage,
  items,
  onApply,
  onDelete,
}: {
  canManage: boolean;
  items: SavedSearchItem[];
  onApply: (item: SavedSearchItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[980px]">
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[240px] uppercase text-[11px]">Название запроса</TableHead>
            <TableHead className="w-[150px] uppercase text-[11px]">Раздел</TableHead>
            <TableHead className="w-[220px] uppercase text-[11px]">Запрос</TableHead>
            <TableHead className="w-[230px] uppercase text-[11px]">Фильтры</TableHead>
            <TableHead className="w-[170px] uppercase text-[11px]">Автор</TableHead>
            <TableHead className="w-[120px] uppercase text-[11px]">Обновлено</TableHead>
            <TableHead className="w-[110px] uppercase text-[11px]">Результаты</TableHead>
            <TableHead className="w-[150px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-40 text-center">
                <Search className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">Сохранённые поисковые запросы не найдены</p>
              </TableCell>
            </TableRow>
          ) : items.map((item, index) => (
            <TableRow key={item.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/35'}>
              <TableCell className="align-top font-medium text-primary">{item.title}</TableCell>
              <TableCell className="align-top">
                <Badge variant="outline">{item.scope}</Badge>
              </TableCell>
              <TableCell className="align-top text-muted-foreground">{item.query}</TableCell>
              <TableCell className="align-top text-muted-foreground">{item.filters}</TableCell>
              <TableCell className="align-top text-primary">{item.owner}</TableCell>
              <TableCell className="align-top text-muted-foreground">{item.updatedAt}</TableCell>
              <TableCell className="align-top">
                <Badge className="bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300" variant="outline">
                  {item.resultCount}
                </Badge>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onApply(item)}>
                    Открыть
                  </Button>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function getCartographyNodePosition(asset: NormalizedAsset, index: number) {
  const location = [asset.location, asset.assigned_to_name, asset.notes].join(' ').toLowerCase();
  if (location.includes('cloud') || asset.name.toLowerCase().includes('dns') || asset.name.toLowerCase().includes('domain')) {
    return { x: 50, y: 27 };
  }
  if (location.includes('сервер') || location.includes('server')) {
    return { x: 70, y: 68 };
  }
  if (location.includes('склад') || location.includes('warehouse')) {
    return { x: 27, y: 68 };
  }
  if (location.includes('data center b')) {
    return { x: 76, y: 36 };
  }
  if (location.includes('data center') || location.includes('dc')) {
    return { x: 24, y: 36 };
  }

  const fallbackPositions = [
    { x: 24, y: 36 },
    { x: 50, y: 27 },
    { x: 76, y: 36 },
    { x: 27, y: 68 },
    { x: 70, y: 68 },
    { x: 50, y: 68 },
  ];
  return fallbackPositions[index % fallbackPositions.length];
}

function getCartographyZoneTone(asset: NormalizedAsset) {
  const location = [asset.location, asset.assigned_to_name, asset.notes, asset.name].join(' ').toLowerCase();
  if (location.includes('cloud') || location.includes('dns') || location.includes('domain')) {
    return {
      icon: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
      line: 'stroke-violet-500/45',
      ring: 'border-violet-300/70 shadow-violet-200/50',
    };
  }
  if (location.includes('сервер') || location.includes('server')) {
    return {
      icon: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      line: 'stroke-blue-500/45',
      ring: 'border-blue-300/70 shadow-blue-200/50',
    };
  }
  if (location.includes('склад') || location.includes('warehouse')) {
    return {
      icon: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
      line: 'stroke-amber-500/45',
      ring: 'border-amber-300/70 shadow-amber-200/50',
    };
  }
  if (location.includes('data center b')) {
    return {
      icon: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      line: 'stroke-emerald-500/45',
      ring: 'border-emerald-300/70 shadow-emerald-200/50',
    };
  }
  return {
    icon: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    line: 'stroke-sky-500/45',
    ring: 'border-sky-300/70 shadow-sky-200/50',
  };
}

function CartographyMap({
  assets,
  canManage,
  isLoading,
  language,
  onDelete,
  onEdit,
  t,
}: {
  assets: NormalizedAsset[];
  canManage: boolean;
  isLoading: boolean;
  language: LanguageCode;
  onDelete: (id: string) => void;
  onEdit: (asset: NormalizedAsset) => void;
  t: (key: string) => string;
}) {
  const mapAssets = assets.slice(0, 10);
  const hub = { x: 50, y: 48 };
  const activeCount = mapAssets.filter((asset) => asset.status === 'active').length;
  const locationCount = new Set(mapAssets.map((asset) => asset.location || getAssetUser(asset, language))).size;

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground">{t('common.loading')}</div>;
  }

  if (mapAssets.length === 0) {
    return (
      <div className="p-12 text-center">
        <MapPin className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
        <p className="text-muted-foreground">{t('assets.noAssets')}</p>
      </div>
    );
  }

  const nodes = mapAssets.map((asset, index) => ({
    asset,
    position: getCartographyNodePosition(asset, index),
  }));

  return (
    <div className="p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
          <div className="flex flex-col gap-3 border-b bg-muted/25 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                <Network className="h-4 w-4 text-primary" />
                Network topology
              </div>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Интерактивная карта инфраструктуры</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border bg-background px-3 py-2">
                <p className="text-lg font-semibold text-primary">{mapAssets.length}</p>
                <p className="text-[11px] text-muted-foreground">узлов</p>
              </div>
              <div className="rounded-md border bg-background px-3 py-2">
                <p className="text-lg font-semibold text-emerald-600">{activeCount}</p>
                <p className="text-[11px] text-muted-foreground">активно</p>
              </div>
              <div className="rounded-md border bg-background px-3 py-2">
                <p className="text-lg font-semibold text-sky-600">{locationCount}</p>
                <p className="text-[11px] text-muted-foreground">зон</p>
              </div>
            </div>
          </div>

          <div className="relative min-h-[610px] overflow-hidden bg-[linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)))]">
            <div className="absolute inset-6 rounded-xl border bg-background/75 shadow-inner" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <pattern id="cartography-grid" width="4" height="4" patternUnits="userSpaceOnUse">
                  <path d="M 4 0 L 0 0 0 4" className="stroke-muted-foreground/20" strokeWidth="0.13" fill="none" />
                </pattern>
                <filter id="cartography-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="0.9" floodOpacity="0.12" />
                </filter>
              </defs>
              <rect x="3" y="5" width="94" height="90" rx="2.5" fill="url(#cartography-grid)" opacity="0.85" />
              <path d="M18 50 L82 50" className="stroke-primary/45" strokeWidth="0.64" strokeLinecap="round" />
              <path d="M50 24 L50 76" className="stroke-primary/25" strokeWidth="0.54" strokeLinecap="round" />
              <g filter="url(#cartography-shadow)">
                <rect x="8" y="17" width="28" height="26" rx="2.6" className="fill-sky-500/10 stroke-sky-500/35" strokeWidth="0.35" />
                <rect x="37" y="17" width="26" height="22" rx="2.6" className="fill-violet-500/10 stroke-violet-500/35" strokeWidth="0.35" />
                <rect x="66" y="17" width="26" height="26" rx="2.6" className="fill-emerald-500/10 stroke-emerald-500/35" strokeWidth="0.35" />
                <rect x="12" y="62" width="30" height="24" rx="2.6" className="fill-amber-500/10 stroke-amber-500/35" strokeWidth="0.35" />
                <rect x="58" y="62" width="34" height="24" rx="2.6" className="fill-blue-500/10 stroke-blue-500/35" strokeWidth="0.35" />
              </g>
              {nodes.map(({ asset, position }) => {
                const tone = getCartographyZoneTone(asset);
                return (
                  <line
                    key={asset.id}
                    x1={hub.x}
                    y1={hub.y}
                    x2={position.x}
                    y2={position.y}
                    className={tone.line}
                    strokeWidth="0.32"
                    strokeDasharray="1.7 1.1"
                  />
                );
              })}
              <ellipse cx={hub.x} cy={hub.y + 4.8} rx="7.5" ry="1.3" className="fill-primary/15" />
            </svg>

            <div className="absolute left-[11%] top-[18%] rounded-md border bg-background/85 px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm dark:text-sky-300">Data Center A</div>
            <div className="absolute left-[39%] top-[18%] rounded-md border bg-background/85 px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm dark:text-violet-300">Cloud</div>
            <div className="absolute left-[69%] top-[18%] rounded-md border bg-background/85 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm dark:text-emerald-300">Data Center B</div>
            <div className="absolute left-[15%] top-[64%] rounded-md border bg-background/85 px-3 py-1 text-xs font-semibold text-amber-700 shadow-sm dark:text-amber-300">Склад</div>
            <div className="absolute left-[61%] top-[64%] rounded-md border bg-background/85 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm dark:text-blue-300">Серверная комната</div>

            <div
              className="absolute flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-primary bg-background shadow-xl"
              style={{ left: `${hub.x}%`, top: `${hub.y}%` }}
            >
              <span className="absolute inset-[-9px] rounded-full border border-primary/20" />
              <span className="absolute inset-[8px] rounded-full bg-primary/5" />
              <Network className="relative h-7 w-7 text-primary" />
              <span className="relative mt-1 text-[11px] font-bold text-primary">Core</span>
            </div>

            {nodes.map(({ asset, position }) => {
              const Icon = typeIcons[asset.asset_type] || Server;
              const tone = getCartographyZoneTone(asset);
              return (
                <div
                  key={asset.id}
                  className={`absolute w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur transition hover:border-primary/40 hover:shadow-xl ${tone.ring}`}
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone.icon}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-primary">{getAssetDisplayName(asset, language)}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{getAssetModel(asset, language)}</p>
                      <p className="truncate text-xs text-muted-foreground">{getAssetUser(asset, language)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
                    <Badge className={statusColors[asset.status]} variant="outline">
                      {statusLabels[asset.status][language]}
                    </Badge>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(asset)} aria-label={t('common.edit')}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(asset.id)} aria-label={t('common.delete')}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
          <div className="border-b bg-muted/25 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Узлы карты</h2>
              </div>
              <Badge variant="outline">{nodes.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Список объектов, отображенных на топологии</p>
          </div>
          <div className="max-h-[640px] space-y-2 overflow-y-auto p-3">
            {nodes.map(({ asset }) => {
              const tone = getCartographyZoneTone(asset);
              const Icon = typeIcons[asset.asset_type] || Server;
              return (
                <div key={asset.id} className="rounded-lg border bg-muted/15 p-3 transition hover:bg-muted/30">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${tone.icon}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-primary">{getAssetDisplayName(asset, language)}</p>
                        <Badge className={statusColors[asset.status]} variant="outline">
                          {statusLabels[asset.status][language]}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{getAssetComments(asset, language)}</p>
                    </div>
                </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span className="truncate rounded-md bg-background px-2 py-1">{getAssetNetwork(asset, language)}</span>
                    <span className="truncate rounded-md bg-background px-2 py-1 text-right">{getAssetUser(asset, language)}</span>
                  </div>
                {canManage && (
                    <div className="mt-3 flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 flex-1" onClick={() => onEdit(asset)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        {t('common.edit')}
                    </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(asset.id)} aria-label={t('common.delete')}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AssetManagement() {
  const { language, t } = useLanguage();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section') || 'computers';
  const currentSection = sectionConfig[section] || sectionConfig.panel;
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [specialFilter, setSpecialFilter] = useState<SavedSearchItem['specialFilter']>();
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [assetSections, setAssetSections] = useState<Record<string, string>>(getStoredAssetSections);
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>(getStoredSavedSearches);

  const canManage = role === 'admin' || role === 'manager';
  const isSavedSearchesSection = section === 'saved-searches';

  const { data: rawAssets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const result = await api.getAssets({ limit: '100' });
      return result.data || [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.getDepartments(),
  });

  const assets = useMemo(() => rawAssets.map(normalizeAsset), [rawAssets]);
  const locationOptions = useMemo(() => {
    const existingLocations = assets
      .map((asset) => asset.location.trim())
      .filter(Boolean);
    return [...new Set([...defaultLocationOptions, ...existingLocations])];
  }, [assets]);

  const saveMutation = useMutation({
    mutationFn: async (formData: AssetForm) => {
      if (editingId) {
        return api.updateAsset(editingId, formData);
      } else {
        return api.createAsset(formData);
      }
    },
    onSuccess: (savedAsset: any) => {
      queryClient.setQueryData<any[]>(['assets'], (current = []) => {
        if (!savedAsset?.id) return current;
        const withoutSaved = current.filter((asset) => asset.id !== savedAsset.id);
        return [savedAsset, ...withoutSaved];
      });

      if (!editingId && savedAsset?.id && currentSection.type !== 'all') {
        setAssetSections((current) => {
          const next = { ...current, [savedAsset.id]: section };
          localStorage.setItem(ASSET_SECTION_STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      }

      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? t('assets.assetUpdated') : t('assets.assetCreated') });
    },
    onError: (err: any) => toast({ title: t('common.error'), description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAsset(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<any[]>(['assets'], (current = []) => (
        current.filter((asset) => asset.id !== deletedId)
      ));
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setSelectedIds([]);
      toast({ title: t('assets.assetDeleted') });
    },
  });

  const visibleAssets = useMemo(() => {
    return assets.filter((asset) => {
      const sectionMatches = matchesAssetSection(asset, section, currentSection, assetSections);
      const query = search.toLowerCase().trim();
      const searchMatches = !query || [
        asset.name,
        asset.serial_number,
        asset.inventory_number,
        asset.manufacturer,
        asset.model,
        asset.location,
        asset.assigned_to_name,
        asset.notes,
      ].some((value) => value.toLowerCase().includes(query));
      const statusMatches = filterStatus === 'all' || asset.status === filterStatus;
      const specialMatches = !specialFilter
        || (specialFilter === 'network_without_ip' && asset.asset_type === 'network' && getAssetIp(asset) === '-');
      return sectionMatches && searchMatches && statusMatches && specialMatches;
    });
  }, [assetSections, assets, currentSection, filterStatus, search, section, specialFilter]);

  const visibleSavedSearches = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return savedSearches;

    return savedSearches.filter((item) => [
      item.title,
      item.scope,
      item.query,
      item.filters,
      item.owner,
    ].some((value) => value.toLowerCase().includes(query)));
  }, [savedSearches, search]);

  const totalPages = Math.max(1, Math.ceil(visibleAssets.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedAssets = visibleAssets.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedOnPage = paginatedAssets.length > 0 && paginatedAssets.every((asset) => selectedIds.includes(asset.id));
  const selectedRows = visibleAssets.filter((asset) => selectedIds.includes(asset.id));
  const selectedVisibleIds = selectedRows.map((asset) => asset.id);

  useEffect(() => {
    setSelectedIds([]);
  }, [filterStatus, search, section, specialFilter]);

  const openEdit = (asset: NormalizedAsset) => {
    setEditingId(asset.id);
    setForm({
      name: asset.name,
      asset_type: asset.asset_type,
      status: asset.status,
      serial_number: asset.serial_number,
      inventory_number: asset.inventory_number,
      manufacturer: asset.manufacturer,
      model: asset.model,
      location: asset.location,
      department_id: asset.department_id,
      purchase_date: asset.purchase_date,
      warranty_expiry: asset.warranty_expiry,
      purchase_cost: asset.purchase_cost,
      notes: asset.notes,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    if (isSavedSearchesSection) {
      const nextSearch: SavedSearchItem = {
        id: `saved-${Date.now()}`,
        title: search.trim() ? `Поиск: ${search.trim()}` : 'Новый сохранённый поиск',
        scope: 'Активы',
        query: search.trim() || 'статус: активный',
        filters: filterStatus === 'all' ? 'Все статусы' : `Статус: ${filterStatus}`,
        owner: 'Камилла Мухитдинова',
        updatedAt: format(new Date(), 'yyyy-MM-dd'),
        resultCount: visibleAssets.length,
        targetSection: section === 'saved-searches' ? 'global' : section,
        searchText: search.trim(),
        statusFilter: filterStatus,
        specialFilter,
      };

      setSavedSearches((current) => {
        const next = [nextSearch, ...current];
        localStorage.setItem(SAVED_SEARCH_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      toast({ title: 'Поиск сохранён' });
      return;
    }

    setEditingId(null);
    setForm({
      ...emptyForm,
      asset_type: currentSection.type === 'all' ? 'hardware' : currentSection.type,
    });
    setDialogOpen(true);
  };

  const deleteSavedSearch = (id: string) => {
    setSavedSearches((current) => {
      const next = current.filter((item) => item.id !== id);
      localStorage.setItem(SAVED_SEARCH_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    toast({ title: 'Сохранённый поиск удалён' });
  };

  const applySavedSearch = (item: SavedSearchItem) => {
    const fallbackSectionByScope: Record<string, string> = {
      Активы: 'global',
      'IP Addressing': 'ip-addressing',
      Напоминания: 'reminders',
    };
    const targetSection = item.targetSection || fallbackSectionByScope[item.scope] || 'global';
    const normalizedItem = normalizeSavedSearchItem(item);
    const nextSearch = normalizedItem.searchText ?? normalizedItem.query;
    const nextStatus = item.statusFilter || 'all';

    setSearch(nextSearch);
    setFilterStatus(nextStatus);
    setSpecialFilter(normalizedItem.specialFilter);
    setPage(1);
    setSearchParams({ section: normalizedItem.targetSection || targetSection });
    toast({ title: 'Открыт сохранённый поиск', description: item.title });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const togglePageSelected = () => {
    const pageIds = paginatedAssets.map((asset) => asset.id);
    setSelectedIds((current) => {
      if (selectedOnPage) return current.filter((id) => !pageIds.includes(id));
      return [...new Set([...current, ...pageIds])];
    });
  };

  const exportData = async () => {
    const headers = [
      t('common.name'),
      t('assets.organization'),
      t('assets.serialNumber'),
      t('assets.inventoryNumber'),
      t('assets.type'),
      t('assets.networkIp'),
      t('assets.model'),
      t('assets.user'),
      t('assets.comments'),
      t('assets.operatingSystem'),
    ];
    const rows = (selectedRows.length > 0 ? selectedRows : visibleAssets).map((asset) => [
      getAssetDisplayName(asset, language),
      'Qazaq Generation / ID Support',
      getAssetSerial(asset, language),
      getAssetInventory(asset, language),
      typeLabels[asset.asset_type]?.[language] || asset.asset_type,
      section === 'ip-addressing' ? getAssetAddressingValue(asset, language) : getAssetNetwork(asset, language),
      getAssetModel(asset, language),
      getAssetUser(asset, language),
      getAssetComments(asset, language),
      getAssetOperatingSystem(asset, language),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Qazaq Generation';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(t(currentSection.labelKey) || currentSection.title, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    worksheet.addRow(headers);
    rows.forEach((row) => worksheet.addRow(row));

    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(rows.length + 1, 1), column: headers.length },
    };

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB7C9D6' } },
        left: { style: 'thin', color: { argb: 'FFB7C9D6' } },
        bottom: { style: 'thin', color: { argb: 'FFB7C9D6' } },
        right: { style: 'thin', color: { argb: 'FFB7C9D6' } },
      };
    });
    worksheet.getRow(1).height = 24;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'top', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    worksheet.columns.forEach((column, index) => {
      const maxCellLength = [headers[index], ...rows.map((row) => row[index] || '')]
        .reduce((max, value) => Math.max(max, String(value).length), 0);
      column.width = Math.min(Math.max(maxCellLength + 3, 14), 38);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assets_${section}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: t('assets.exportDone') });
  };

  const bulkDelete = async () => {
    if (!canManage || selectedVisibleIds.length === 0 || bulkDeleting) return;
    const confirmed = window.confirm(`${t('assets.deleteSelected')} (${selectedVisibleIds.length})?`);
    if (!confirmed) return;

    setBulkDeleting(true);
    try {
      await Promise.all(selectedVisibleIds.map((id) => api.deleteAsset(id)));
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setSelectedIds([]);
      toast({ title: t('assets.assetDeleted') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setBulkDeleting(false);
    }
  };

  const toolbarButton = 'h-9 border-primary/30 bg-background text-primary hover:bg-primary/10';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{t('nav.dashboard')}</span>
            <span>/</span>
            <span>{t('nav.assets')}</span>
            <span>/</span>
            <span className="font-medium text-foreground">{t(currentSection.labelKey) || currentSection.title}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-normal text-foreground">{t(currentSection.labelKey) || currentSection.title}</h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSpecialFilter(undefined);
                setPage(1);
              }}
              placeholder={t('common.search')}
              className="h-10 pl-10"
            />
          </div>
          {canManage && (
            <Button onClick={openCreate} className="h-10 gap-2">
              <Plus className="h-4 w-4" />
              {isSavedSearchesSection ? 'Добавить запрос' : t('assets.addAsset')}
            </Button>
          )}
        </div>
      </div>

      <div>
        <section className="min-w-0 rounded-lg border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {canManage && (
                <Button variant="outline" className={toolbarButton} onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  {isSavedSearchesSection ? 'Добавить запрос' : t('common.add')}
                </Button>
              )}
              {!isSavedSearchesSection && (
                <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value); setSpecialFilter(undefined); setPage(1); }}>
                  <SelectTrigger className="h-9 w-[165px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('assets.allStatuses')}</SelectItem>
                    {ASSET_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{statusLabels[status][language]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <Badge variant="outline" className="h-9 rounded-md px-3">
                  {t('assets.selected')}: {selectedVisibleIds.length}
                </Badge>
              )}
              {canManage && selectedVisibleIds.length > 0 && (
                <Button
                  variant="destructive"
                  className="h-9 gap-2"
                  onClick={bulkDelete}
                  disabled={bulkDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                  {bulkDeleting ? t('common.loading') : t('assets.deleteSelected')}
                </Button>
              )}
              {!isSavedSearchesSection && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className={toolbarButton}>
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportData}>
                      <Download className="mr-2 h-4 w-4" />
                      {t('assets.exportCsv')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {isSavedSearchesSection ? (
            <SavedSearchesPanel
              canManage={canManage}
              items={visibleSavedSearches}
              onApply={applySavedSearch}
              onDelete={deleteSavedSearch}
            />
          ) : section === 'cartography' ? (
            <CartographyMap
              assets={visibleAssets}
              canManage={canManage}
              isLoading={isLoading}
              language={language as LanguageCode}
              onDelete={(id) => deleteMutation.mutate(id)}
              onEdit={openEdit}
              t={t}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-[1280px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-10">
                        <Checkbox checked={selectedOnPage} onCheckedChange={togglePageSelected} aria-label={t('assets.selectPage')} />
                      </TableHead>
                      <TableHead className="w-[170px] uppercase text-[11px]">{t('common.name')}</TableHead>
                      <TableHead className="w-[190px] uppercase text-[11px]">{t('assets.organization')}</TableHead>
                      <TableHead className="w-[120px] uppercase text-[11px]">{t('assets.serialNumber')}</TableHead>
                      <TableHead className="w-[130px] uppercase text-[11px]">{t('assets.inventoryNumber')}</TableHead>
                      <TableHead className="w-[150px] uppercase text-[11px]">{t('assets.type')}</TableHead>
                      <TableHead className="w-[170px] uppercase text-[11px]">{t('assets.networkIp')}</TableHead>
                      <TableHead className="w-[160px] uppercase text-[11px]">{t('assets.model')}</TableHead>
                      <TableHead className="w-[150px] uppercase text-[11px]">{t('assets.user')}</TableHead>
                      <TableHead className="w-[210px] uppercase text-[11px]">{t('assets.comments')}</TableHead>
                      <TableHead className="w-[160px] uppercase text-[11px]">{t('assets.operatingSystem')}</TableHead>
                      {canManage && <TableHead className="w-[90px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="h-36 text-center text-muted-foreground">{t('common.loading')}</TableCell>
                      </TableRow>
                    ) : paginatedAssets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="h-40 text-center">
                          <Package className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
                          <p className="text-muted-foreground">{t('assets.noAssets')}</p>
                        </TableCell>
                      </TableRow>
                    ) : paginatedAssets.map((asset, index) => {
                      const Icon = typeIcons[asset.asset_type] || Server;
                      return (
                        <TableRow key={asset.id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/35'}>
                          <TableCell>
                            <Checkbox checked={selectedIds.includes(asset.id)} onCheckedChange={() => toggleSelected(asset.id)} aria-label={asset.name} />
                          </TableCell>
                          <TableCell className="align-top font-medium text-primary">
                            <button type="button" onClick={() => openEdit(asset)} className="text-left hover:underline">
                              {getAssetDisplayName(asset, language)}
                            </button>
                          </TableCell>
                          <TableCell className="align-top">
                            <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs text-primary">
                              Qazaq Generation / ID Support
                            </span>
                          </TableCell>
                          <TableCell className="align-top text-muted-foreground">{getAssetSerial(asset, language)}</TableCell>
                          <TableCell className="align-top text-muted-foreground">{getAssetInventory(asset, language)}</TableCell>
                          <TableCell className="align-top">
                            <div className="flex items-start gap-2">
                              <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              <span>{typeLabels[asset.asset_type]?.[language] || asset.asset_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-pre-line align-top text-muted-foreground">
                            {section === 'ip-addressing' ? getAssetAddressingValue(asset, language) : getAssetNetwork(asset, language)}
                          </TableCell>
                          <TableCell className="align-top">
                            {getAssetModel(asset, language)}
                          </TableCell>
                          <TableCell className="align-top text-primary">{getAssetUser(asset, language)}</TableCell>
                          <TableCell className="align-top text-muted-foreground">
                            {getAssetComments(asset, language)}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge className={statusColors[asset.status]} variant="outline">
                              {getAssetOperatingSystem(asset, language)}
                            </Badge>
                          </TableCell>
                          {canManage && (
                            <TableCell className="align-top">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(asset)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(asset.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                    <SelectTrigger className="h-9 w-[92px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span>{t('assets.rowsPerPage')}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('assets.paginationSummary')
                    .replace('{from}', String(visibleAssets.length === 0 ? 0 : (safePage - 1) * pageSize + 1))
                    .replace('{to}', String(Math.min(safePage * pageSize, visibleAssets.length)))
                    .replace('{total}', String(visibleAssets.length))}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" disabled={safePage === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button className="h-9 w-9">{safePage}</Button>
                  <Button variant="ghost" size="icon" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={safePage === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t('assets.editAsset') : t('assets.newAsset')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>{t('common.name')} *</Label>
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <Label>{t('assets.type')}</Label>
              <Select value={form.asset_type} onValueChange={(value) => setForm({ ...form, asset_type: value as AssetType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((type) => <SelectItem key={type} value={type}>{typeLabels[type][language]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('common.status')}</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as AssetStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map((status) => <SelectItem key={status} value={status}>{statusLabels[status][language]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('assets.serialNumber')}</Label>
              <Input value={form.serial_number} onChange={(event) => setForm({ ...form, serial_number: event.target.value })} />
            </div>
            <div>
              <Label>{t('assets.inventoryNumber')}</Label>
              <Input value={form.inventory_number} onChange={(event) => setForm({ ...form, inventory_number: event.target.value })} />
            </div>
            <div>
              <Label>{t('assets.manufacturer')}</Label>
              <Input value={form.manufacturer} onChange={(event) => setForm({ ...form, manufacturer: event.target.value })} />
            </div>
            <div>
              <Label>{t('assets.model')}</Label>
              <Input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
            </div>
            <div>
              <Label>{t('assets.location')}</Label>
              <Select
                value={form.location || NO_LOCATION_VALUE}
                onValueChange={(value) => setForm({ ...form, location: value === NO_LOCATION_VALUE ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={assetFallbacks.notSpecified[language as LanguageCode]} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LOCATION_VALUE}>{assetFallbacks.notSpecified[language as LanguageCode]}</SelectItem>
                  {locationOptions.map((location) => (
                    <SelectItem key={location} value={location}>
                      {getLocalizedAssetText(location, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('profile.department')}</Label>
              <Select value={form.department_id} onValueChange={(value) => setForm({ ...form, department_id: value })}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  {departments.map((department: any) => (
                    <SelectItem key={department.id} value={department.id}>
                      {getDepartmentName(department.name, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('assets.purchaseDate')}</Label>
              <Input type="date" value={form.purchase_date} onChange={(event) => setForm({ ...form, purchase_date: event.target.value })} />
            </div>
            <div>
              <Label>{t('assets.warranty')}</Label>
              <Input type="date" value={form.warranty_expiry} onChange={(event) => setForm({ ...form, warranty_expiry: event.target.value })} />
            </div>
            <div>
              <Label>{t('assets.cost')}</Label>
              <Input type="number" value={form.purchase_cost} onChange={(event) => setForm({ ...form, purchase_cost: event.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>{t('assets.notes')}</Label>
              <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>
              {saveMutation.isPending ? '...' : editingId ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

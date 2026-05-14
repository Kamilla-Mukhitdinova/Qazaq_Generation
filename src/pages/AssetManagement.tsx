import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  AppWindow,
  Boxes,
  Cable,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileDown,
  Filter,
  HardDrive,
  Key,
  Monitor,
  Mouse,
  Package,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
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

type AssetType = typeof ASSET_TYPES[number];
type AssetStatus = typeof ASSET_STATUSES[number];

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

const sectionConfig: Record<string, { labelKey: string; title: string; type: AssetType | 'all'; icon: typeof Monitor }> = {
  panel: { labelKey: 'nav.assets.panel', title: 'Панель активов', type: 'all', icon: Package },
  computers: { labelKey: 'nav.assets.computers', title: 'Компьютеры', type: 'hardware', icon: Monitor },
  monitors: { labelKey: 'nav.assets.monitors', title: 'Мониторы', type: 'peripheral', icon: Monitor },
  software: { labelKey: 'nav.assets.software', title: 'Программное обеспечение', type: 'software', icon: AppWindow },
  'network-devices': { labelKey: 'nav.assets.networkDevices', title: 'Сетевые устройства', type: 'network', icon: Wifi },
  printers: { labelKey: 'nav.assets.printers', title: 'Принтеры', type: 'peripheral', icon: Printer },
  cartridges: { labelKey: 'nav.assets.cartridges', title: 'Картриджи', type: 'peripheral', icon: HardDrive },
  consumables: { labelKey: 'nav.assets.consumables', title: 'Расходные материалы', type: 'peripheral', icon: Boxes },
  cables: { labelKey: 'nav.assets.cables', title: 'Кабели', type: 'peripheral', icon: Cable },
  global: { labelKey: 'nav.assets.global', title: 'Глобально', type: 'all', icon: Package },
};

const sectionOrder = ['panel', 'computers', 'monitors', 'software', 'network-devices', 'printers', 'cartridges', 'consumables', 'cables', 'global'];
const pageSizeOptions = [10, 25, 50, 100];

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

export default function AssetManagement() {
  const { language, t } = useLanguage();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section') || 'computers';
  const currentSection = sectionConfig[section] || sectionConfig.computers;
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetForm>(emptyForm);

  const canManage = role === 'admin' || role === 'manager';

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

  const saveMutation = useMutation({
    mutationFn: async (formData: AssetForm) => {
      if (editingId) {
        await api.updateAsset(editingId, formData);
      } else {
        await api.createAsset(formData);
      }
    },
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setSelectedIds([]);
      toast({ title: t('assets.assetDeleted') });
    },
  });

  const visibleAssets = useMemo(() => {
    return assets.filter((asset) => {
      const sectionMatches = currentSection.type === 'all' || asset.asset_type === currentSection.type;
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
      return sectionMatches && searchMatches && statusMatches;
    });
  }, [assets, currentSection.type, filterStatus, search]);

  const totalPages = Math.max(1, Math.ceil(visibleAssets.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedAssets = visibleAssets.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedOnPage = paginatedAssets.length > 0 && paginatedAssets.every((asset) => selectedIds.includes(asset.id));
  const selectedRows = visibleAssets.filter((asset) => selectedIds.includes(asset.id));

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
    setEditingId(null);
    setForm({
      ...emptyForm,
      asset_type: currentSection.type === 'all' ? 'hardware' : currentSection.type,
    });
    setDialogOpen(true);
  };

  const toggleSection = (nextSection: string) => {
    setSearchParams({ section: nextSection });
    setPage(1);
    setSelectedIds([]);
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

  const exportData = () => {
    const headers = ['Наименование', 'Организация', 'Серийный номер', 'Инвентарный номер', 'Тип', 'Сетевая структура - IP', 'Модель', 'Пользователь', 'Комментарии', 'Операционная система'];
    const rows = (selectedRows.length > 0 ? selectedRows : visibleAssets).map((asset) => [
      asset.name,
      'Qazaq Generation / ID Support',
      asset.serial_number,
      asset.inventory_number,
      typeLabels[asset.asset_type]?.[language] || asset.asset_type,
      getAssetIp(asset),
      [asset.manufacturer, asset.model].filter(Boolean).join(' '),
      asset.assigned_to_name,
      asset.notes,
      asset.asset_type === 'hardware' ? 'Linux / Windows' : '-',
    ]);

    const escapeCSV = (value: string) => /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assets_${section}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: t('assets.exportDone') });
  };

  const bulkDelete = async () => {
    if (!canManage || selectedIds.length === 0) return;
    await Promise.all(selectedIds.map((id) => api.deleteAsset(id)));
    queryClient.invalidateQueries({ queryKey: ['assets'] });
    setSelectedIds([]);
    toast({ title: t('assets.assetDeleted') });
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
                setPage(1);
              }}
              placeholder={t('common.search')}
              className="h-10 pl-10"
            />
          </div>
          {canManage && (
            <Button onClick={openCreate} className="h-10 gap-2">
              <Plus className="h-4 w-4" />
              {t('assets.addAsset')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="rounded-lg border bg-card p-2 shadow-sm">
          <div className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Активы</div>
          <nav className="space-y-1">
            {sectionOrder.map((item) => {
              const config = sectionConfig[item];
              const Icon = config.icon;
              const count = assets.filter((asset) => config.type === 'all' || asset.asset_type === config.type).length;
              const active = item === section;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleSection(item)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t(config.labelKey) || config.title}</span>
                  </span>
                  <span className={`ml-2 text-xs ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{count}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 rounded-lg border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {canManage && (
                <Button variant="outline" className={toolbarButton} onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить
                </Button>
              )}
              <Button variant="outline" className={toolbarButton}>
                <Filter className="mr-2 h-4 w-4" />
                Список
              </Button>
              <Button variant="outline" className={toolbarButton}>
                Шаблоны
              </Button>
              <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value); setPage(1); }}>
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
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <Badge variant="outline" className="h-9 rounded-md px-3">
                  Выбрано: {selectedIds.length}
                </Badge>
              )}
              <Button variant="outline" size="icon" className={toolbarButton} onClick={() => queryClient.invalidateQueries({ queryKey: ['assets'] })}>
                <RefreshCw className="h-4 w-4" />
              </Button>
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
                  {canManage && selectedIds.length > 0 && (
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={bulkDelete}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить выбранные
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[1280px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox checked={selectedOnPage} onCheckedChange={togglePageSelected} aria-label="Выбрать страницу" />
                  </TableHead>
                  <TableHead className="w-[170px] uppercase text-[11px]">Наименование</TableHead>
                  <TableHead className="w-[190px] uppercase text-[11px]">Организация</TableHead>
                  <TableHead className="w-[120px] uppercase text-[11px]">Серийный номер</TableHead>
                  <TableHead className="w-[130px] uppercase text-[11px]">Инвентарный номер</TableHead>
                  <TableHead className="w-[150px] uppercase text-[11px]">Тип</TableHead>
                  <TableHead className="w-[170px] uppercase text-[11px]">Сетевая структура - IP</TableHead>
                  <TableHead className="w-[160px] uppercase text-[11px]">Модель</TableHead>
                  <TableHead className="w-[150px] uppercase text-[11px]">Пользователь</TableHead>
                  <TableHead className="w-[210px] uppercase text-[11px]">Комментарии</TableHead>
                  <TableHead className="w-[160px] uppercase text-[11px]">Операционная система</TableHead>
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
                          {asset.name || '-'}
                        </button>
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs text-primary">
                          Qazaq Generation / ID Support
                        </span>
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground">{asset.serial_number || '-'}</TableCell>
                      <TableCell className="align-top text-muted-foreground">{asset.inventory_number || '-'}</TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-start gap-2">
                          <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <span>{typeLabels[asset.asset_type]?.[language] || asset.asset_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-pre-line align-top text-muted-foreground">{getAssetIp(asset)}</TableCell>
                      <TableCell className="align-top">
                        {[asset.manufacturer, asset.model].filter(Boolean).join(' ') || '-'}
                      </TableCell>
                      <TableCell className="align-top text-primary">{asset.assigned_to_name || '-'}</TableCell>
                      <TableCell className="align-top text-muted-foreground">{asset.notes || asset.location || '-'}</TableCell>
                      <TableCell className="align-top">
                        <Badge className={statusColors[asset.status]} variant="outline">
                          {asset.asset_type === 'hardware' ? 'Linux / Windows' : statusLabels[asset.status][language]}
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
              <span>строк на странице</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Отображаются строки с {visibleAssets.length === 0 ? 0 : (safePage - 1) * pageSize + 1} по {Math.min(safePage * pageSize, visibleAssets.length)} из {visibleAssets.length}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" disabled={safePage === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button className="h-9 w-9">{safePage}</Button>
              <Button variant="ghost" size="icon" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" disabled={safePage === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
            </div>
          </div>
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
              <Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </div>
            <div>
              <Label>{t('profile.department')}</Label>
              <Select value={form.department_id} onValueChange={(value) => setForm({ ...form, department_id: value })}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  {departments.map((department: any) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
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

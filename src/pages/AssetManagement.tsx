import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Monitor, Server, Key, Wifi, Mouse, Pencil, Trash2, Package, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const ASSET_TYPES = ['hardware', 'software', 'license', 'network', 'peripheral'] as const;
const ASSET_STATUSES = ['active', 'in_stock', 'maintenance', 'retired', 'disposed'] as const;

type AssetType = typeof ASSET_TYPES[number];
type AssetStatus = typeof ASSET_STATUSES[number];

const typeIcons: Record<AssetType, typeof Monitor> = {
  hardware: Server,
  software: Monitor,
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
  active: 'bg-green-500/10 text-green-700 border-green-500/20',
  in_stock: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  retired: 'bg-muted text-muted-foreground border-border',
  disposed: 'bg-destructive/10 text-destructive border-destructive/20',
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
  name: '', asset_type: 'hardware', status: 'in_stock', serial_number: '',
  inventory_number: '', manufacturer: '', model: '', location: '',
  department_id: '', purchase_date: '', warranty_expiry: '', purchase_cost: '', notes: '',
};

export default function AssetManagement() {
  const { language, t } = useLanguage();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetForm>(emptyForm);

  const canManage = role === 'admin' || role === 'manager';

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const result = await api.getAssets();
      return result.data || [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.getDepartments(),
  });

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
      toast({ title: t('assets.assetDeleted') });
    },
  });

  const filtered = useMemo(() => {
    return assets.filter((a: any) => {
      const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
        a.inventory_number?.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || a.asset_type === filterType;
      const matchStatus = filterStatus === 'all' || a.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [assets, search, filterType, filterStatus]);

  const openEdit = (asset: any) => {
    setEditingId(asset.id);
    setForm({
      name: asset.name || '',
      asset_type: asset.asset_type || 'hardware',
      status: asset.status || 'in_stock',
      serial_number: asset.serial_number || '',
      inventory_number: asset.inventory_number || '',
      manufacturer: asset.manufacturer || '',
      model: asset.model || '',
      location: asset.location || '',
      department_id: asset.department_id || '',
      purchase_date: asset.purchase_date || '',
      warranty_expiry: asset.warranty_expiry || '',
      purchase_cost: asset.purchase_cost?.toString() || '',
      notes: asset.notes || '',
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const exportData = (type: 'csv' | 'xlsx') => {
    const headers = ['Name', 'Type', 'Status', 'Serial #', 'Inventory #', 'Manufacturer', 'Model', 'Location', 'Purchase Date', 'Warranty Expiry', 'Cost', 'Notes'];
    const rows = filtered.map((a: any) => [
      a.name || '', typeLabels[a.asset_type as AssetType]?.[language] || a.asset_type,
      statusLabels[a.status as AssetStatus]?.[language] || a.status,
      a.serial_number || '', a.inventory_number || '', a.manufacturer || '', a.model || '',
      a.location || '', a.purchase_date || '', a.warranty_expiry || '',
      a.purchase_cost?.toString() || '', a.notes || '',
    ]);

    const escapeCSV = (v: string) => v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
    const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t('assets.exportDone') });
  };


  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('assets.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('assets.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportData('csv')} className="gap-2" disabled={filtered.length === 0}>
            <Download className="h-4 w-4" />
            {t('assets.exportCsv')}
          </Button>
          {canManage && (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('assets.addAsset')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {ASSET_STATUSES.map(s => {
          const count = assets.filter((a: any) => a.status === s).length;
          return (
            <Card key={s} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground">{statusLabels[s][language]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('common.search')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('assets.allTypes')}</SelectItem>
              {ASSET_TYPES.map(tp => <SelectItem key={tp} value={tp}>{typeLabels[tp][language]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('assets.allStatuses')}</SelectItem>
              {ASSET_STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabels[s][language]}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('assets.type')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('assets.serialNumber')}</TableHead>
                <TableHead>{t('assets.location')}</TableHead>
                <TableHead>{t('assets.purchaseDate')}</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-muted-foreground">{t('assets.noAssets')}</p>
                </TableCell></TableRow>
              ) : filtered.map((asset: any) => {
                const Icon = typeIcons[asset.asset_type as AssetType] || Server;
                return (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-foreground">{asset.name}</p>
                          {asset.manufacturer && <p className="text-xs text-muted-foreground">{asset.manufacturer} {asset.model}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{typeLabels[asset.asset_type as AssetType]?.[language]}</Badge></TableCell>
                    <TableCell>
                      <Badge className={statusColors[asset.status as AssetStatus]} variant="outline">
                        {statusLabels[asset.status as AssetStatus]?.[language]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{asset.serial_number || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{asset.location || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{asset.purchase_date ? format(new Date(asset.purchase_date), 'dd.MM.yyyy') : '-'}</TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(asset)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(asset.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t('assets.editAsset') : t('assets.newAsset')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>{t('common.name')} *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>{t('assets.type')}</Label>
              <Select value={form.asset_type} onValueChange={v => setForm({ ...form, asset_type: v as AssetType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map(tp => <SelectItem key={tp} value={tp}>{typeLabels[tp][language]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('common.status')}</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as AssetStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabels[s][language]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('assets.serialNumber')}</Label>
              <Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
            </div>
            <div>
              <Label>{t('assets.inventoryNumber')}</Label>
              <Input value={form.inventory_number} onChange={e => setForm({ ...form, inventory_number: e.target.value })} />
            </div>
            <div>
              <Label>{t('assets.manufacturer')}</Label>
              <Input value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} />
            </div>
            <div>
              <Label>{t('assets.model')}</Label>
              <Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
            </div>
            <div>
              <Label>{t('assets.location')}</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label>{t('profile.department')}</Label>
              <Select value={form.department_id} onValueChange={v => setForm({ ...form, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('assets.purchaseDate')}</Label>
              <Input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} />
            </div>
            <div>
              <Label>{t('assets.warranty')}</Label>
              <Input type="date" value={form.warranty_expiry} onChange={e => setForm({ ...form, warranty_expiry: e.target.value })} />
            </div>
            <div>
              <Label>{t('assets.cost')}</Label>
              <Input type="number" value={form.purchase_cost} onChange={e => setForm({ ...form, purchase_cost: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>{t('assets.notes')}</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
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

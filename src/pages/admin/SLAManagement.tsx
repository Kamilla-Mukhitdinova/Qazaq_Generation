import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Edit, Loader2 } from 'lucide-react';

type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
interface SLAPolicy { id: string; priority: TicketPriority; category_id: string | null; response_minutes: number; resolve_minutes: number; created_at: string; }
interface Category { id: string; name: string; }

const PRIORITY_COLORS: Record<TicketPriority, string> = { low: 'bg-slate-500/10 text-slate-500', medium: 'bg-blue-500/10 text-blue-500', high: 'bg-orange-500/10 text-orange-500', critical: 'bg-red-500/10 text-red-500' };

export default function SLAManagement() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newPolicy, setNewPolicy] = useState({ priority: 'medium' as TicketPriority, category_id: '', response_minutes: 60, resolve_minutes: 480 });
  const [editingPolicy, setEditingPolicy] = useState<SLAPolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { const [p, c] = await Promise.all([api.getSLAPolicies(), api.getCategories()]); setPolicies(p || []); setCategories(c || []); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const formatTime = (m: number) => {
    if (m < 60) return `${m} ${t('admin.sla.min')}`;
    const h = Math.floor(m / 60); const mins = m % 60;
    return mins > 0 ? `${h} ${t('admin.sla.hour')} ${mins} ${t('admin.sla.min')}` : `${h} ${t('admin.sla.hour')}`;
  };

  const handleAddPolicy = async () => {
    setSaving(true);
    try { await api.createSLAPolicy({ priority: newPolicy.priority, categoryId: newPolicy.category_id || null, responseMinutes: newPolicy.response_minutes, resolveMinutes: newPolicy.resolve_minutes }); toast({ title: t('common.success'), description: t('admin.sla.slaAdded') }); setNewPolicy({ priority: 'medium', category_id: '', response_minutes: 60, resolve_minutes: 480 }); setAddOpen(false); fetchData(); }
    catch (e) { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setSaving(false); }
  };

  const handleUpdatePolicy = async () => {
    if (!editingPolicy) return; setSaving(true);
    try { await api.updateSLAPolicy(editingPolicy.id, { responseMinutes: editingPolicy.response_minutes, resolveMinutes: editingPolicy.resolve_minutes }); toast({ title: t('common.success'), description: t('admin.sla.slaUpdated') }); setEditingPolicy(null); fetchData(); }
    catch (e) { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />{t('admin.sla.title')}</h1><p className="text-muted-foreground">{t('admin.sla.subtitle')}</p></div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('admin.sla.addSla')}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('admin.sla.newSla')}</DialogTitle><DialogDescription>{t('admin.sla.newSlaDesc')}</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>{t('admin.sla.priority')}</Label>
                <Select value={newPolicy.priority} onValueChange={(v: TicketPriority) => setNewPolicy({ ...newPolicy, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">{t('ticket.priority.low')}</SelectItem><SelectItem value="medium">{t('ticket.priority.medium')}</SelectItem><SelectItem value="high">{t('ticket.priority.high')}</SelectItem><SelectItem value="critical">{t('ticket.priority.critical')}</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2"><Label>{t('admin.sla.category')}</Label>
                <Select value={newPolicy.category_id} onValueChange={(v) => setNewPolicy({ ...newPolicy, category_id: v })}><SelectTrigger><SelectValue placeholder={t('admin.sla.allCategories')} /></SelectTrigger><SelectContent>{categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('admin.sla.responseTime')}</Label><Input type="number" value={newPolicy.response_minutes} onChange={(e) => setNewPolicy({ ...newPolicy, response_minutes: parseInt(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>{t('admin.sla.resolveTime')}</Label><Input type="number" value={newPolicy.resolve_minutes} onChange={(e) => setNewPolicy({ ...newPolicy, resolve_minutes: parseInt(e.target.value) || 0 })} /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleAddPolicy} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.add')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardHeader><CardTitle>{t('admin.sla.policies')}</CardTitle><CardDescription>{t('admin.sla.policiesDesc')}</CardDescription></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead>{t('admin.sla.priority')}</TableHead><TableHead>{t('ticket.form.category')}</TableHead><TableHead>{t('admin.sla.response')}</TableHead><TableHead>{t('admin.sla.resolve')}</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{policies.map(policy => (
            <TableRow key={policy.id}>
              <TableCell><Badge variant="secondary" className={PRIORITY_COLORS[policy.priority]}>{t(`ticket.priority.${policy.priority}`)}</Badge></TableCell>
              <TableCell>{policy.category_id ? categories.find(c => c.id === policy.category_id)?.name : t('common.all')}</TableCell>
              <TableCell>{formatTime(policy.response_minutes)}</TableCell><TableCell>{formatTime(policy.resolve_minutes)}</TableCell>
              <TableCell><Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setEditingPolicy(policy)}><Edit className="h-4 w-4" /></Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>{t('admin.sla.editSla')}</DialogTitle></DialogHeader>
                  {editingPolicy && <div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>{t('admin.sla.responseTime')}</Label><Input type="number" value={editingPolicy.response_minutes} onChange={(e) => setEditingPolicy({ ...editingPolicy, response_minutes: parseInt(e.target.value) || 0 })} /></div><div className="space-y-2"><Label>{t('admin.sla.resolveTime')}</Label><Input type="number" value={editingPolicy.resolve_minutes} onChange={(e) => setEditingPolicy({ ...editingPolicy, resolve_minutes: parseInt(e.target.value) || 0 })} /></div></div></div>}
                  <DialogFooter><Button onClick={handleUpdatePolicy} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.save')}</Button></DialogFooter>
                </DialogContent></Dialog></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ClipboardCheck, PenTool, CheckCircle2, Clock, AlertTriangle, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

interface PPRPlan {
  id: string; title: string; description: string | null; equipment: string;
  location: string | null; scheduled_date: string; frequency: string; status: string;
  created_by: string; assigned_to: string | null; checklist: any[]; notes: string | null;
  signed_by_executor: string | null; executor_signature_date: string | null;
  signed_by_manager: string | null; manager_signature_date: string | null; created_at: string;
}

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
};

const normalizePlan = (p: any): PPRPlan => ({
  id: p.id,
  title: p.title,
  description: p.description ?? null,
  equipment: p.equipment,
  location: p.location ?? null,
  scheduled_date: pick<string>(p, 'scheduled_date', 'scheduledDate') || new Date().toISOString(),
  frequency: p.frequency || 'monthly',
  status: p.status || 'draft',
  created_by: pick<string>(p, 'created_by', 'createdBy') || '',
  assigned_to: pick<string | null>(p, 'assigned_to', 'assignedTo') || null,
  checklist: Array.isArray(p.checklist) ? p.checklist : [],
  notes: p.notes ?? null,
  signed_by_executor: pick<string | null>(p, 'signed_by_executor', 'signedByExecutor') || null,
  executor_signature_date: pick<string | null>(p, 'executor_signature_date', 'executorSignatureDate') || null,
  signed_by_manager: pick<string | null>(p, 'signed_by_manager', 'signedByManager') || null,
  manager_signature_date: pick<string | null>(p, 'manager_signature_date', 'managerSignatureDate') || null,
  created_at: pick<string>(p, 'created_at', 'createdAt') || new Date().toISOString(),
});

export default function PPRPlans() {
  const { user, profile, role } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PPRPlan | null>(null);
  const [form, setForm] = useState({ title: '', description: '', equipment: '', location: '', scheduled_date: '', frequency: 'monthly', checklist: [''] });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['ppr-plans'],
    queryFn: () => api.getPPRPlans(),
  });
  const normalizedPlans = (plans as any[]).map(normalizePlan);

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: () => api.getProfiles(),
  });

  const getProfileName = (userId: string | null) => {
    if (!userId) return '-';
    return (profiles as any[]).find((p: any) => p.user_id === userId)?.name || userId.slice(0, 8);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const checklist = form.checklist.filter(c => c.trim()).map(c => ({ text: c, done: false }));
      await api.createPPRPlan({
        title: form.title, description: form.description || null,
        equipment: form.equipment, location: form.location || null,
        scheduledDate: form.scheduled_date, frequency: form.frequency, checklist,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppr-plans'] });
      setIsCreateOpen(false);
      setForm({ title: '', description: '', equipment: '', location: '', scheduled_date: '', frequency: 'monthly', checklist: [''] });
      toast({ title: t('ppr.planCreated') });
    },
    onError: (e: any) => toast({ title: t('common.error'), description: e.message, variant: 'destructive' }),
  });

  const signMutation = useMutation({
    mutationFn: async ({ planId, type }: { planId: string; type: 'executor' | 'manager' }) => {
      const updates = type === 'executor'
        ? { signedByExecutor: user!.id, executorSignatureDate: new Date().toISOString(), status: 'signed_executor' }
        : { signedByManager: user!.id, managerSignatureDate: new Date().toISOString(), status: 'approved' };
      await api.updatePPRPlan(planId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppr-plans'] });
      setSelectedPlan(null);
      toast({ title: t('ppr.signedSuccess') });
    },
    onError: (e: any) => toast({ title: t('common.error'), description: e.message, variant: 'destructive' }),
  });

  const statusConfig: Record<string, { labelKey: string; color: string; icon: any }> = {
    draft: { labelKey: 'ppr.draft', color: 'bg-muted text-muted-foreground', icon: FileText },
    in_progress: { labelKey: 'ppr.inProgress', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
    signed_executor: { labelKey: 'ppr.signedExecutor', color: 'bg-yellow-500/20 text-yellow-400', icon: PenTool },
    approved: { labelKey: 'ppr.approved', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 },
    overdue: { labelKey: 'ppr.overdue', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
  };

  const canSignAsExecutor = (plan: PPRPlan) => !plan.signed_by_executor && (plan.assigned_to === user?.id || plan.created_by === user?.id || role === 'agent');
  const canSignAsManager = (plan: PPRPlan) => plan.signed_by_executor && !plan.signed_by_manager && (role === 'manager' || role === 'admin');

  const exportToPDF = (plan: PPRPlan) => {
    const doc = new jsPDF();
    const sc = statusConfig[plan.status] || statusConfig.draft;
    let y = 20;
    doc.setFontSize(18); doc.text(t('nav.ppr'), 105, y, { align: 'center' }); y += 12;
    doc.setFontSize(14); doc.text(plan.title, 105, y, { align: 'center' }); y += 15;
    doc.setFontSize(10);
    const fields = [[t('ppr.equipment'), plan.equipment], [t('ppr.location'), plan.location || '-'], [t('ppr.scheduledDate'), format(new Date(plan.scheduled_date), 'dd.MM.yyyy')], [t('ppr.frequency'), plan.frequency || '-'], [t('common.status'), t(sc.labelKey)], [t('ppr.createdBy'), getProfileName(plan.created_by)]];
    fields.forEach(([label, value]) => { doc.setFont('helvetica', 'bold'); doc.text(`${label}:`, 20, y); doc.setFont('helvetica', 'normal'); doc.text(String(value), 70, y); y += 7; });
    doc.save(`PPR_${plan.title.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-primary" />{t('ppr.title')}</h1>
          <p className="text-muted-foreground">{t('ppr.subtitle')}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('ppr.createPpr')}</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{t('ppr.newPlan')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t('ppr.planName')}</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t('ppr.namePlaceholder')} /></div>
              <div><Label>{t('ppr.equipment')}</Label><Input value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value }))} placeholder={t('ppr.equipmentPlaceholder')} /></div>
              <div><Label>{t('ppr.location')}</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder={t('ppr.locationPlaceholder')} /></div>
              <div><Label>{t('ppr.scheduledDate')}</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} /></div>
              <div>
                <Label>{t('ppr.frequency')}</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('ppr.daily')}</SelectItem><SelectItem value="weekly">{t('ppr.weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('ppr.monthly')}</SelectItem><SelectItem value="quarterly">{t('ppr.quarterly')}</SelectItem>
                    <SelectItem value="yearly">{t('ppr.yearly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('ppr.description')}</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('ppr.descPlaceholder')} /></div>
              <div>
                <Label>{t('ppr.checklist')}</Label>
                {form.checklist.map((item, i) => (
                  <div key={i} className="flex gap-2 mt-1">
                    <Input value={item} onChange={e => { const c = [...form.checklist]; c[i] = e.target.value; setForm(f => ({ ...f, checklist: c })); }} placeholder={`${t('ppr.point')} ${i + 1}`} />
                    {i === form.checklist.length - 1 && <Button variant="outline" size="icon" onClick={() => setForm(f => ({ ...f, checklist: [...f.checklist, ''] }))}><Plus className="h-4 w-4" /></Button>}
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.title || !form.equipment || !form.scheduled_date}>{t('ppr.createPlan')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      ) : normalizedPlans.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t('ppr.noPlans')}</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {normalizedPlans.map((plan, i) => {
              const sc = statusConfig[plan.status] || statusConfig.draft;
              const StatusIcon = sc.icon;
              return (
                <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedPlan(plan)}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1"><StatusIcon className="h-4 w-4" /><h3 className="font-semibold truncate">{plan.title}</h3></div>
                          <p className="text-sm text-muted-foreground">{plan.equipment} {plan.location && `• ${plan.location}`}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t('ppr.scheduledDate')}: {format(new Date(plan.scheduled_date), 'dd.MM.yyyy')} • {plan.frequency}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={sc.color}>{t(sc.labelKey)}</Badge>
                          <div className="flex gap-1">
                            {plan.signed_by_executor && <Badge variant="outline" className="text-xs">✍️ {t('ppr.executor')}</Badge>}
                            {plan.signed_by_manager && <Badge variant="outline" className="text-xs">✅ {t('ppr.manager')}</Badge>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedPlan && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{selectedPlan.title}</DialogTitle>
                  <Button variant="outline" size="sm" onClick={() => exportToPDF(selectedPlan)}><Download className="h-4 w-4 mr-1" />PDF</Button>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">{t('ppr.equipment')}:</span> <strong>{selectedPlan.equipment}</strong></div>
                  <div><span className="text-muted-foreground">{t('ppr.location')}:</span> <strong>{selectedPlan.location || '-'}</strong></div>
                  <div><span className="text-muted-foreground">{t('ppr.scheduledDate')}:</span> <strong>{format(new Date(selectedPlan.scheduled_date), 'dd.MM.yyyy')}</strong></div>
                  <div><span className="text-muted-foreground">{t('ppr.frequency')}:</span> <strong>{selectedPlan.frequency}</strong></div>
                  <div><span className="text-muted-foreground">{t('ppr.createdBy')}:</span> <strong>{getProfileName(selectedPlan.created_by)}</strong></div>
                  <div><span className="text-muted-foreground">{t('common.status')}:</span> <Badge className={(statusConfig[selectedPlan.status] || statusConfig.draft).color}>{t((statusConfig[selectedPlan.status] || statusConfig.draft).labelKey)}</Badge></div>
                </div>
                {selectedPlan.description && <div><Label>{t('ppr.description')}</Label><p className="text-sm mt-1">{selectedPlan.description}</p></div>}
                {Array.isArray(selectedPlan.checklist) && selectedPlan.checklist.length > 0 && (
                  <div><Label>{t('ppr.checklist')}</Label>
                    <ul className="mt-1 space-y-1">{selectedPlan.checklist.map((item: any, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className={`h-4 w-4 rounded border flex items-center justify-center text-xs ${item.done ? 'bg-green-500 text-white' : 'bg-muted'}`}>{item.done ? '✓' : ''}</span>{item.text}
                      </li>
                    ))}</ul>
                  </div>
                )}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">{t('ppr.signatures')}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className={selectedPlan.signed_by_executor ? 'border-green-500/50' : 'border-dashed'}>
                      <CardContent className="p-4 text-center">
                        <PenTool className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">{t('ppr.executor')}</p>
                        {selectedPlan.signed_by_executor ? (
                          <div className="mt-2"><p className="text-xs text-green-500 font-semibold">✅ {t('ppr.signed')}</p><p className="text-xs text-muted-foreground">{getProfileName(selectedPlan.signed_by_executor)}</p></div>
                        ) : canSignAsExecutor(selectedPlan) ? (
                          <Button size="sm" className="mt-2" onClick={() => signMutation.mutate({ planId: selectedPlan.id, type: 'executor' })}><PenTool className="h-3 w-3 mr-1" />{t('ppr.sign')}</Button>
                        ) : <p className="text-xs text-muted-foreground mt-2">{t('ppr.awaitingSignature')}</p>}
                      </CardContent>
                    </Card>
                    <Card className={selectedPlan.signed_by_manager ? 'border-green-500/50' : 'border-dashed'}>
                      <CardContent className="p-4 text-center">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">{t('ppr.manager')}</p>
                        {selectedPlan.signed_by_manager ? (
                          <div className="mt-2"><p className="text-xs text-green-500 font-semibold">✅ {t('ppr.approvedStatus')}</p><p className="text-xs text-muted-foreground">{getProfileName(selectedPlan.signed_by_manager)}</p></div>
                        ) : canSignAsManager(selectedPlan) ? (
                          <Button size="sm" className="mt-2" onClick={() => signMutation.mutate({ planId: selectedPlan.id, type: 'manager' })}><CheckCircle2 className="h-3 w-3 mr-1" />{t('ppr.approve')}</Button>
                        ) : <p className="text-xs text-muted-foreground mt-2">{selectedPlan.signed_by_executor ? t('ppr.awaitingApproval') : t('ppr.executorFirst')}</p>}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

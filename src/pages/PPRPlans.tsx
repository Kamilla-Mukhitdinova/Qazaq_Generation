import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Download, FileText, GitBranch, Loader2, Paperclip, Send, ShieldCheck, XCircle } from 'lucide-react';
import { format } from 'date-fns';

type PprLine = '2' | '3';
type SignerStatus = 'Pending' | 'Approved' | 'Rejected';

interface PprSigner {
  userId: string;
  status: SignerStatus;
  decidedAt?: string | null;
}

interface PPRPlan {
  id: string;
  title: string;
  description: string | null;
  line: PprLine;
  scheduled_date: string;
  status: string;
  created_by: string;
  assigned_to: string | null;
  notes: string | null;
  signers: PprSigner[];
  attachment?: {
    fileName: string;
    size?: number;
    uploadedAt?: string;
  } | null;
  created_at: string;
}

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key] as T;
  }
  return undefined;
};

const normalizeProfileId = (profile: any) => pick<string>(profile, 'user_id', 'userId') || '';

const normalizePlan = (plan: any): PPRPlan => ({
  id: plan.id,
  title: plan.title,
  description: plan.description ?? null,
  line: String(plan.line || '2') === '3' ? '3' : '2',
  scheduled_date: pick<string>(plan, 'scheduled_date', 'scheduledDate') || new Date().toISOString(),
  status: plan.status || 'draft',
  created_by: pick<string>(plan, 'created_by', 'createdBy') || '',
  assigned_to: pick<string | null>(plan, 'assigned_to', 'assignedTo') || null,
  notes: plan.notes ?? null,
  signers: Array.isArray(plan.signers) ? plan.signers : [],
  attachment: plan.attachment || null,
  created_at: pick<string>(plan, 'created_at', 'createdAt') || new Date().toISOString(),
});

const statusConfig: Record<string, { labelKey: string; color: string; icon: typeof FileText }> = {
  draft: { labelKey: 'ppr.draft', color: 'bg-muted text-muted-foreground', icon: FileText },
  pending_approval: { labelKey: 'ppr.awaitingApproval', color: 'bg-amber-500/10 text-amber-700', icon: ShieldCheck },
  approved: { labelKey: 'ppr.approved', color: 'bg-green-500/10 text-green-600', icon: CheckCircle2 },
  rejected: { labelKey: 'ppr.rejected', color: 'bg-red-500/10 text-red-600', icon: XCircle },
};

const signerStatusClass: Record<SignerStatus, string> = {
  Pending: 'bg-muted text-muted-foreground',
  Approved: 'bg-green-500/10 text-green-600',
  Rejected: 'bg-red-500/10 text-red-600',
};

const initialForm = (line: PprLine) => ({
  title: '',
  description: '',
  line,
  scheduledDate: new Date().toISOString().slice(0, 10),
  assignedTo: '',
  notes: '',
  signerIds: [] as string[],
});

const NO_EXECUTOR_VALUE = 'none';

export default function PPRPlans() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedLine, setSelectedLine] = useState<PprLine | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PPRPlan | null>(null);
  const [form, setForm] = useState(initialForm('2'));
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const { data: rawPlans = [], isLoading } = useQuery({
    queryKey: ['ppr-plans'],
    queryFn: () => api.getPPRPlans(),
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: () => api.getProfiles(),
  });

  const plans = useMemo(() => (rawPlans as any[]).map(normalizePlan), [rawPlans]);
  const people = useMemo(() => {
    const normalizedPeople = (profiles as any[])
      .map(profile => ({
        id: normalizeProfileId(profile),
        name: profile.name || profile.email || 'User',
        email: profile.email || '',
      }))
      .filter(profile => profile.id);

    if (normalizedPeople.length > 0 || !user?.id) return normalizedPeople;

    return [{
      id: user.id,
      name: profile?.name || user.name || user.email || 'Current user',
      email: profile?.email || user.email || '',
    }];
  }, [profile, profiles, user]);

  useEffect(() => {
    const pprId = searchParams.get('pprId');
    if (!pprId || plans.length === 0) return;

    const plan = plans.find(item => item.id === pprId);
    if (plan) {
      setSelectedPlan(plan);
      setSelectedLine(null);
    }
  }, [plans, searchParams]);

  const getProfileName = (userId: string | null) => {
    if (!userId) return '-';
    return people.find(person => person.id === userId)?.name || userId.slice(0, 8);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const created: any = await api.createPPRPlan({
        title: form.title,
        description: form.description || null,
        line: form.line,
        scheduledDate: form.scheduledDate,
        assignedTo: form.assignedTo || null,
        notes: form.notes || null,
        signerIds: form.signerIds,
      });
      if (attachmentFile) await api.uploadPPRAttachment(created.id, attachmentFile);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppr-plans'] });
      setSelectedLine(null);
      setForm(initialForm('2'));
      setAttachmentFile(null);
      toast({ title: 'ППР сохранён', description: 'Подписантам отправлены уведомления.' });
    },
    onError: (error: any) => toast({ title: 'Ошибка', description: error.message, variant: 'destructive' }),
  });

  const decisionMutation = useMutation({
    mutationFn: ({ planId, decision }: { planId: string; decision: 'Approved' | 'Rejected' }) => api.decidePPRPlan(planId, decision),
    onSuccess: (updated: any) => {
      queryClient.invalidateQueries({ queryKey: ['ppr-plans'] });
      setSelectedPlan(normalizePlan(updated));
      toast({ title: 'Решение сохранено' });
    },
    onError: (error: any) => toast({ title: 'Ошибка', description: error.message, variant: 'destructive' }),
  });

  const chooseLine = (line: PprLine) => {
    setSelectedLine(line);
    setForm(initialForm(line));
  };

  const toggleSigner = (userId: string, checked: boolean) => {
    setForm(current => ({
      ...current,
      signerIds: checked
        ? [...current.signerIds, userId]
        : current.signerIds.filter(id => id !== userId),
    }));
  };

  const submitCreate = () => {
    if (!form.title.trim()) {
      toast({ title: 'Заполните название ППР', variant: 'destructive' });
      return;
    }
    if (!form.scheduledDate) {
      toast({ title: 'Выберите дату ППР', variant: 'destructive' });
      return;
    }
    if (form.signerIds.length === 0) {
      toast({ title: 'Выберите хотя бы одного подписанта', variant: 'destructive' });
      return;
    }

    createMutation.mutate();
  };

  const currentUserSigner = selectedPlan?.signers.find(signer => signer.userId === user?.id);
  const canDecide = Boolean(currentUserSigner && currentUserSigner.status === 'Pending' && selectedPlan?.status === 'pending_approval');
  const getStatusLabel = (status: string) => t((statusConfig[status] || statusConfig.draft).labelKey);
  const getSignerStatusLabel = (status: SignerStatus) => {
    const labels: Record<SignerStatus, string> = {
      Pending: t('ppr.awaitingSignature'),
      Approved: t('ppr.approvedStatus'),
      Rejected: t('ppr.rejected'),
    };
    return labels[status];
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            ППР
          </h1>
          <p className="text-muted-foreground">Создание, согласование и контроль документов ППР.</p>
        </div>
      </div>

      {!selectedLine ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(['2', '3'] as PprLine[]).map(line => (
            <button key={line} type="button" onClick={() => chooseLine(line)} className="group text-left">
              <Card className="h-full transition hover:border-primary/60 hover:shadow-lg">
                <CardContent className="flex min-h-44 items-center gap-5 p-6">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <GitBranch className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Линия {line}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Открыть шаблон ППР для линии {line}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedLine(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>Шаблон ППР: Линия {form.line}</CardTitle>
                <CardDescription>Заполните данные и выберите подписантов.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Название ППР</Label>
                <Input value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="ППР по линии" />
              </div>
              <div className="space-y-2">
                <Label>Дата</Label>
                <Input type="date" value={form.scheduledDate} onChange={event => setForm(current => ({ ...current, scheduledDate: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Линия</Label>
                <Input value={`Линия ${form.line}`} disabled />
              </div>
              <div className="space-y-2">
                <Label>Исполнитель</Label>
                <Select
                  value={form.assignedTo || NO_EXECUTOR_VALUE}
                  onValueChange={value => setForm(current => ({ ...current, assignedTo: value === NO_EXECUTOR_VALUE ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите исполнителя" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_EXECUTOR_VALUE}>Не выбран</SelectItem>
                    {people.map(person => <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Описание / причина</Label>
              <Textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} rows={4} />
            </div>

            <div className="space-y-2">
              <Label>Комментарий</Label>
              <Textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Файл</Label>
              <Input type="file" onChange={event => setAttachmentFile(event.target.files?.[0] || null)} />
            </div>

            <div className="space-y-3">
              <Label>Подписанты</Label>
              <div className="grid gap-2 rounded-lg border p-3 md:grid-cols-2">
                {profilesLoading ? (
                  <div className="py-3 text-sm text-muted-foreground">Загрузка подписантов...</div>
                ) : people.length === 0 ? (
                  <div className="py-3 text-sm text-muted-foreground">Подписанты не найдены.</div>
                ) : people.map(person => (
                  <label key={person.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
                    <Checkbox
                      checked={form.signerIds.includes(person.id)}
                      onCheckedChange={checked => toggleSigner(person.id, checked === true)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{person.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{person.email}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={submitCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Сохранить и отправить на подпись
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Документы ППР</CardTitle>
          <CardDescription>Статусы обновляются автоматически по решениям подписантов.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Загрузка...</div>
          ) : plans.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">ППР пока нет.</div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {plans.map((plan, index) => {
                  const cfg = statusConfig[plan.status] || statusConfig.draft;
                  const StatusIcon = cfg.icon;
                  return (
                    <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                      <Card className="cursor-pointer transition hover:bg-muted/40" onClick={() => setSelectedPlan(plan)}>
                        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <StatusIcon className="h-4 w-4 text-primary" />
                              <h3 className="truncate font-semibold">{plan.title}</h3>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Линия {plan.line} • {format(new Date(plan.scheduled_date), 'dd.MM.yyyy')} • исполнитель: {getProfileName(plan.assigned_to)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={cfg.color}>{getStatusLabel(plan.status)}</Badge>
                            <Badge variant="outline">{plan.signers.length} подписантов</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedPlan}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPlan(null);
            if (searchParams.has('pprId')) setSearchParams({}, { replace: true });
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          {selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPlan.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div><span className="text-muted-foreground">Линия:</span> <strong>Линия {selectedPlan.line}</strong></div>
                  <div><span className="text-muted-foreground">Дата:</span> <strong>{format(new Date(selectedPlan.scheduled_date), 'dd.MM.yyyy')}</strong></div>
                  <div><span className="text-muted-foreground">Исполнитель:</span> <strong>{getProfileName(selectedPlan.assigned_to)}</strong></div>
                  <div><span className="text-muted-foreground">Статус:</span> <Badge className={(statusConfig[selectedPlan.status] || statusConfig.draft).color}>{getStatusLabel(selectedPlan.status)}</Badge></div>
                  <div><span className="text-muted-foreground">Создал:</span> <strong>{getProfileName(selectedPlan.created_by)}</strong></div>
                </div>

                {selectedPlan.description && (
                  <div>
                    <Label>Описание / причина</Label>
                    <p className="mt-1 text-sm">{selectedPlan.description}</p>
                  </div>
                )}

                {selectedPlan.notes && (
                  <div>
                    <Label>Комментарий</Label>
                    <p className="mt-1 text-sm">{selectedPlan.notes}</p>
                  </div>
                )}

                {selectedPlan.attachment?.fileName && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate text-sm">{selectedPlan.attachment.fileName}</span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={api.getPPRAttachmentDownloadUrl(selectedPlan.id)}>
                        <Download className="mr-2 h-4 w-4" />
                        Скачать
                      </a>
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  <Label>Подписанты</Label>
                  <div className="grid gap-2">
                    {selectedPlan.signers.map(signer => (
                      <div key={signer.userId} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">{getProfileName(signer.userId)}</p>
                          {signer.decidedAt && <p className="text-xs text-muted-foreground">{format(new Date(signer.decidedAt), 'dd.MM.yyyy HH:mm')}</p>}
                        </div>
                        <Badge className={signerStatusClass[signer.status]}>{getSignerStatusLabel(signer.status)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {canDecide && (
                  <div className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="outline" onClick={() => decisionMutation.mutate({ planId: selectedPlan.id, decision: 'Rejected' })} disabled={decisionMutation.isPending}>
                      <XCircle className="mr-2 h-4 w-4" />
                      {t('ppr.reject')}
                    </Button>
                    <Button onClick={() => decisionMutation.mutate({ planId: selectedPlan.id, decision: 'Approved' })} disabled={decisionMutation.isPending}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t('ppr.approve')}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

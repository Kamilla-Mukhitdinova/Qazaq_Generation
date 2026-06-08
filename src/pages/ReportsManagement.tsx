import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Eye, Loader2, Bot, Calendar, Download, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const PERIOD_MONTH_PATTERN = /^\d{4}-\d{2}$/;

const getCurrentPeriodMonth = () => new Date().toISOString().slice(0, 7);

interface Report {
  id: string; title: string; content: string; period_month: string;
  author_id: string; created_at: string; updated_at: string;
}

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj[key] !== null) return obj[key] as T;
  }
  return undefined;
};

const normalizeReport = (report: any): Report => ({
  id: report.id,
  title: report.title || '',
  content: report.content || '',
  period_month: pick<string>(report, 'period_month', 'periodMonth') || '',
  author_id: pick<string>(report, 'author_id', 'authorId') || '',
  created_at: pick<string>(report, 'created_at', 'createdAt') || '',
  updated_at: pick<string>(report, 'updated_at', 'updatedAt') || '',
});

const formatReportDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, 'dd.MM.yyyy HH:mm');
};

const isValidPeriodMonth = (value: string) => PERIOD_MONTH_PATTERN.test(value);

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Ошибка генерации отчёта';

const normalizeReportRoleLabels = (content: string) => content
  .replace(/(\bРоль:\s*)agent\b/gi, '$1Инженер')
  .replace(/(\bРоль:\s*)admin\b/gi, '$1Администратор')
  .replace(/(\bРоль:\s*)manager\b/gi, '$1Менеджер')
  .replace(/(\bРоль:\s*)employee\b/gi, '$1Сотрудник')
  .replace(/(\brole:\s*)agent\b/gi, '$1Инженер')
  .replace(/(\brole:\s*)admin\b/gi, '$1Администратор')
  .replace(/(\brole:\s*)manager\b/gi, '$1Менеджер')
  .replace(/(\brole:\s*)employee\b/gi, '$1Сотрудник');

const getPeriodBounds = (periodMonth: string) => {
  const [year, month] = periodMonth.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
};

const getTicketCreatedAt = (ticket: any) => pick<string>(ticket, 'created_at', 'createdAt') || '';

const isTicketInPeriod = (ticket: any, periodMonth: string) => {
  const createdAt = getTicketCreatedAt(ticket);
  if (!createdAt) return false;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt.slice(0, 7) === periodMonth;
  const { start, end } = getPeriodBounds(periodMonth);
  return date >= start && date < end;
};

const countBy = (items: any[], key: string) => items.reduce((acc: Record<string, number>, item: any) => {
  const value = String(item?.[key] || 'не указано');
  acc[value] = (acc[value] || 0) + 1;
  return acc;
}, {});

const formatCounts = (counts: Record<string, number>) => {
  const entries = Object.entries(counts);
  return entries.length ? entries.map(([key, value]) => `- ${key}: ${value}`).join('\n') : '- Нет данных';
};

const countSlaBreachesForTickets = (slaRows: any[], tickets: any[]) => {
  const ticketIds = new Set(tickets.map((ticket: any) => ticket.id));
  return (slaRows || []).filter((sla: any) => {
    const ticketId = pick<string>(sla, 'ticket_id', 'ticketId') || '';
    return ticketIds.has(ticketId) && (
      Boolean(pick<boolean>(sla, 'breached_response', 'breachedResponse'))
      || Boolean(pick<boolean>(sla, 'breached_resolve', 'breachedResolve'))
    );
  }).length;
};

const buildLocalReport = (
  periodMonth: string,
  tickets: any[],
  slaRows: any[],
  aiError?: string,
) => {
  const slaBreaches = countSlaBreachesForTickets(slaRows, tickets);
  const resolved = tickets.filter((ticket: any) => ['resolved', 'closed'].includes(String(ticket.status))).length;
  const open = Math.max(tickets.length - resolved, 0);

  return [
    `# Отчёт за ${periodMonth}`,
    '',
    aiError ? `> AI-сервис недоступен: ${aiError}. Ниже сформирован автоматический отчёт по данным системы.` : '',
    '',
    '## Краткое резюме',
    `- Всего заявок за период: ${tickets.length}`,
    `- Завершено: ${resolved}`,
    `- Открыто или в работе: ${open}`,
    `- Нарушений SLA: ${slaBreaches}`,
    '',
    '## По статусам',
    formatCounts(countBy(tickets, 'status')),
    '',
    '## По приоритетам',
    formatCounts(countBy(tickets, 'priority')),
    '',
    '## Рекомендации',
    slaBreaches > 0
      ? '- Проверить заявки с нарушенным SLA и причины задержек реакции или решения.'
      : '- Продолжать текущий контроль SLA, критичных нарушений за период не выявлено.',
    open > 0
      ? '- Приоритизировать открытые заявки с высоким и критическим приоритетом.'
      : '- Закрытых заявок достаточно для финального анализа качества обслуживания.',
  ].filter(Boolean).join('\n');
};

const downloadBlobFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const markdownToDocxBlob = async (content: string, periodMonth: string) => {
  const paragraphs = content.split('\n').map((rawLine) => {
    const line = rawLine.trim();

    if (!line) return new Paragraph({ children: [] });

    if (line.startsWith('# ')) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 240 },
        children: [new TextRun({ text: line.replace(/^#\s+/, ''), bold: true })],
      });
    }

    if (line.startsWith('## ')) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 180, after: 120 },
        children: [new TextRun({ text: line.replace(/^##\s+/, ''), bold: true })],
      });
    }

    if (line.startsWith('- ')) {
      return new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [new TextRun(line.replace(/^-\s+/, ''))],
      });
    }

    if (line.startsWith('> ')) {
      return new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: line.replace(/^>\s+/, ''), italics: true })],
      });
    }

    return new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun(line)],
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          spacing: { after: 240 },
          children: [new TextRun({ text: `AI отчёт ${periodMonth}`, bold: true })],
        }),
        ...paragraphs,
      ],
    }],
  });

  return Packer.toBlob(doc);
};

export default function ReportsManagement() {
  const { user, role, profile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [newReport, setNewReport] = useState({ title: '', period_month: getCurrentPeriodMonth(), content: '' });
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [fileGenerating, setFileGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  const visibleIds = reports.map(report => report.id);
  const selectedCount = selectedIds.length;
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const data = await api.getReports();
      setReports((data || []).map(normalizeReport));
      setSelectedIds(prev => prev.filter(id => (data || []).some((report: any) => report.id === id)));
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const createReportContent = async () => {
    if (!isValidPeriodMonth(newReport.period_month)) {
      throw new Error('Выберите период в формате YYYY-MM');
    }

    try {
      const [ticketsRes, slaData] = await Promise.all([api.getTickets(), api.getTicketSla()]);
      const tickets = (ticketsRes.data || []).filter((ticket: any) => isTicketInPeriod(ticket, newReport.period_month));

      const ticketData = {
        totalTickets: tickets.length,
        byStatus: countBy(tickets, 'status'),
        byPriority: countBy(tickets, 'priority'),
        slaBreaches: countSlaBreachesForTickets(slaData || [], tickets),
        period: newReport.period_month,
      };

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 45000);
      const response = await fetch(`${API_BASE}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.getToken()}` },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Сформируй месячный отчёт service desk за ${newReport.period_month}: итоги, статусы, приоритеты, SLA, риски и рекомендации.` }],
          type: 'report_generation',
          ticketData,
          userContext: {
            name: profile?.name,
            email: profile?.email,
            role,
            department: '',
          },
        }),
      }).finally(() => window.clearTimeout(timeoutId));

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `AI response error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try { const parsed = JSON.parse(line.slice(6)); const delta = parsed.choices?.[0]?.delta?.content; if (delta) content += delta; } catch {}
            }
          }
        }
      }

      if (!content.trim()) {
        throw new Error('AI вернул пустой отчёт');
      }

      return { content: normalizeReportRoleLabels(content.trim()), usedFallback: false, errorMessage: '' };
    } catch (error) {
      console.error('Error generating report:', error);
      try {
        const [ticketsRes, slaData] = await Promise.all([api.getTickets(), api.getTicketSla()]);
        const tickets = (ticketsRes.data || []).filter((ticket: any) => isTicketInPeriod(ticket, newReport.period_month));
        return {
          content: normalizeReportRoleLabels(buildLocalReport(newReport.period_month, tickets, slaData || [], getErrorMessage(error))),
          usedFallback: true,
          errorMessage: getErrorMessage(error),
        };
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
  };

  const generateAIReport = async () => {
    setAiGenerating(true);
    try {
      const result = await createReportContent();
      setNewReport(prev => ({ ...prev, content: result.content }));
      if (result.usedFallback) {
        toast({ title: 'Отчёт сформирован без AI', description: result.errorMessage, variant: 'destructive' });
      } else {
        toast({ title: t('common.success'), description: t('reportsManage.aiReady') });
      }
    } catch (error) {
      toast({ title: t('common.error'), description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveReport = async () => {
    if (!newReport.title.trim()) {
      toast({ title: t('common.error'), description: 'Укажите название отчета', variant: 'destructive' });
      return;
    }
    if (!isValidPeriodMonth(newReport.period_month)) {
      toast({ title: t('common.error'), description: 'Выберите период в формате YYYY-MM', variant: 'destructive' });
      return;
    }
    if (!newReport.content.trim()) {
      toast({ title: t('common.error'), description: 'Заполните содержание отчета или сгенерируйте его через AI', variant: 'destructive' });
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      await api.createReport({ title: newReport.title.trim(), periodMonth: newReport.period_month, content: normalizeReportRoleLabels(newReport.content.trim()) });
      toast({ title: t('common.success'), description: t('reportsManage.saved') });
      setNewReport({ title: '', period_month: getCurrentPeriodMonth(), content: '' });
      setAddOpen(false);
      fetchReports();
    } catch (error) {
      console.error('Error saving report:', error);
      toast({ title: t('common.error'), description: t('common.error'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openEditReport = (report: Report) => {
    setEditingReport({ ...report });
  };

  const handleUpdateReport = async () => {
    if (!editingReport) return;
    if (!editingReport.title.trim()) {
      toast({ title: t('common.error'), description: 'Укажите название отчета', variant: 'destructive' });
      return;
    }
    if (!isValidPeriodMonth(editingReport.period_month)) {
      toast({ title: t('common.error'), description: 'Выберите период в формате YYYY-MM', variant: 'destructive' });
      return;
    }
    if (!editingReport.content.trim()) {
      toast({ title: t('common.error'), description: 'Заполните содержание отчета', variant: 'destructive' });
      return;
    }

    setUpdating(true);
    try {
      const updated = await api.updateReport(editingReport.id, {
        title: editingReport.title.trim(),
        periodMonth: editingReport.period_month,
        content: normalizeReportRoleLabels(editingReport.content.trim()),
      });
      const normalized = normalizeReport(updated);
      setReports(prev => prev.map(report => report.id === normalized.id ? normalized : report));
      setEditingReport(null);
      toast({ title: t('common.success'), description: 'Отчёт обновлён' });
    } catch (error) {
      toast({ title: t('common.error'), description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const downloadAIReportFile = async () => {
    setFileGenerating(true);
    try {
      const result = newReport.content.trim()
        ? { content: normalizeReportRoleLabels(newReport.content.trim()), usedFallback: false, errorMessage: '' }
        : await createReportContent();

      setNewReport(prev => ({ ...prev, content: result.content }));
      const blob = await markdownToDocxBlob(result.content, newReport.period_month);
      downloadBlobFile(blob, `ai-report-${newReport.period_month}.docx`);
      toast({
        title: t('common.success'),
        description: result.usedFallback ? 'Отчёт Word сохранён без AI' : 'AI отчёт Word сохранён',
      });
      if (result.usedFallback) {
        toast({ title: 'AI недоступен', description: result.errorMessage, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: t('common.error'), description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setFileGenerating(false);
    }
  };

  const toggleReportSelection = (reportId: string, checked: boolean) => {
    setSelectedIds(prev => checked
      ? Array.from(new Set([...prev, reportId]))
      : prev.filter(id => id !== reportId)
    );
  };

  const toggleVisibleSelection = (checked: boolean) => {
    setSelectedIds(prev => {
      if (!checked) return prev.filter(id => !visibleIds.includes(id));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleDeleteReport = async (report: Report) => {
    const confirmed = window.confirm(`Удалить отчёт "${report.title}"? Это действие нельзя отменить.`);
    if (!confirmed) return;

    setDeletingId(report.id);
    try {
      await api.deleteReport(report.id);
      setReports(prev => prev.filter(item => item.id !== report.id));
      setSelectedIds(prev => prev.filter(id => id !== report.id));
      toast({ title: t('common.success'), description: 'Отчёт удалён' });
    } catch (error) {
      toast({ title: t('common.error'), description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(`Удалить выбранные отчёты (${selectedIds.length})? Это действие нельзя отменить.`);
    if (!confirmed) return;

    setBulkDeleting(true);
    try {
      await api.deleteReports(selectedIds);
      setReports(prev => prev.filter(report => !selectedIds.includes(report.id)));
      setSelectedIds([]);
      toast({ title: t('common.success'), description: 'Выбранные отчёты удалены' });
    } catch (error) {
      toast({ title: t('common.error'), description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setBulkDeleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />{t('reportsManage.title')}</h1>
          <p className="text-muted-foreground">{t('reportsManage.subtitle')}</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('reportsManage.newReport')}</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t('reportsManage.createTitle')}</DialogTitle><DialogDescription>{t('reportsManage.createDesc')}</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('reportsManage.reportTitle')}</Label><Input value={newReport.title} onChange={(e) => setNewReport({ ...newReport, title: e.target.value })} placeholder={t('reportsManage.titlePlaceholder')} /></div>
                <div className="space-y-2"><Label>{t('reportsManage.period')}</Label><Input type="month" value={newReport.period_month} onChange={(e) => setNewReport({ ...newReport, period_month: e.target.value })} /></div>
              </div>
              <Button variant="outline" onClick={generateAIReport} disabled={aiGenerating || fileGenerating || !isValidPeriodMonth(newReport.period_month)}>
                {aiGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}{t('reportsManage.generateAI')}
              </Button>
              <Button variant="outline" onClick={downloadAIReportFile} disabled={aiGenerating || fileGenerating || !isValidPeriodMonth(newReport.period_month)}>
                {fileGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}AI отчёт Word
              </Button>
              <div className="space-y-2"><Label>{t('reportsManage.content')}</Label><Textarea value={newReport.content} onChange={(e) => setNewReport({ ...newReport, content: e.target.value })} placeholder={t('reportsManage.contentPlaceholder')} className="min-h-[300px] font-mono text-sm" /></div>
            </div>
            <DialogFooter><Button onClick={handleSaveReport} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.save')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t('reportsManage.allReports')}</CardTitle>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={selectedCount === 0 || bulkDeleting}>
            {bulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Удалить выбранные{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead className="w-[48px]"><Checkbox checked={allVisibleSelected} aria-label="Выбрать все отчёты" onCheckedChange={(checked) => toggleVisibleSelection(checked === true)} /></TableHead><TableHead>{t('reportsManage.reportTitle')}</TableHead><TableHead>Период</TableHead><TableHead>{t('common.date')}</TableHead><TableHead className="w-[144px] text-right">Действия</TableHead></TableRow></TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell><Checkbox checked={selectedIds.includes(report.id)} aria-label={`Выбрать отчёт ${report.title}`} onCheckedChange={(checked) => toggleReportSelection(report.id, checked === true)} /></TableCell>
                  <TableCell className="font-medium">{report.title}</TableCell>
                  <TableCell><Badge variant="outline"><Calendar className="h-3 w-3 mr-1" />{report.period_month}</Badge></TableCell>
                  <TableCell>{formatReportDate(report.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setViewingReport(report)} aria-label="Открыть отчёт"><Eye className="h-4 w-4" /></Button></DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{report.title}</DialogTitle><DialogDescription>{t('reportsManage.period')}: {report.period_month}</DialogDescription></DialogHeader>
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{report.content}</div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => openEditReport(report)} aria-label="Редактировать отчёт">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeleteReport(report)} disabled={deletingId === report.id} aria-label="Удалить отчёт">
                      {deletingId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t('reportsManage.noReports')}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingReport} onOpenChange={(open) => !open && setEditingReport(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать отчёт</DialogTitle>
            <DialogDescription>Измените название, период или содержание отчёта</DialogDescription>
          </DialogHeader>
          {editingReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('reportsManage.reportTitle')}</Label>
                  <Input value={editingReport.title} onChange={(e) => setEditingReport({ ...editingReport, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Период</Label>
                  <Input type="month" value={editingReport.period_month} onChange={(e) => setEditingReport({ ...editingReport, period_month: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('reportsManage.content')}</Label>
                <Textarea value={editingReport.content} onChange={(e) => setEditingReport({ ...editingReport, content: e.target.value })} className="min-h-[320px] font-mono text-sm" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReport(null)}>Отмена</Button>
            <Button onClick={handleUpdateReport} disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

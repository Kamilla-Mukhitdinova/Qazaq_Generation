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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Eye, Loader2, Bot, Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Report {
  id: string; title: string; content: string; period_month: string;
  author_id: string; created_at: string; updated_at: string;
}

export default function ReportsManagement() {
  const { user, role } = useAuth();
  const { t, tf } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [newReport, setNewReport] = useState({ title: '', period_month: '', content: '' });
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const data = await api.getReports();
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIReport = async () => {
    setGenerating(true);
    try {
      const [ticketsRes, slaData] = await Promise.all([api.getTickets(), api.getTicketSla()]);
      const tickets = (ticketsRes.data || []).filter((t: any) => t.created_at >= `${newReport.period_month}-01`);

      const ticketData = {
        totalTickets: tickets.length,
        byStatus: tickets.reduce((acc: any, t: any) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {}),
        byPriority: tickets.reduce((acc: any, t: any) => { acc[t.priority] = (acc[t.priority] || 0) + 1; return acc; }, {}),
        slaBreaches: (slaData || []).filter((s: any) => s.breached_response || s.breached_resolve).length,
        period: newReport.period_month,
      };

      const response = await fetch(`${API_BASE}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api.getToken()}` },
        body: JSON.stringify({
          messages: [{ role: 'user', content: tf('reportsManage.aiPrompt', { period: newReport.period_month }) }],
          type: 'report_generation',
          ticketData,
        }),
      });

      if (!response.ok) throw new Error('AI response error');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let content = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try { const parsed = JSON.parse(line.slice(6)); const delta = parsed.choices?.[0]?.delta?.content; if (delta) content += delta; } catch {}
            }
          }
        }
      }

      setNewReport(prev => ({ ...prev, content }));
      toast({ title: t('common.success'), description: t('reportsManage.aiReady') });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({ title: t('common.error'), description: t('common.error'), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveReport = async () => {
    if (!newReport.title || !newReport.period_month || !newReport.content || !user) return;
    setSaving(true);
    try {
      await api.createReport({ title: newReport.title, periodMonth: newReport.period_month, content: newReport.content });
      toast({ title: t('common.success'), description: t('reportsManage.saved') });
      setNewReport({ title: '', period_month: '', content: '' });
      setAddOpen(false);
      fetchReports();
    } catch (error) {
      console.error('Error saving report:', error);
      toast({ title: t('common.error'), description: t('common.error'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const downloadAIReportFile = async () => {
    if (!newReport.period_month) return;
    setGenerating(true);
    try {
      const blob = await api.downloadAIReportFile(newReport.period_month);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-report-${newReport.period_month}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: t('common.success'), description: 'AI отчёт сохранён в файл' });
      fetchReports();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message || t('common.error'), variant: 'destructive' });
    } finally {
      setGenerating(false);
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
                <div className="space-y-2"><Label>{t('reportsManage.period')}</Label><Input value={newReport.period_month} onChange={(e) => setNewReport({ ...newReport, period_month: e.target.value })} placeholder="2026-02" /></div>
              </div>
              <Button variant="outline" onClick={generateAIReport} disabled={generating || !newReport.period_month}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}{t('reportsManage.generateAI')}
              </Button>
              <Button variant="outline" onClick={downloadAIReportFile} disabled={generating || !newReport.period_month}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}AI отчёт файлом
              </Button>
              <div className="space-y-2"><Label>{t('reportsManage.content')}</Label><Textarea value={newReport.content} onChange={(e) => setNewReport({ ...newReport, content: e.target.value })} placeholder={t('reportsManage.contentPlaceholder')} className="min-h-[300px] font-mono text-sm" /></div>
            </div>
            <DialogFooter><Button onClick={handleSaveReport} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.save')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('reportsManage.allReports')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>{t('reportsManage.reportTitle')}</TableHead><TableHead>{t('reportsManage.period')}</TableHead><TableHead>{t('common.date')}</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.title}</TableCell>
                  <TableCell><Badge variant="outline"><Calendar className="h-3 w-3 mr-1" />{report.period_month}</Badge></TableCell>
                  <TableCell>{format(new Date(report.created_at), 'dd.MM.yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setViewingReport(report)}><Eye className="h-4 w-4" /></Button></DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>{report.title}</DialogTitle><DialogDescription>{t('reportsManage.period')}: {report.period_month}</DialogDescription></DialogHeader>
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{report.content}</div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">{t('reportsManage.noReports')}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

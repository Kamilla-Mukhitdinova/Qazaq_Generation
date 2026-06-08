import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { getDisplayTicketTitle } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Send, User, Calendar, CalendarClock, Tag, Paperclip, Download, Trash2, FileText, Bot, CircleDot, UserCheck, PlayCircle, CheckCircle2, Archive, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import TicketKBLinks from '@/components/ticket/TicketKBLinks';
import ReactMarkdown from 'react-markdown';

type TicketStatus = 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type LanguageCode = 'kk' | 'ru' | 'en';

interface TicketDetailData {
  id: string; title: string; description: string | null;
  status: TicketStatus; priority: TicketPriority;
  created_at: string; updated_at: string;
  requester_id: string; assignee_id: string | null; category_id: string | null;
  requester_name?: string; assignee_name?: string; category_name?: string;
  is_planned?: boolean;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  planning_note?: string | null;
}

interface Comment {
  id: string; body: string; created_at: string; author_id: string; is_internal: boolean; author_name?: string;
}

interface Attachment {
  id: string; filename: string; mime_type: string | null; size_bytes: number | null;
  created_at: string; uploaded_by: string;
}

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
};

const getUserId = (profile: any) => pick<string>(profile, 'user_id', 'userId') || '';
const getProfileName = (profile: any) => pick<string>(profile, 'name') || '';

const statusDescriptions: Record<TicketStatus, Record<LanguageCode, string>> = {
  new: {
    kk: 'Өтінім тіркелді, әлі жұмысқа алынбады',
    ru: 'Заявка создана, еще не взята в работу',
    en: 'Request is created and not started yet',
  },
  assigned: {
    kk: 'Орындаушы тағайындалды',
    ru: 'Есть ответственный исполнитель',
    en: 'An assignee is responsible for it',
  },
  in_progress: {
    kk: 'Орындаушы мәселені шешіп жатыр',
    ru: 'Исполнитель уже работает над заявкой',
    en: 'The assignee is working on it',
  },
  resolved: {
    kk: 'Шешім ұсынылды, жабуды күтіп тұр',
    ru: 'Решение найдено, ожидает подтверждения',
    en: 'Solution is provided and awaiting confirmation',
  },
  closed: {
    kk: 'Өтінім толық аяқталды',
    ru: 'Заявка полностью завершена',
    en: 'Request is fully closed',
  },
  reopened: {
    kk: 'Мәселе қайта ашылды',
    ru: 'Заявка вернулась в работу',
    en: 'Request was reopened',
  },
};

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [agents, setAgents] = useState<{ user_id: string; name: string }[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const isAgent = role === 'agent' || role === 'admin' || role === 'manager';

  const normalizeComment = (comment: any, authorName?: string): Comment => {
    const authorId = pick<string>(comment, 'author_id', 'authorId') || '';
    return {
      id: comment.id,
      body: comment.body || '',
      created_at: pick<string>(comment, 'created_at', 'createdAt') || new Date().toISOString(),
      author_id: authorId,
      is_internal: !!pick<boolean>(comment, 'is_internal', 'isInternal'),
      author_name: authorName || t('ticket.detail.unknown'),
    };
  };

  useEffect(() => {
    if (id) { fetchTicket(); fetchComments(); fetchAttachments(); if (isAgent) fetchAgents(); }
  }, [id]);

  const fetchTicket = async () => {
    try {
      const data = await api.getTicket(id!);
      const [profiles, categories] = await Promise.all([api.getProfiles(), api.getCategories()]);
      const profileMap = new Map((profiles || []).map((p: any) => [getUserId(p), getProfileName(p)]));
      const requesterId = pick<string>(data, 'requester_id', 'requesterId') || '';
      const assigneeId = pick<string | null>(data, 'assignee_id', 'assigneeId') || null;
      const categoryId = pick<string | null>(data, 'category_id', 'categoryId') || null;
      const createdAt = pick<string>(data, 'created_at', 'createdAt') || new Date().toISOString();
      const updatedAt = pick<string>(data, 'updated_at', 'updatedAt') || createdAt;
      const plannedStartAt = pick<string | null>(data, 'planned_start_at', 'plannedStartAt') || null;
      const plannedEndAt = pick<string | null>(data, 'planned_end_at', 'plannedEndAt') || null;
      const category = (categories || []).find((c: any) => c.id === categoryId);
      const requesterName = profileMap.get(requesterId) || getProfileName(data.requester) || t('ticket.detail.unknown');
      const assigneeName = assigneeId
        ? profileMap.get(assigneeId) || getProfileName(data.assignee) || t('ticket.detail.unknown')
        : undefined;
      setTicket({
        id: data.id,
        title: data.title,
        description: data.description ?? null,
        status: data.status,
        priority: data.priority,
        created_at: createdAt,
        updated_at: updatedAt,
        requester_id: requesterId,
        assignee_id: assigneeId,
        category_id: categoryId,
        requester_name: requesterName,
        assignee_name: assigneeName,
        category_name: category?.name,
        is_planned: Boolean(pick<boolean>(data, 'is_planned', 'isPlanned')),
        planned_start_at: plannedStartAt,
        planned_end_at: plannedEndAt,
        planning_note: pick<string | null>(data, 'planning_note', 'planningNote') || null,
      });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast({ title: t('common.error'), description: t('ticket.detail.notFound'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await api.getComments(id!);
      if (data && data.length > 0) {
        const profiles = await api.getProfiles();
        const profileMap = new Map((profiles || []).map((p: any) => [getUserId(p), getProfileName(p)]));
        setComments(data.map((c: any) => {
          const authorId = pick<string>(c, 'author_id', 'authorId') || '';
          return normalizeComment(c, profileMap.get(authorId) || t('ticket.detail.unknown'));
        }));
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchAttachments = async () => {
    try {
      const data = await api.getAttachments(id!);
      setAttachments((data || []).map((a: any) => ({
        id: a.id,
        filename: a.filename,
        mime_type: pick<string | null>(a, 'mime_type', 'mimeType') || null,
        size_bytes: pick<number | null>(a, 'size_bytes', 'sizeBytes') || null,
        created_at: pick<string>(a, 'created_at', 'createdAt') || new Date().toISOString(),
        uploaded_by: pick<string>(a, 'uploaded_by', 'uploadedBy') || '',
      })));
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const [roles, profiles] = await Promise.all([api.getUserRoles(), api.getProfiles()]);
      const agentRoleIds = (roles || [])
        .filter((r: any) => ['agent', 'admin', 'manager'].includes(r.role))
        .map((r: any) => getUserId(r));
      setAgents((profiles || [])
        .map((p: any) => ({ user_id: getUserId(p), name: getProfileName(p) }))
        .filter((p) => p.user_id && agentRoleIds.includes(p.user_id)));
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    try {
      await api.updateTicket(ticket.id, { status: newStatus });
      setTicket({ ...ticket, status: newStatus as TicketStatus });
      toast({ title: t('common.success'), description: t('ticket.detail.status') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    if (!ticket) return;
    try {
      const updates: any = { assigneeId: assigneeId === 'unassigned' ? null : assigneeId };
      if (assigneeId !== 'unassigned' && ticket.status === 'new') updates.status = 'assigned';
      await api.updateTicket(ticket.id, updates);
      const assignee = agents.find(a => a.user_id === assigneeId);
      setTicket({
        ...ticket,
        assignee_id: assigneeId === 'unassigned' ? null : assigneeId,
        assignee_name: assignee?.name,
        status: assigneeId !== 'unassigned' && ticket.status === 'new' ? 'assigned' : ticket.status,
      });
      toast({ title: t('common.success'), description: t('ticket.detail.assigned') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      const data = await api.addComment(id!, newComment, false);
      const authorName = user.name || user.email?.split('@')[0] || t('common.you');
      setComments((current) => [...current, normalizeComment(data, authorName)]);
      setNewComment('');
      toast({ title: t('common.success'), description: t('ticket.detail.comments') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      await api.uploadAttachment(id, file);
      await fetchAttachments();
      toast({ title: t('common.success'), description: t('ticket.detail.uploadFile') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!id) return;
    try {
      await api.deleteAttachment(id, attachmentId);
      setAttachments(attachments.filter(a => a.id !== attachmentId));
      toast({ title: t('common.success'), description: t('common.delete') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleAnalyzeTicket = async () => {
    if (!ticket) return;
    setAiAnalyzing(true);
    setAiDialogOpen(true);
    try {
      const result = await api.analyzeTicketWithAI(ticket.id);
      setAiAnalysis(result.analysis);
    } catch (error: any) {
      setAiAnalysis(`${t('common.error')}: ${error.message || ''}`);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const statusColors: Record<string, string> = {
    new: 'bg-blue-500/10 text-blue-500', assigned: 'bg-yellow-500/10 text-yellow-500',
    in_progress: 'bg-purple-500/10 text-purple-500', resolved: 'bg-green-500/10 text-green-500',
    closed: 'bg-muted text-muted-foreground', reopened: 'bg-red-500/10 text-red-500',
  };
  const statusIndicatorColors: Record<TicketStatus, string> = {
    new: 'bg-blue-500 text-blue-500',
    assigned: 'bg-amber-500 text-amber-600',
    in_progress: 'bg-violet-500 text-violet-600',
    resolved: 'bg-emerald-500 text-emerald-600',
    closed: 'bg-slate-500 text-slate-600',
    reopened: 'bg-rose-500 text-rose-600',
  };
  const statusIcons = {
    new: CircleDot,
    assigned: UserCheck,
    in_progress: PlayCircle,
    resolved: CheckCircle2,
    closed: Archive,
    reopened: RotateCcw,
  } satisfies Record<TicketStatus, typeof CircleDot>;
  const priorityColors: Record<string, string> = {
    low: 'bg-slate-500/10 text-slate-500', medium: 'bg-blue-500/10 text-blue-500',
    high: 'bg-orange-500/10 text-orange-500', critical: 'bg-red-500/10 text-red-500',
  };

  const statusKeys: Record<string, string> = {
    new: 'ticket.status.new', assigned: 'ticket.status.assigned', in_progress: 'ticket.status.inProgress',
    resolved: 'ticket.status.resolved', closed: 'ticket.status.closed', reopened: 'ticket.status.reopened',
  };
  const statusFlow: TicketStatus[] = ['new', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened'];
  const priorityKeys: Record<string, string> = {
    low: 'ticket.priority.low', medium: 'ticket.priority.medium', high: 'ticket.priority.high', critical: 'ticket.priority.critical',
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!ticket) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">{t('ticket.detail.notFound')}</p>
      <Button className="mt-4" onClick={() => navigate('/tickets')}>{t('ticket.detail.backToTickets')}</Button>
    </div>
  );

  const CurrentStatusIcon = statusIcons[ticket.status];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tickets')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="secondary" className={statusColors[ticket.status]}>{t(statusKeys[ticket.status])}</Badge>
            <Badge variant="secondary" className={priorityColors[ticket.priority]}>{t(priorityKeys[ticket.priority])}</Badge>
          </div>
          <h1 className="text-2xl font-bold">{getDisplayTicketTitle(ticket.title)}</h1>
        </div>
        <Button variant="outline" onClick={handleAnalyzeTicket} disabled={aiAnalyzing}>
          {aiAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
          AI анализ
        </Button>
      </div>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>AI анализ тикета</DialogTitle></DialogHeader>
          {aiAnalyzing ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>{t('ticket.detail.description')}</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground whitespace-pre-wrap">{ticket.description || t('ticket.detail.noDescription')}</p></CardContent>
          </Card>

          {(ticket.is_planned || ticket.planned_start_at) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5" />
                  {t('ticket.detail.planning')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.planned_start_at && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('ticket.detail.plannedStart')}</p>
                      <p className="text-sm font-medium">{format(new Date(ticket.planned_start_at), 'dd.MM.yyyy HH:mm')}</p>
                    </div>
                    {ticket.planned_end_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t('ticket.detail.plannedEnd')}</p>
                        <p className="text-sm font-medium">{format(new Date(ticket.planned_end_at), 'dd.MM.yyyy HH:mm')}</p>
                      </div>
                    )}
                  </div>
                )}
                {ticket.planning_note && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('ticket.detail.planningNote')}</p>
                    <p className="text-sm whitespace-pre-wrap">{ticket.planning_note}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5" />{t('ticket.detail.attachments')}</CardTitle>
                <div>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Paperclip className="h-4 w-4 mr-2" />}
                    {t('ticket.detail.uploadFile')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">{t('ticket.detail.noAttachments')}</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{att.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(att.size_bytes)} · {format(new Date(att.created_at), 'dd.MM.yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={api.getAttachmentDownloadUrl(id!, att.id)} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        {(att.uploaded_by === user?.id || isAgent) && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteAttachment(att.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('ticket.detail.comments')}</CardTitle><CardDescription>{t('ticket.detail.commentsDiscussion')}</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">{t('ticket.detail.noComments')}</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className={`p-4 rounded-lg ${comment.author_id === user?.id ? 'bg-primary/5 ml-8' : 'bg-muted mr-8'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{comment.author_name}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(comment.created_at), 'dd.MM.yyyy HH:mm')}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  ))}
                </div>
              )}
              <Separator />
              <div className="space-y-3">
                <Textarea placeholder={t('ticket.detail.commentPlaceholder')} value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={3} disabled={submitting} />
                <Button onClick={handleAddComment} disabled={!newComment.trim() || submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}{t('ticket.detail.send')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <TicketKBLinks ticketId={ticket.id} />
          <Card>
            <CardHeader><CardTitle>{t('ticket.detail.details')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{t('ticket.detail.requester')}</p><p className="text-sm font-medium">{ticket.requester_name}</p></div></div>
              <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{t('ticket.detail.createdDate')}</p><p className="text-sm font-medium">{format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm')}</p></div></div>
              {ticket.category_name && <div className="flex items-center gap-3"><Tag className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{t('ticket.form.category')}</p><p className="text-sm font-medium">{ticket.category_name}</p></div></div>}
            </CardContent>
          </Card>

          {isAgent && (
            <Card>
              <CardHeader><CardTitle>{t('ticket.detail.management')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('ticket.detail.status')}</label>
                  <Select value={ticket.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-auto min-h-12 py-2">
                      <div className="flex min-w-0 items-center gap-3 text-left">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${statusColors[ticket.status]}`}>
                          <CurrentStatusIcon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{t(statusKeys[ticket.status])}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {statusDescriptions[ticket.status][language]}
                          </span>
                        </span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
                      {statusFlow.map((status) => {
                        const StatusIcon = statusIcons[status];
                        return (
                          <SelectItem key={status} value={status} className="py-3">
                            <div className="flex items-center gap-3">
                              <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusIndicatorColors[status].split(' ')[0]}`} />
                              <StatusIcon className={`h-4 w-4 shrink-0 ${statusIndicatorColors[status].split(' ')[1]}`} />
                              <span className="min-w-0">
                                <span className="block font-medium leading-none">{t(statusKeys[status])}</span>
                                <span className="mt-1 block whitespace-normal text-xs leading-snug text-muted-foreground">
                                  {statusDescriptions[status][language]}
                                </span>
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('ticket.detail.assigned')}</label>
                  <Select value={ticket.assignee_id || 'unassigned'} onValueChange={handleAssigneeChange}>
                    <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">{t('ticket.detail.unassigned')}</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.user_id} value={agent.user_id}>{agent.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

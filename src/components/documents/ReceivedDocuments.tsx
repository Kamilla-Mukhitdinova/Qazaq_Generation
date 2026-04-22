import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, Inbox, FileText, Table2, Mail, MailOpen, Clock, Trash2, Eye } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import DocumentPreviewDialog from './DocumentPreviewDialog';

interface SharedDoc {
  id: string;
  sender_id: string;
  recipient_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  sender_email?: string;
  recipient_name?: string;
  recipient_email?: string;
}

export default function ReceivedDocuments() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [received, setReceived] = useState<SharedDoc[]>([]);
  const [sent, setSent] = useState<SharedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('received');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewDoc, setPreviewDoc] = useState<SharedDoc | null>(null);

  const openPreview = async (doc: SharedDoc) => {
    if (!doc.is_read && doc.recipient_id === user?.id) {
      try { await api.markDocumentRead(doc.id); } catch {}
      setReceived(prev => prev.map(d => d.id === doc.id ? { ...d, is_read: true } : d));
    }
    try {
      const data = await api.downloadDocument(doc.id);
      setPreviewBlob(data);
      setPreviewDoc(doc);
      setPreviewOpen(true);
    } catch {
      toast.error(t('docs.downloadError'));
    }
  };

  const fetchDocs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [recvData, sentData] = await Promise.all([
        api.getReceivedDocuments(),
        api.getSentDocuments(),
      ]);
      setReceived(recvData || []);
      setSent(sentData || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [user]);

  const downloadDoc = async (doc: SharedDoc) => {
    if (!doc.is_read && doc.recipient_id === user?.id) {
      try { await api.markDocumentRead(doc.id); } catch {}
      setReceived(prev => prev.map(d => d.id === doc.id ? { ...d, is_read: true } : d));
    }
    try {
      const data = await api.downloadDocument(doc.id);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('docs.downloaded'));
    } catch {
      toast.error(t('docs.downloadError'));
    }
  };

  const deleteDoc = async (doc: SharedDoc, isSent: boolean) => {
    if (!confirm(t('docs.confirmDelete'))) return;
    try {
      await api.deleteDocument(doc.id);
      if (isSent) {
        setSent(prev => prev.filter(d => d.id !== doc.id));
      } else {
        setReceived(prev => prev.filter(d => d.id !== doc.id));
      }
      toast.success(t('docs.docDeleted'));
    } catch {
      toast.error(t('docs.deleteError'));
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const unreadCount = received.filter(d => !d.is_read).length;

  const DocCard = ({ doc, isSent }: { doc: SharedDoc; isSent: boolean }) => (
    <div className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
      !isSent && !doc.is_read ? 'bg-primary/5 border-primary/20' : 'bg-card'
    }`}>
      <div className="shrink-0 mt-1">
        {doc.file_type === 'xlsx' ? (
          <Table2 className="h-8 w-8 text-green-600" />
        ) : (
          <FileText className="h-8 w-8 text-blue-600" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{doc.file_name}</span>
          {!isSent && !doc.is_read && (
            <Badge variant="default" className="text-xs">{t('docs.new')}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px] bg-muted">
              {(isSent ? doc.recipient_name : doc.sender_name)?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>
            {isSent ? `${t('docs.to')}: ${doc.recipient_name}` : `${t('docs.from')}: ${doc.sender_name}`}
          </span>
          <span>·</span>
          <Clock className="h-3 w-3" />
          <span>{format(new Date(doc.created_at), 'dd.MM.yyyy HH:mm')}</span>
          <span>·</span>
          <span>{formatSize(doc.file_size)}</span>
        </div>
        {doc.message && (
          <p className="text-sm text-muted-foreground italic">"{doc.message}"</p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="outline" size="sm" onClick={() => openPreview(doc)} className="gap-1">
          <Eye className="h-4 w-4" />
          {t('docs.preview')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadDoc(doc)} className="gap-1">
          <Download className="h-4 w-4" />
          {t('docs.download')}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteDoc(doc, isSent)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          {t('docs.sharedDocs')}
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="received" className="gap-1">
              <Mail className="h-4 w-4" />
              {t('docs.received')} {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-1">
              <MailOpen className="h-4 w-4" />
              {t('docs.sent')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('docs.loading')}</p>
            ) : received.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('docs.noDocsReceived')}</p>
            ) : (
              received.map(doc => <DocCard key={doc.id} doc={doc} isSent={false} />)
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('docs.loading')}</p>
            ) : sent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('docs.noDocsSent')}</p>
            ) : (
              sent.map(doc => <DocCard key={doc.id} doc={doc} isSent={true} />)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        fileBlob={previewBlob}
        fileName={previewDoc?.file_name || ''}
        fileType={previewDoc?.file_type || ''}
      />
    </Card>
  );
}

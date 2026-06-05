import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send, Search, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SendDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileBlob: Blob | null;
  fileName: string;
  fileType: 'docx' | 'xlsx';
}

const getProfileUserId = (profile: any) => profile?.user_id || profile?.userId;

export default function SendDocumentDialog({ open, onOpenChange, fileBlob, fileName, fileType }: SendDocumentDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchUsers = async () => {
      try {
        const data = await api.getProfiles();
        setUsers((data || []).filter((p: any) => {
          const profileUserId = getProfileUserId(p);
          return profileUserId && profileUserId !== user?.id;
        }));
      } catch { /* ignore */ }
    };
    fetchUsers();
  }, [open, user?.id]);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = async () => {
    const recipientId = getProfileUserId(selectedUser);
    if (!recipientId || !fileBlob || !user) return;
    setSending(true);

    try {
      await api.sendDocument(recipientId, fileName, fileType, fileBlob, message || undefined);
      toast.success(t('docs.sentSuccess'));
      window.dispatchEvent(new CustomEvent('documents-changed'));
      onOpenChange(false);
      setSelectedUser(null);
      setMessage('');
    } catch (err: any) {
      toast.error(err.message || t('docs.sendError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t('docs.sendDocument')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {t('docs.file')}: <strong>{fileName}.{fileType}</strong>
          </div>

          {/* User search */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('docs.selectRecipient')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('docs.searchUsers')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-40 border rounded-lg">
              <div className="p-1">
                {filtered.map((u) => (
                  <button
                    key={getProfileUserId(u)}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors ${
                      getProfileUserId(selectedUser) === getProfileUserId(u)
                        ? 'bg-primary/10 ring-1 ring-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {u.name?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('docs.noUsersFound')}</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('docs.messageOptional')}</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('docs.enterMessage')}
              rows={2}
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={!getProfileUserId(selectedUser) || sending}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            {sending ? t('docs.sending') : t('docs.sendTo')} {selectedUser?.name || ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

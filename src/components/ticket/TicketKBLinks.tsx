import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Link2, Plus, Search, Trash2, ExternalLink, Loader2 } from 'lucide-react';

interface LinkedArticle {
  id: string;
  article_id: string;
  title: string;
  visibility: string;
}

interface SearchArticle {
  id: string;
  title: string;
  short_description: string | null;
  visibility: string;
}

export default function TicketKBLinks({ ticketId }: { ticketId: string }) {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [links, setLinks] = useState<LinkedArticle[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchArticle[]>([]);
  const [searching, setSearching] = useState(false);

  const isStaff = role === 'agent' || role === 'admin' || role === 'manager';

  useEffect(() => {
    fetchLinks();
  }, [ticketId]);

  const fetchLinks = async () => {
    try {
      const data = await api.getTicketKBLinks(ticketId);
      setLinks((data || []).map((l: any) => ({
        id: l.id,
        article_id: l.article_id || l.articleId,
        title: l.article?.title || l.title || '-',
        visibility: l.article?.visibility || l.visibility || 'public',
      })));
    } catch {
      setLinks([]);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await api.getKBArticles({ search: searchQuery });
      setSearchResults((data || []).slice(0, 10));
    } catch { /* ignore */ }
    setSearching(false);
  };

  const handleLink = async (articleId: string) => {
    try {
      await api.linkTicketKB(ticketId, articleId);
      toast({ title: t('common.success'), description: t('kb.articleLinked') });
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
      fetchLinks();
    } catch (e: any) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  const handleUnlink = async (linkId: string) => {
    try {
      await api.unlinkTicketKB(ticketId, linkId);
      fetchLinks();
      toast({ title: t('common.success') });
    } catch (e: any) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-5 w-5" />{t('kb.linkedArticles')}</CardTitle>
          {isStaff && <Button variant="outline" size="sm" onClick={() => setShowSearch(true)}><Plus className="h-4 w-4 mr-1" />{t('kb.linkArticle')}</Button>}
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-sm text-center text-muted-foreground py-3">{t('kb.noLinkedArticles')}</p>
        ) : (
          <div className="space-y-2">
            {links.map(link => (
              <div key={link.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
                <button className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors text-left" onClick={() => navigate(`/knowledge/${link.article_id}`)}>
                  <Link2 className="h-4 w-4 shrink-0" />
                  <span className="line-clamp-1">{link.title}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                </button>
                {isStaff && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUnlink(link.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('kb.searchAndLink')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder={t('kb.searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              <Button onClick={handleSearch} disabled={searching}>{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {searchResults.map(art => (
                <div key={art.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{art.title}</p>
                    {art.short_description && <p className="text-xs text-muted-foreground line-clamp-1">{art.short_description}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleLink(art.id)} disabled={links.some(l => l.article_id === art.id)}>
                    {links.some(l => l.article_id === art.id) ? t('kb.alreadyLinked') : t('kb.linkArticle')}
                  </Button>
                </div>
              ))}
              {searchResults.length === 0 && searchQuery && !searching && <p className="text-sm text-muted-foreground text-center py-4">{t('kb.noArticles')}</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

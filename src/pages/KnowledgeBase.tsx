import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, BookOpen, Eye, EyeOff, Pencil, Trash2, Loader2, Tag, Calendar, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface KBCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

interface KBArticle {
  id: string;
  title: string;
  short_description: string | null;
  content: string;
  category_id: string | null;
  tags: string[];
  visibility: 'public' | 'internal';
  author_id: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
};

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [categories, setCategories] = useState<KBCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterVisibility, setFilterVisibility] = useState('all');

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KBArticle | null>(null);
  const [form, setForm] = useState({ title: '', short_description: '', content: '', category_id: '', tags: '', visibility: 'public' as 'public' | 'internal' });
  const [saving, setSaving] = useState(false);

  // Category editor
  const [showCatEditor, setShowCatEditor] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  const isStaff = role === 'agent' || role === 'admin' || role === 'manager';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [arts, cats] = await Promise.all([
        api.getKBArticles(),
        api.getKBCategories(),
      ]);
      setArticles((arts || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        short_description: pick<string | null>(a, 'short_description', 'shortDescription') || null,
        content: a.content,
        category_id: pick<string | null>(a, 'category_id', 'categoryId') || null,
        tags: a.tags || [],
        visibility: a.visibility || 'public',
        author_id: pick<string>(a, 'author_id', 'authorId') || '',
        view_count: pick<number>(a, 'view_count', 'viewCount') || 0,
        created_at: pick<string>(a, 'created_at', 'createdAt') || new Date().toISOString(),
        updated_at: pick<string>(a, 'updated_at', 'updatedAt') || new Date().toISOString(),
      })));
      setCategories((cats || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        icon: c.icon ?? null,
        sort_order: pick<number>(c, 'sort_order', 'sortOrder') || 0,
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = articles.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.short_description || '').toLowerCase().includes(search.toLowerCase()) || (a.tags || []).some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    const matchCat = filterCategory === 'all' || a.category_id === filterCategory;
    const matchVis = filterVisibility === 'all' || a.visibility === filterVisibility;
    return matchSearch && matchCat && matchVis;
  });

  const openEditor = (article?: KBArticle) => {
    if (article) {
      setEditingArticle(article);
      setForm({ title: article.title, short_description: article.short_description || '', content: article.content, category_id: article.category_id || '', tags: (article.tags || []).join(', '), visibility: article.visibility });
    } else {
      setEditingArticle(null);
      setForm({ title: '', short_description: '', content: '', category_id: '', tags: '', visibility: 'public' });
    }
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        title: form.title,
        short_description: form.short_description || null,
        content: form.content,
        category_id: form.category_id || null,
        tags,
        visibility: form.visibility,
      };

      if (editingArticle) {
        await api.updateKBArticle(editingArticle.id, payload);
        toast({ title: t('common.success'), description: t('kb.articleUpdated') });
      } else {
        await api.createKBArticle(payload);
        toast({ title: t('common.success'), description: t('kb.articleCreated') });
      }
      setShowEditor(false);
      fetchData();
    } catch (e: any) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteKBArticle(id);
      toast({ title: t('common.success'), description: t('kb.articleDeleted') });
      fetchData();
    } catch (e: any) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) return;
    try {
      await api.createKBCategory({ name: catForm.name, description: catForm.description || null });
      toast({ title: t('common.success'), description: t('kb.categoryCreated') });
      setShowCatEditor(false);
      setCatForm({ name: '', description: '' });
      fetchData();
    } catch (e: any) {
      toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
    }
  };

  const getCategoryName = (id: string | null) => categories.find(c => c.id === id)?.name || '-';

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-7 w-7 text-primary" />{t('kb.title')}</h1>
          <p className="text-muted-foreground">{t('kb.subtitle')}</p>
        </div>
        {isStaff && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowCatEditor(true)}><FolderOpen className="h-4 w-4 mr-2" />{t('kb.addCategory')}</Button>
            <Button onClick={() => openEditor()}><Plus className="h-4 w-4 mr-2" />{t('kb.newArticle')}</Button>
          </div>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ y: -5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('kb.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('kb.allCategories')}</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {isStaff && (
          <Select value={filterVisibility} onValueChange={setFilterVisibility}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('kb.allVisibility')}</SelectItem>
              <SelectItem value="public">{t('kb.public')}</SelectItem>
              <SelectItem value="internal">{t('kb.internal')}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </motion.div>

      {/* Articles Grid */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t('kb.noArticles')}</p></CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((article, i) => (
            <motion.div key={article.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(`/knowledge/${article.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">{article.title}</CardTitle>
                    <Badge variant="secondary" className={article.visibility === 'internal' ? 'bg-amber-500/10 text-amber-600' : 'bg-green-500/10 text-green-600'}>
                      {article.visibility === 'internal' ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                      {article.visibility === 'internal' ? t('kb.internal') : t('kb.public')}
                    </Badge>
                  </div>
                  {article.short_description && <CardDescription className="line-clamp-2">{article.short_description}</CardDescription>}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {article.category_id && <Badge variant="outline" className="text-xs"><FolderOpen className="h-3 w-3 mr-1" />{getCategoryName(article.category_id)}</Badge>}
                    {(article.tags || []).slice(0, 3).map(tag => <Badge key={tag} variant="secondary" className="text-xs"><Tag className="h-3 w-3 mr-1" />{tag}</Badge>)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(article.updated_at), 'dd.MM.yyyy')}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{article.view_count}</span>
                  </div>
                  {isStaff && (
                    <div className="flex gap-1 mt-3 pt-3 border-t border-border">
                      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); openEditor(article); }}><Pencil className="h-3.5 w-3.5 mr-1" />{t('common.edit')}</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={e => { e.stopPropagation(); handleDelete(article.id); }}><Trash2 className="h-3.5 w-3.5 mr-1" />{t('common.delete')}</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Article Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle ? t('kb.editArticle') : t('kb.newArticle')}</DialogTitle>
            <DialogDescription>{t('kb.editorDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>{t('kb.articleTitle')}</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={t('kb.titlePlaceholder')} /></div>
            <div className="space-y-2"><Label>{t('kb.shortDesc')}</Label><Input value={form.short_description} onChange={e => setForm({ ...form, short_description: e.target.value })} placeholder={t('kb.shortDescPlaceholder')} /></div>
            <div className="space-y-2"><Label>{t('kb.content')}</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder={t('kb.contentPlaceholder')} rows={10} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('kb.category')}</Label>
                <Select value={form.category_id || 'none'} onValueChange={v => setForm({ ...form, category_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('kb.visibility')}</Label>
                <Select value={form.visibility} onValueChange={v => setForm({ ...form, visibility: v as 'public' | 'internal' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">{t('kb.public')}</SelectItem>
                    <SelectItem value="internal">{t('kb.internal')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>{t('kb.tags')}</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder={t('kb.tagsPlaceholder')} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditor(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Editor Dialog */}
      <Dialog open={showCatEditor} onOpenChange={setShowCatEditor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('kb.addCategory')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>{t('common.name')}</Label><Input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder={t('kb.categoryPlaceholder')} /></div>
            <div className="space-y-2"><Label>{t('common.description')}</Label><Input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCatEditor(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSaveCategory} disabled={!catForm.name.trim()}>{t('common.save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

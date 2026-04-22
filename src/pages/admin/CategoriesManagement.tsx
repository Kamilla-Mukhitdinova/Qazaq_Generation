import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { FolderOpen, Plus, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Category { id: string; name: string; description: string | null; created_at: string; }

export default function CategoriesManagement() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try { setCategories(await api.getCategories()); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) return; setSaving(true);
    try { await api.createCategory({ name: newCategory.name.trim(), description: newCategory.description.trim() || null }); toast({ title: t('common.success'), description: t('admin.cats.catAdded') }); setNewCategory({ name: '', description: '' }); setAddOpen(false); fetchCategories(); }
    catch (e) { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setSaving(false); }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return; setSaving(true);
    try { await api.updateCategory(editingCategory.id, { name: editingCategory.name, description: editingCategory.description }); toast({ title: t('common.success'), description: t('admin.cats.catUpdated') }); setEditingCategory(null); fetchCategories(); }
    catch (e) { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><FolderOpen className="h-6 w-6 text-primary" />{t('admin.cats.title')}</h1><p className="text-muted-foreground">{t('admin.cats.subtitle')}</p></div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('admin.cats.addCategory')}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('admin.cats.newCategory')}</DialogTitle><DialogDescription>{t('admin.cats.newCatDesc')}</DialogDescription></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>{t('common.name')}</Label><Input value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} placeholder={t('admin.cats.catPlaceholder')} /></div>
              <div className="space-y-2"><Label>{t('common.description')}</Label><Textarea value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} placeholder={t('admin.cats.descPlaceholder')} /></div>
            </div>
            <DialogFooter><Button onClick={handleAddCategory} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.add')}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardHeader><CardTitle>{t('admin.cats.allCategories')}</CardTitle></CardHeader><CardContent>
        <Table><TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>{t('common.description')}</TableHead><TableHead>{t('admin.cats.created')}</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>{categories.map((cat) => (
            <TableRow key={cat.id}><TableCell className="font-medium">{cat.name}</TableCell><TableCell className="text-muted-foreground">{cat.description || '-'}</TableCell><TableCell>{format(new Date(cat.created_at), 'dd.MM.yyyy')}</TableCell>
              <TableCell><Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setEditingCategory(cat)}><Edit className="h-4 w-4" /></Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>{t('admin.cats.editCategory')}</DialogTitle></DialogHeader>
                  {editingCategory && <div className="space-y-4"><div className="space-y-2"><Label>{t('common.name')}</Label><Input value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} /></div><div className="space-y-2"><Label>{t('common.description')}</Label><Textarea value={editingCategory.description || ''} onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })} /></div></div>}
                  <DialogFooter><Button onClick={handleUpdateCategory} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.save')}</Button></DialogFooter>
                </DialogContent></Dialog></TableCell>
          </TableRow>))}</TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

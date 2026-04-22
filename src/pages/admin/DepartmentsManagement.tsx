import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Building2, Plus, Edit, Users, Loader2 } from 'lucide-react';

interface Department { id: string; name: string; created_at: string; }
interface Group { id: string; name: string; department_id: string | null; created_at: string; }

export default function DepartmentsManagement() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [saving, setSaving] = useState(false);
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { const [depts, grps] = await Promise.all([api.getDepartments(), api.getGroups()]); setDepartments(depts || []); setGroups(grps || []); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) return; setSaving(true);
    try { await api.createDepartment({ name: newDeptName.trim() }); toast({ title: t('common.success'), description: t('admin.depts.deptAdded') }); setNewDeptName(''); setAddDeptOpen(false); fetchData(); }
    catch (e) { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setSaving(false); }
  };

  const handleUpdateDepartment = async () => {
    if (!editingDept) return; setSaving(true);
    try { await api.updateDepartment(editingDept.id, { name: editingDept.name }); toast({ title: t('common.success'), description: t('admin.depts.deptUpdated') }); setEditingDept(null); fetchData(); }
    catch (e) { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setSaving(false); }
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim() || !selectedDeptId) return; setSaving(true);
    try { await api.createGroup({ name: newGroupName.trim(), departmentId: selectedDeptId }); toast({ title: t('common.success'), description: t('admin.depts.groupAdded') }); setNewGroupName(''); setAddGroupOpen(false); fetchData(); }
    catch (e) { toast({ title: t('common.error'), variant: 'destructive' }); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-primary" />{t('admin.depts.title')}</h1><p className="text-muted-foreground">{t('admin.depts.subtitle')}</p></div>
        <div className="flex gap-2">
          <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
            <DialogTrigger asChild><Button variant="outline"><Users className="h-4 w-4 mr-2" />{t('admin.depts.addGroup')}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('admin.depts.newGroup')}</DialogTitle><DialogDescription>{t('admin.depts.newGroupDesc')}</DialogDescription></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>{t('admin.users.department')}</Label><select className="w-full p-2 border rounded-md" value={selectedDeptId || ''} onChange={(e) => setSelectedDeptId(e.target.value)}><option value="">{t('common.select')}</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div className="space-y-2"><Label>{t('admin.depts.groupName')}</Label><Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder={t('admin.depts.groupPlaceholder')} /></div>
              </div>
              <DialogFooter><Button onClick={handleAddGroup} disabled={saving || !selectedDeptId}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.add')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={addDeptOpen} onOpenChange={setAddDeptOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('admin.depts.addDept')}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('admin.depts.newDept')}</DialogTitle><DialogDescription>{t('admin.depts.newDeptDesc')}</DialogDescription></DialogHeader>
              <div className="space-y-2"><Label>{t('common.name')}</Label><Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder={t('admin.depts.deptPlaceholder')} /></div>
              <DialogFooter><Button onClick={handleAddDepartment} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.add')}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader><CardTitle>{t('admin.depts.departments')}</CardTitle></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>{t('admin.depts.groups')}</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{departments.map(dept => (
              <TableRow key={dept.id}><TableCell className="font-medium">{dept.name}</TableCell><TableCell>{groups.filter(g => g.department_id === dept.id).length}</TableCell>
                <TableCell><Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setEditingDept(dept)}><Edit className="h-4 w-4" /></Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>{t('admin.depts.editDept')}</DialogTitle></DialogHeader>{editingDept && <div className="space-y-2"><Label>{t('common.name')}</Label><Input value={editingDept.name} onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })} /></div>}<DialogFooter><Button onClick={handleUpdateDepartment} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.save')}</Button></DialogFooter></DialogContent>
                </Dialog></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>{t('admin.depts.groups')}</CardTitle></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>{t('common.name')}</TableHead><TableHead>{t('admin.users.department')}</TableHead></TableRow></TableHeader>
            <TableBody>{groups.map(group => (
              <TableRow key={group.id}><TableCell className="font-medium">{group.name}</TableCell><TableCell>{departments.find(d => d.id === group.department_id)?.name || '-'}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </div>
  );
}

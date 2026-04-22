import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

type AppRole = 'employee' | 'agent' | 'manager' | 'admin';
interface UserWithRole { id: string; user_id: string; name: string; email: string; department_id: string | null; group_id: string | null; created_at: string; role: AppRole; }
interface Department { id: string; name: string; }
interface Group { id: string; name: string; department_id: string | null; }

const ROLE_COLORS: Record<AppRole, string> = { employee: 'bg-slate-500/10 text-slate-500', agent: 'bg-blue-500/10 text-blue-500', manager: 'bg-purple-500/10 text-purple-500', admin: 'bg-red-500/10 text-red-500' };

export default function UsersManagement() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [profiles, roles, depts, grps] = await Promise.all([api.getProfiles(), api.getUserRoles(), api.getDepartments(), api.getGroups()]);
      setDepartments(depts || []); setGroups(grps || []);
      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
      setUsers((profiles || []).map((p: any) => ({ ...p, role: roleMap.get(p.user_id) || 'employee' })));
    } catch (e) { console.error(e); toast({ title: t('common.error'), description: t('admin.users.loadError'), variant: 'destructive' }); } finally { setLoading(false); }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return; setSaving(true);
    try {
      await api.updateUser(editingUser.user_id, { name: editingUser.name, departmentId: editingUser.department_id, groupId: editingUser.group_id });
      await api.updateUserRole(editingUser.user_id, editingUser.role);
      toast({ title: t('common.success'), description: t('admin.users.updated') }); setEditingUser(null); fetchData();
    } catch (e) { console.error(e); toast({ title: t('common.error'), description: t('admin.users.updateError'), variant: 'destructive' }); } finally { setSaving(false); }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" />{t('admin.users.title')}</h1><p className="text-muted-foreground">{t('admin.users.subtitle')}</p></div>
      <Card><CardHeader><div className="flex items-center gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={t('common.search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></div></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>{t('admin.users.name')}</TableHead><TableHead>Email</TableHead><TableHead>{t('admin.users.role')}</TableHead><TableHead>{t('admin.users.department')}</TableHead><TableHead>{t('admin.users.group')}</TableHead><TableHead>{t('admin.users.registered')}</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{filteredUsers.map(user => (
              <TableRow key={user.id}><TableCell className="font-medium">{user.name}</TableCell><TableCell>{user.email}</TableCell>
                <TableCell><Badge variant="secondary" className={ROLE_COLORS[user.role]}>{t(`role.${user.role}`)}</Badge></TableCell>
                <TableCell>{departments.find(d => d.id === user.department_id)?.name || '-'}</TableCell>
                <TableCell>{groups.find(g => g.id === user.group_id)?.name || '-'}</TableCell>
                <TableCell>{format(new Date(user.created_at), 'dd.MM.yyyy')}</TableCell>
                <TableCell><Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setEditingUser(user)}><Edit className="h-4 w-4" /></Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>{t('admin.users.editUser')}</DialogTitle><DialogDescription>{t('admin.users.editDesc')}</DialogDescription></DialogHeader>
                    {editingUser && <div className="space-y-4">
                      <div className="space-y-2"><Label>{t('admin.users.name')}</Label><Input value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} /></div>
                      <div className="space-y-2"><Label>{t('admin.users.role')}</Label><Select value={editingUser.role} onValueChange={(v: AppRole) => setEditingUser({ ...editingUser, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="employee">{t('role.employee')}</SelectItem><SelectItem value="agent">{t('role.agent')}</SelectItem><SelectItem value="manager">{t('role.manager')}</SelectItem><SelectItem value="admin">{t('role.admin')}</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><Label>{t('admin.users.department')}</Label><Select value={editingUser.department_id || ''} onValueChange={(v) => setEditingUser({ ...editingUser, department_id: v || null })}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label>{t('admin.users.group')}</Label><Select value={editingUser.group_id || ''} onValueChange={(v) => setEditingUser({ ...editingUser, group_id: v || null })}><SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger><SelectContent>{groups.filter(g => !editingUser.department_id || g.department_id === editingUser.department_id).map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select></div>
                    </div>}
                    <DialogFooter><Button onClick={handleUpdateUser} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.save')}</Button></DialogFooter>
                  </DialogContent></Dialog></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

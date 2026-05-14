import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

interface Category {
  id: string;
  name: string;
}

interface Profile {
  user_id?: string;
  userId?: string;
  name: string;
  email: string;
}

const NO_CATEGORY_VALUE = 'none';
const NO_ASSIGNEE_VALUE = 'unassigned';

export default function NewTicket() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [categoryId, setCategoryId] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canChooseRequester = role === 'agent' || role === 'admin' || role === 'manager';

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });
  const categories: Category[] = Array.isArray(categoriesData) ? categoriesData : [];

  const { data: profilesData } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => api.getProfiles(),
    enabled: canChooseRequester,
  });
  const profiles = Array.isArray(profilesData)
    ? profilesData
        .map((profile: Profile) => ({
          id: profile.user_id || profile.userId || '',
          name: profile.name,
          email: profile.email,
        }))
        .filter((profile) => profile.id)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: t('common.error'), description: t('auth.login'), variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await api.createTicket({
        title, description, priority,
        categoryId: categoryId || null,
        requesterId: canChooseRequester ? requesterId || user.id : user.id,
        assigneeId: canChooseRequester && assigneeId ? assigneeId : null,
      });

      toast({ title: t('common.success'), description: t('ticket.form.submit') });
      navigate(`/tickets/${data.id}`);
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div className="max-w-2xl mx-auto space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <motion.div className="flex items-center gap-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold">{t('ticket.form.title')}</h1>
          <p className="text-muted-foreground">{t('ticket.form.subtitle')}</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass">
          <CardHeader>
            <CardTitle>{t('ticket.form.details')}</CardTitle>
            <CardDescription>{t('ticket.form.detailsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Label htmlFor="title">{t('ticket.form.titleLabel')} *</Label>
                <Input id="title" placeholder={t('ticket.form.titlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isSubmitting} />
              </motion.div>

              <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                <Label htmlFor="description">{t('ticket.form.description')}</Label>
                <Textarea id="description" placeholder={t('ticket.form.descriptionPlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} rows={6} disabled={isSubmitting} />
              </motion.div>

              {canChooseRequester && (
                <motion.div className="grid grid-cols-2 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}>
                  <div className="space-y-2">
                    <Label htmlFor="requester">{t('ticket.form.requester')}</Label>
                    <Select value={requesterId || user.id} onValueChange={setRequesterId} disabled={isSubmitting}>
                      <SelectTrigger id="requester"><SelectValue placeholder={t('ticket.form.selectRequester')} /></SelectTrigger>
                      <SelectContent>
                        {profiles.length === 0 ? (
                          <SelectItem value={user.id}>{user.name || user.email}</SelectItem>
                        ) : (
                          profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignee">{t('ticket.form.assignee')}</Label>
                    <Select
                      value={assigneeId || NO_ASSIGNEE_VALUE}
                      onValueChange={(value) => setAssigneeId(value === NO_ASSIGNEE_VALUE ? '' : value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="assignee"><SelectValue placeholder={t('ticket.form.selectAssignee')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_ASSIGNEE_VALUE}>{t('ticket.detail.unassigned')}</SelectItem>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}

              <motion.div className="grid grid-cols-2 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <div className="space-y-2">
                  <Label htmlFor="priority">{t('ticket.form.priority')}</Label>
                  <Select value={priority} onValueChange={setPriority} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('ticket.priority.low')}</SelectItem>
                      <SelectItem value="medium">{t('ticket.priority.medium')}</SelectItem>
                      <SelectItem value="high">{t('ticket.priority.high')}</SelectItem>
                      <SelectItem value="critical">{t('ticket.priority.critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">{t('ticket.form.category')}</Label>
                  <Select
                    value={categoryId || NO_CATEGORY_VALUE}
                    onValueChange={(value) => setCategoryId(value === NO_CATEGORY_VALUE ? '' : value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger><SelectValue placeholder={t('ticket.form.selectCategory')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY_VALUE}>{t('ticket.form.selectCategory')}</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>

              <motion.div className="flex gap-4 pt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>{t('common.cancel')}</Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('ticket.form.submit')}
                  </Button>
                </motion.div>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { User, Mail, Building2, Shield, Loader2, Ticket, Clock, TrendingUp, Upload, X, BellRing } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const imageFileToAvatarDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) {
    reject(new Error('invalid-image'));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => reject(new Error('read-failed'));
  reader.onload = () => {
    const image = new window.Image();
    image.onerror = () => reject(new Error('image-load-failed'));
    image.onload = () => {
      const size = 320;
      const scale = Math.max(size / image.width, size / image.height);
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('canvas-failed'));
        return;
      }

      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.src = String(reader.result || '');
  };
  reader.readAsDataURL(file);
});

export default function Profile() {
  const { user, profile, role, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState(profile?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const push = usePushNotifications();

  useEffect(() => {
    setName(profile?.name || '');
    setAvatarUrl(profile?.avatar_url || '');
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await api.updateMyProfile({ name, avatarUrl: avatarUrl || null });
      await refreshProfile();
      toast({ title: t('common.success'), description: t('profile.updateSuccess') });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setAvatarUrl(await imageFileToAvatarDataUrl(file));
    } catch {
      toast({ title: t('common.error'), description: t('profile.avatarUploadError'), variant: 'destructive' });
    }
  };

  const getRoleLabel = (r: string) => {
    const roleMap: Record<string, string> = { admin: t('role.admin'), manager: t('role.manager'), agent: t('role.agent'), employee: t('role.employee') };
    return roleMap[r] || r;
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  return (
    <motion.div className="max-w-4xl mx-auto space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
        <p className="text-muted-foreground">{t('profile.subtitle')}</p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3">
        <motion.div variants={itemVariants}>
          <Card className="glass">
            <CardHeader className="text-center"><CardTitle>{t('profile.avatar')}</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <motion.div className="relative group" whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Avatar className="h-32 w-32 ring-4 ring-primary/20">
                  <AvatarImage src={avatarUrl} alt={profile?.name} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                    {getInitials(profile?.name || 'U')}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarFileSelect} className="hidden" />
              <div className="grid w-full gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  {t('profile.uploadPhoto')}
                </Button>
                {avatarUrl && (
                  <Button type="button" variant="ghost" onClick={() => setAvatarUrl('')}>
                    <X className="h-4 w-4" />
                    {t('profile.removePhoto')}
                  </Button>
                )}
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Shield className="h-3 w-3 mr-1" />{getRoleLabel(role || 'employee')}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="md:col-span-2">
          <Card className="glass">
            <CardHeader><CardTitle>{t('profile.title')}</CardTitle><CardDescription>{t('profile.subtitle')}</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><User className="h-4 w-4" />{t('profile.name')}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('profile.name')} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Mail className="h-4 w-4" />{t('profile.email')}</Label>
                <Input value={profile?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Building2 className="h-4 w-4" />{t('profile.department')}</Label>
                <Input value={profile?.department_id ? 'Department' : '-'} disabled />
              </div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t('common.save')}
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Push Notification Settings */}
      {push.isSupported && (
        <motion.div variants={itemVariants}>
          <Card className="glass">
            <CardHeader>
            <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5" />{t('profile.pushTitle')}</CardTitle>
              <CardDescription>{t('profile.pushDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{push.isSubscribed ? t('profile.pushEnabled') : t('profile.pushDisabled')}</p>
                  <p className="text-xs text-muted-foreground">{t('profile.pushHint')}</p>
                </div>
                <Switch
                  checked={push.isSubscribed}
                  disabled={push.loading}
                  onCheckedChange={(checked) => {
                    if (checked) push.subscribe();
                    else push.unsubscribe();
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Card className="glass">
          <CardHeader><CardTitle>{t('profile.stats')}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: Ticket, color: 'chart-3', value: '0', label: t('profile.ticketsClosed') },
                { icon: Clock, color: 'chart-1', value: '-', label: t('profile.avgResolution') },
                { icon: TrendingUp, color: 'chart-5', value: '-', label: t('profile.slaSuccess') },
              ].map((stat, i) => (
                <motion.div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50" whileHover={{ scale: 1.02 }}>
                  <div className={`p-3 rounded-full bg-${stat.color}/10`}><stat.icon className={`h-6 w-6 text-${stat.color}`} /></div>
                  <div><p className="text-2xl font-bold">{stat.value}</p><p className="text-sm text-muted-foreground">{stat.label}</p></div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

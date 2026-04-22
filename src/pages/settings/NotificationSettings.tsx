import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bell, BellRing, Mail, Smartphone, Loader2, Save, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface ChannelPrefs { in_app: boolean; email: boolean; push: boolean; }
interface AllPrefs { status_change: ChannelPrefs; assignment: ChannelPrefs; comment: ChannelPrefs; sla_breach: ChannelPrefs; }

const defaultPrefs: AllPrefs = {
  status_change: { in_app: true, email: true, push: true },
  assignment: { in_app: true, email: true, push: true },
  comment: { in_app: true, email: true, push: true },
  sla_breach: { in_app: true, email: true, push: true },
};

const channels = [
  { key: 'in_app' as const, icon: Bell, label: 'In-app' },
  { key: 'email' as const, icon: Mail, label: 'Email' },
  { key: 'push' as const, icon: Smartphone, label: 'Push' },
];

export default function NotificationSettings() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const push = usePushNotifications();
  const [prefs, setPrefs] = useState<AllPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const eventConfig = [
    { key: 'status_change' as const, icon: '🔄', titleKey: 'notifSettings.statusChange', descKey: 'notifSettings.statusChangeDesc' },
    { key: 'assignment' as const, icon: '👤', titleKey: 'notifSettings.assignment', descKey: 'notifSettings.assignmentDesc' },
    { key: 'comment' as const, icon: '💬', titleKey: 'notifSettings.comment', descKey: 'notifSettings.commentDesc' },
    { key: 'sla_breach' as const, icon: '⚠️', titleKey: 'notifSettings.slaBreach', descKey: 'notifSettings.slaBreachDesc' },
  ];

  useEffect(() => { fetchPrefs(); }, []);

  const fetchPrefs = async () => {
    setLoading(true);
    try { setPrefs(await api.getNotificationPreferences()); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const togglePref = (event: keyof AllPrefs, channel: keyof ChannelPrefs) => {
    setPrefs(prev => ({ ...prev, [event]: { ...prev[event], [channel]: !prev[event][channel] } }));
  };

  const toggleAllForChannel = (channel: keyof ChannelPrefs, value: boolean) => {
    setPrefs(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(updated) as (keyof AllPrefs)[]) updated[key] = { ...updated[key], [channel]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try { await api.updateNotificationPreferences(prefs); toast({ title: t('common.success'), description: t('notifSettings.saved') }); }
    catch (err: any) { toast({ title: t('common.error'), description: err.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const allChannelEnabled = (channel: keyof ChannelPrefs) => eventConfig.every(e => prefs[e.key][channel]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BellRing className="h-6 w-6" />{t('notifSettings.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('notifSettings.subtitle')}</p>
      </div>

      {push.isSupported && (
        <Card><CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Smartphone className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="font-medium text-sm">Browser Push</p>
                <p className="text-xs text-muted-foreground">{push.isSubscribed ? t('notifSettings.pushEnabled') : t('notifSettings.pushDisabled')}</p>
              </div>
            </div>
            <Switch checked={push.isSubscribed} disabled={push.loading} onCheckedChange={checked => checked ? push.subscribe() : push.unsubscribe()} />
          </div>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('notifSettings.eventsAndChannels')}</CardTitle>
          <CardDescription>{t('notifSettings.eventsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 items-center mb-4">
            <div />
            {channels.map(ch => (
              <div key={ch.key} className="flex flex-col items-center gap-1">
                <ch.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{ch.label}</span>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => toggleAllForChannel(ch.key, !allChannelEnabled(ch.key))}>
                  {allChannelEnabled(ch.key) ? t('common.disableAll') : t('common.enableAll')}
                </Button>
              </div>
            ))}
          </div>
          <Separator className="mb-4" />
          <div className="space-y-1">
            {eventConfig.map((event, idx) => (
              <motion.div key={event.key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                className="grid grid-cols-[1fr_80px_80px_80px] gap-2 items-center py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{event.icon}</span>
                  <div><p className="text-sm font-medium">{t(event.titleKey)}</p><p className="text-xs text-muted-foreground">{t(event.descKey)}</p></div>
                </div>
                {channels.map(ch => (
                  <div key={ch.key} className="flex justify-center"><Switch checked={prefs[event.key][ch.key]} onCheckedChange={() => togglePref(event.key, ch.key)} /></div>
                ))}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={fetchPrefs} disabled={saving}><RefreshCw className="h-4 w-4 mr-2" />{t('common.reset')}</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}{t('common.save')}</Button>
      </div>
    </motion.div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Maximize2,
  MessageSquare,
  Minimize2,
  PhoneOff,
  Plus,
  Radio,
  Search,
  Send,
  Square,
  Trash2,
  Users,
  Video,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type MeetingStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  status: MeetingStatus;
  inviteLink: string;
  createdBy: string;
  participants: string[];
  reminderMinutes: number | null;
  startedAt: string | null;
  endedAt: string | null;
}

interface ChatMessage {
  id: number;
  author: string;
  body: string;
}

const statusMeta: Record<MeetingStatus, { label: string; className: string }> = {
  scheduled: { label: 'Запланирована', className: 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/10 dark:text-blue-300' },
  live: { label: 'Идет сейчас', className: 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300' },
  ended: { label: 'Завершена', className: 'bg-slate-500/10 text-slate-700 hover:bg-slate-500/10 dark:text-slate-300' },
  cancelled: { label: 'Отменена', className: 'bg-red-500/10 text-red-700 hover:bg-red-500/10 dark:text-red-300' },
};

const fallbackMeetings: Meeting[] = [
  {
    id: 'daily-it-status',
    title: 'Ежедневный статус IT',
    description: 'Короткая синхронизация по заявкам, SLA и блокерам.',
    scheduledAt: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    durationMinutes: 30,
    status: 'scheduled',
    inviteLink: `${window.location.origin}/meet/daily-it-status`,
    createdBy: 'local',
    participants: ['Аружан Сейдахмет', 'Данияр Омаров', 'Айгерим Нурлан'],
    reminderMinutes: 10,
    startedAt: null,
    endedAt: null,
  },
];

const initialMessages: ChatMessage[] = [
  { id: 1, author: 'Аружан', body: 'Коллеги, я прикрепила список заявок с высоким SLA.' },
  { id: 2, author: 'Данияр', body: 'После созвона проверю сетевые устройства по второму инциденту.' },
];

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const toDateInput = (date: Date) => format(date, 'yyyy-MM-dd');
const toTimeInput = (date: Date) => format(date, 'HH:mm');
const toRoomName = (meetingId: string) => `qazaq-generation-${meetingId.replace(/[^a-zA-Z0-9-]/g, '-')}`;
const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const buildMeetingFromLink = (id: string): Meeting => ({
  id,
  title: 'Встреча по ссылке',
  description: 'Комната восстановлена из ссылки приглашения.',
  scheduledAt: new Date().toISOString(),
  durationMinutes: 60,
  status: 'scheduled',
  inviteLink: `${window.location.origin}/meet/${id}`,
  createdBy: 'link',
  participants: [],
  reminderMinutes: null,
  startedAt: null,
  endedAt: null,
});

export default function VideoConferences() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(meetingId || null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null);
  const [inCallMeetingId, setInCallMeetingId] = useState<string | null>(null);
  const [theaterMode, setTheaterMode] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingName, setRecordingName] = useState('');
  const [conferenceLoadState, setConferenceLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [conferenceReloadKey, setConferenceReloadKey] = useState(0);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [form, setForm] = useState(() => {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    return {
      title: '',
      date: toDateInput(nextHour),
      time: toTimeInput(nextHour),
      durationMinutes: '30',
      participants: '',
      description: '',
      reminderMinutes: '10',
      generateLink: true,
    };
  });
  const callShellRef = useRef<HTMLElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);

  const displayName = profile?.name || 'Вы';
  const jitsiDomain = (import.meta.env.VITE_JITSI_DOMAIN || 'meet.ffmuc.net').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const selectedMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === selectedMeetingId) || meetings[0] || null,
    [meetings, selectedMeetingId],
  );
  const isOrganizer = Boolean(
    selectedMeeting &&
      (selectedMeeting.createdBy === user?.id ||
        selectedMeeting.createdBy === profile?.user_id ||
        selectedMeeting.createdBy === 'local' ||
        selectedMeeting.createdBy === 'link'),
  );
  const inCall = Boolean(selectedMeeting && inCallMeetingId === selectedMeeting.id && selectedMeeting.status === 'live');
  const shouldEmbedConference = import.meta.env.VITE_EMBED_JITSI !== 'false';
  const conferenceRoomUrl = useMemo(() => {
    if (!selectedMeeting) return '';

    const roomName = toRoomName(selectedMeeting.id);
    const params = new URLSearchParams({
      'userInfo.displayName': displayName,
      'config.prejoinConfig.enabled': 'false',
      'config.startWithAudioMuted': 'false',
      'config.startWithVideoMuted': 'false',
      'config.disableDeepLinking': 'true',
      'config.disableInviteFunctions': 'true',
      'config.disableThirdPartyRequests': 'true',
      'config.enableWelcomePage': 'false',
      'config.mobileAppPromo': 'false',
      'interfaceConfig.MOBILE_APP_PROMO': 'false',
      'interfaceConfig.SHOW_BRAND_WATERMARK': 'false',
      'interfaceConfig.SHOW_JITSI_WATERMARK': 'false',
      'interfaceConfig.SHOW_POWERED_BY': 'false',
      'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS': 'false',
      'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS': 'true',
    });

    return `https://${jitsiDomain}/${encodeURIComponent(roomName)}#${params.toString()}`;
  }, [displayName, jitsiDomain, selectedMeeting]);

  useEffect(() => {
    if (!inCall || !conferenceRoomUrl || !shouldEmbedConference) return;

    setConferenceLoadState('loading');
    const timer = window.setTimeout(() => {
      setConferenceLoadState((state) => (state === 'loading' ? 'failed' : state));
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [conferenceRoomUrl, inCall, shouldEmbedConference]);

  const filteredMeetings = meetings.filter((meeting) =>
    `${meeting.title} ${meeting.description} ${meeting.participants.join(' ')}`.toLowerCase().includes(query.toLowerCase()),
  );

  const loadMeetings = async (focusId?: string) => {
    setLoading(true);
    try {
      const data = focusId ? [await api.getMeeting(focusId)] : await api.getMeetings();
      setMeetings((current) => {
        if (!focusId) return data;
        const rest = current.filter((meeting) => meeting.id !== focusId);
        return [data[0], ...rest];
      });
      setSelectedMeetingId((current) => focusId || current || data[0]?.id || null);
    } catch {
      if (focusId) {
        const linkMeeting = buildMeetingFromLink(focusId);
        setMeetings((current) => {
          const rest = current.filter((meeting) => meeting.id !== focusId);
          return [linkMeeting, ...rest];
        });
        setSelectedMeetingId(focusId);
        toast({
          title: 'Комната открыта по ссылке',
          description: 'Сервер не нашел встречу, но звонок можно запустить по этому приглашению.',
        });
        return;
      }
      setMeetings(fallbackMeetings);
      setSelectedMeetingId((current) => current || fallbackMeetings[0]?.id || null);
      toast({
        title: 'Встречи загружены локально',
        description: 'API видеоконференций недоступен, показан демо-список.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings(meetingId);
  }, [meetingId]);

  useEffect(() => {
    return () => {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    };
  }, [recordingUrl]);

  useEffect(() => {
    const syncFullscreenState = () => {
      if (!document.fullscreenElement) setTheaterMode(false);
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  const updateMeeting = (updated: Meeting) => {
    setMeetings((current) => current.map((meeting) => (meeting.id === updated.id ? updated : meeting)));
    setSelectedMeetingId(updated.id);
  };

  const resetCallControls = () => {
    if (recording) stopRecording();
    setInCallMeetingId(null);
    setChatOpen(false);
    setTheaterMode(false);
  };

  const copyLink = async () => {
    if (!selectedMeeting?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(selectedMeeting.inviteLink);
      toast({ title: 'Ссылка скопирована', description: selectedMeeting.inviteLink });
    } catch {
      toast({ title: 'Не удалось скопировать ссылку', variant: 'destructive' });
    }
  };

  const startMeeting = async () => {
    if (!selectedMeeting || selectedMeeting.status === 'ended' || selectedMeeting.status === 'cancelled') return;
    try {
      const updated =
        selectedMeeting.createdBy === 'link'
          ? { ...selectedMeeting, status: 'live' as MeetingStatus, startedAt: new Date().toISOString(), endedAt: null }
          : await api.startMeeting(selectedMeeting.id);
      updateMeeting(updated);
      setInCallMeetingId(updated.id);
    } catch {
      toast({ title: 'Не удалось начать конференцию', variant: 'destructive' });
    }
  };

  const joinMeeting = () => {
    if (!selectedMeeting || selectedMeeting.status !== 'live') return;
    setInCallMeetingId(selectedMeeting.id);
  };

  const openConferenceRoom = () => {
    if (!conferenceRoomUrl) return;
    const popup = window.open('', '_blank');

    if (!popup) {
      window.open(conferenceRoomUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    popup.document.write(`
      <!doctype html>
      <html lang="ru">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(selectedMeeting?.title || 'Конференция')}</title>
          <style>
            html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
            iframe { position: fixed; inset: 0; width: 100%; height: 100%; border: 0; }
            .brand-cover {
              position: fixed;
              left: 0;
              top: 92px;
              width: 150px;
              height: 240px;
              background: #454545;
              z-index: 2;
              pointer-events: none;
            }
          </style>
        </head>
        <body>
          <iframe
            src="${escapeHtml(conferenceRoomUrl)}"
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            allowfullscreen
            referrerpolicy="no-referrer"
          ></iframe>
          <div class="brand-cover" aria-hidden="true"></div>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const endMeeting = async () => {
    if (!selectedMeeting) return;
    try {
      const updated =
        selectedMeeting.createdBy === 'link'
          ? { ...selectedMeeting, status: 'ended' as MeetingStatus, endedAt: new Date().toISOString() }
          : await api.endMeeting(selectedMeeting.id);
      updateMeeting(updated);
      resetCallControls();
      toast({ title: 'Конференция завершена' });
    } catch {
      toast({ title: 'Не удалось завершить конференцию', variant: 'destructive' });
    }
  };

  const cancelMeeting = async () => {
    if (!selectedMeeting || selectedMeeting.status !== 'scheduled') return;
    try {
      const updated = await api.cancelMeeting(selectedMeeting.id);
      updateMeeting(updated);
      toast({ title: 'Встреча отменена' });
    } catch {
      toast({ title: 'Не удалось отменить встречу', variant: 'destructive' });
    }
  };

  const deleteMeeting = async () => {
    if (!selectedMeeting) return;

    const deletedId = selectedMeeting.id;
    setDeletingMeetingId(deletedId);
    try {
      await api.deleteMeeting(deletedId);
      const nextMeetings = meetings.filter((meeting) => meeting.id !== deletedId);
      setMeetings(nextMeetings);
      setSelectedMeetingId(nextMeetings[0]?.id || null);
      if (inCallMeetingId === deletedId) resetCallControls();
      if (meetingId) navigate('/meetings');
      toast({ title: 'Конференция удалена' });
    } catch {
      toast({ title: 'Не удалось удалить конференцию', variant: 'destructive' });
    } finally {
      setDeletingMeetingId(null);
    }
  };

  const selectMeeting = (id: string) => {
    resetCallControls();
    setSelectedMeetingId(id);
    if (meetingId) navigate('/meetings');
  };

  const createMeeting = async () => {
    const title = form.title.trim();
    if (!title) return;

    const scheduledAt = new Date(`${form.date}T${form.time}`);
    const participants = form.participants
      .split(',')
      .map((participant) => participant.trim())
      .filter(Boolean);

    try {
      const created = await api.createMeeting({
        title,
        description: form.description,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: Number(form.durationMinutes) || 30,
        participants,
        reminderMinutes: form.reminderMinutes ? Number(form.reminderMinutes) : null,
        generateLink: form.generateLink,
      });
      setMeetings((current) => [created, ...current]);
      setSelectedMeetingId(created.id);
      setCreateOpen(false);
      setForm((current) => ({ ...current, title: '', description: '', participants: '' }));
      toast({ title: 'Встреча запланирована' });
    } catch {
      toast({ title: 'Не удалось создать встречу', variant: 'destructive' });
    }
  };

  const toggleTheaterMode = async () => {
    const next = !theaterMode;
    setTheaterMode(next);

    if (next && callShellRef.current?.requestFullscreen) {
      try {
        await callShellRef.current.requestFullscreen();
      } catch {
        // Browser fullscreen can be denied; the fixed in-app view still expands the call.
      }
    } else if (!next && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    setRecording(false);
  };

  const startRecording = async () => {
    if (!selectedMeeting) return;

    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
      toast({ title: 'Запись недоступна', description: 'Браузер не поддерживает запись экрана.', variant: 'destructive' });
      return;
    }

    try {
      toast({
        title: 'Выберите вкладку со звонком',
        description: 'Чтобы записать звук коллег, включите общий доступ к звуку вкладки.',
      });

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';

      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const safeTitle = selectedMeeting.title.replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '') || 'meeting';

        if (recordingUrl) URL.revokeObjectURL(recordingUrl);
        setRecordingUrl(url);
        setRecordingName(`${safeTitle}-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.webm`);
        toast({ title: 'Запись готова', description: 'Файл можно скачать из панели звонка.' });
      };

      stream.getVideoTracks()[0]?.addEventListener('ended', stopRecording);
      recorder.start(1000);
      setRecording(true);
    } catch {
      setRecording(false);
      toast({ title: 'Запись не запущена', description: 'Доступ к экрану или звуку не был выдан.' });
    }
  };

  const downloadRecording = () => {
    if (!recordingUrl) return;
    const link = document.createElement('a');
    link.href = recordingUrl;
    link.download = recordingName || 'meeting-recording.webm';
    link.click();
  };

  const sendMessage = () => {
    const trimmed = message.trim();
    if (!trimmed || !inCall) return;
    setMessages((current) => [...current, { id: Date.now(), author: 'Вы', body: trimmed }]);
    setMessage('');
  };

  const renderStatusBadge = (status: MeetingStatus) => (
    <Badge variant="secondary" className={cn('shrink-0 rounded-full', statusMeta[status].className)}>
      {statusMeta[status].label}
    </Badge>
  );

  const renderMeetingDetails = () => {
    if (!selectedMeeting) {
      return (
        <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
          {loading ? 'Загрузка встреч...' : 'Выберите встречу или запланируйте новую.'}
        </div>
      );
    }

    const scheduled = new Date(selectedMeeting.scheduledAt);
    const canStart = selectedMeeting.status === 'scheduled';
    const canJoin = selectedMeeting.status === 'live';
    const blocked = selectedMeeting.status === 'ended' || selectedMeeting.status === 'cancelled';

    return (
      <section className="flex min-h-0 flex-1 flex-col bg-background">
        <header className="border-b bg-background/80 px-6 py-5 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">{selectedMeeting.title}</h2>
                {renderStatusBadge(selectedMeeting.status)}
              </div>
              <p className="max-w-3xl text-sm text-muted-foreground">
                {selectedMeeting.description || 'Описание не указано'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить конференцию?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Конференция «{selectedMeeting.title}» будет удалена из списка. Это действие нельзя отменить.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={deleteMeeting}
                      disabled={deletingMeetingId === selectedMeeting.id}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {selectedMeeting.status === 'scheduled' && (
                <Button variant="outline" onClick={cancelMeeting}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Отменить
                </Button>
              )}
              {canStart && (
                <Button onClick={startMeeting}>
                  <Video className="mr-2 h-4 w-4" />
                  Начать конференцию
                </Button>
              )}
              {canJoin && (
                <Button onClick={joinMeeting}>
                  <Video className="mr-2 h-4 w-4" />
                  Присоединиться
                </Button>
              )}
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="grid gap-5 p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Информация о встрече</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{format(scheduled, 'd MMMM yyyy', { locale: ru })}</p>
                      <p className="text-muted-foreground">{format(scheduled, 'HH:mm')} · {selectedMeeting.durationMinutes} мин</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Напоминание</p>
                      <p className="text-muted-foreground">
                        {selectedMeeting.reminderMinutes === null ? 'Без напоминания' : `За ${selectedMeeting.reminderMinutes} минут`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ссылка-приглашение</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedMeeting.inviteLink ? (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input readOnly value={selectedMeeting.inviteLink} className="font-mono text-xs" />
                      <Button variant="outline" onClick={copyLink}>
                        <Copy className="mr-2 h-4 w-4" />
                        Скопировать ссылку
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ссылка для этой встречи не генерировалась.</p>
                  )}
                </CardContent>
              </Card>

              {meetingId && selectedMeeting.status === 'scheduled' && (
                <Card className="border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/20">
                  <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">Вы пришли по ссылке приглашения</p>
                      <p className="mt-1 text-sm text-blue-800/80 dark:text-blue-200/80">
                        Можно сразу открыть комнату звонка или дождаться запуска из списка встреч.
                      </p>
                    </div>
                    <Button onClick={startMeeting} className="shrink-0">
                      <Video className="mr-2 h-4 w-4" />
                      Войти сейчас
                    </Button>
                  </CardContent>
                </Card>
              )}

              {blocked && (
                <Card>
                  <CardContent className="p-5">
                    <p className="font-medium text-foreground">
                      {selectedMeeting.status === 'ended' ? 'Конференция завершена' : 'Конференция отменена'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">Войти в эту конференцию больше нельзя.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Участники
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[displayName, ...selectedMeeting.participants].map((person, index) => (
                  <div key={`${person}-${index}`} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {index === 0 && <AvatarImage src={profile?.avatar_url || ''} alt={person} />}
                      <AvatarFallback className="bg-blue-500/10 text-xs text-blue-600">{getInitials(person)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{person}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {index === 0 ? (isOrganizer ? 'Вы, организатор' : 'Вы') : 'Приглашен'}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </section>
    );
  };

  const renderCall = () => {
    if (!selectedMeeting) return null;

    return (
      <section
        ref={callShellRef}
        className={cn(
          'grid min-w-0 bg-slate-950 text-white',
          chatOpen ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1',
          theaterMode ? 'fixed inset-0 z-[100] h-screen w-screen' : 'h-full',
        )}
      >
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
          <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-slate-950 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-semibold">{selectedMeeting.title}</h2>
                <Badge className="shrink-0 rounded-full bg-emerald-500 text-white hover:bg-emerald-500">Идет сейчас</Badge>
                {recording && (
                  <Badge className="shrink-0 rounded-full bg-red-600 text-white hover:bg-red-600">
                    <span className="mr-1.5 h-2 w-2 rounded-full bg-white" />
                    Запись
                  </Badge>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-white/60">
                Комната: {toRoomName(selectedMeeting.id)} · {selectedMeeting.participants.length + 1} участников
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={copyLink} title="Скопировать ссылку">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('text-white hover:bg-white/10 hover:text-white', chatOpen && 'bg-white/10')}
                onClick={() => setChatOpen((value) => !value)}
                title={chatOpen ? 'Скрыть чат' : 'Показать чат'}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('text-white hover:bg-white/10 hover:text-white', recording && 'bg-red-600 hover:bg-red-700')}
                onClick={recording ? stopRecording : startRecording}
                title={recording ? 'Остановить запись' : 'Начать запись'}
              >
                {recording ? <Square className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
              </Button>
              {recordingUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 hover:text-white"
                  onClick={downloadRecording}
                  title="Скачать запись"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={openConferenceRoom}
                title="Открыть звонок в отдельной вкладке"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={toggleTheaterMode}
                title={theaterMode ? 'Свернуть' : 'На весь экран'}
              >
                {theaterMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="secondary" className="hidden rounded-full sm:inline-flex" onClick={resetCallControls}>
                Выйти
              </Button>
              <Button className="hidden rounded-full bg-red-600 text-white hover:bg-red-700 sm:inline-flex" onClick={endMeeting}>
                <PhoneOff className="mr-2 h-4 w-4" />
                Завершить
              </Button>
            </div>
          </header>

          <div className="relative min-h-0 bg-black">
            {shouldEmbedConference && (
              <iframe
                key={`${conferenceRoomUrl}-${conferenceReloadKey}`}
                title={`Звонок ${selectedMeeting.title}`}
                src={conferenceRoomUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                referrerPolicy="no-referrer"
                allowFullScreen
                onLoad={() => {
                  window.setTimeout(() => {
                    setConferenceLoadState((state) => (state === 'loading' ? 'failed' : state));
                  }, 6000);
                }}
                className="h-full min-h-[520px] w-full border-0"
              />
            )}
            {shouldEmbedConference && conferenceLoadState !== 'failed' && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 z-[5] h-52 w-40 bg-[#454545]"
              />
            )}
            {(!shouldEmbedConference || conferenceLoadState === 'failed') && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/85 px-6 text-center backdrop-blur-sm">
                <div className="max-w-md rounded-lg border border-white/10 bg-slate-950/95 p-6 shadow-2xl">
                  <Video className="mx-auto mb-4 h-10 w-10 text-blue-300" />
                  <h3 className="text-lg font-semibold text-white">Встроенный звонок не отрисовался</h3>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    Внешний видеосервер иногда загружается внутри приложения как чёрный экран. Попробуйте перезагрузить встроенный
                    звонок или открыть эту же комнату в отдельной вкладке.
                  </p>
                  <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                    {shouldEmbedConference && (
                      <Button
                        onClick={() => {
                          setConferenceLoadState('loading');
                          setConferenceReloadKey((key) => key + 1);
                        }}
                      >
                        Повторить внутри
                      </Button>
                    )}
                    <Button onClick={openConferenceRoom}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Открыть конференцию
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/65 p-2 shadow-2xl backdrop-blur sm:hidden">
              <Button variant="secondary" size="sm" className="rounded-full" onClick={resetCallControls}>
                Выйти
              </Button>
              <Button size="sm" className="rounded-full bg-red-600 text-white hover:bg-red-700" onClick={endMeeting}>
                <PhoneOff className="mr-2 h-4 w-4" />
                Завершить
              </Button>
            </div>
          </div>
        </div>

        <aside className={cn('min-h-0 border-l border-white/10 bg-background text-foreground', chatOpen ? 'hidden lg:flex lg:flex-col' : 'hidden')}>
          <div className="border-b p-4">
            <h3 className="text-sm font-semibold">Чат встречи</h3>
            <p className="text-xs text-muted-foreground">Сообщения доступны во время звонка</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-3 p-4">
              {messages.map((chatMessage) => (
                <div key={chatMessage.id} className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium text-foreground">{chatMessage.author}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{chatMessage.body}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') sendMessage();
                }}
                placeholder="Сообщение в чат"
              />
              <Button size="icon" onClick={sendMessage} title="Отправить">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>
      </section>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-112px)] min-h-[660px]">
      <div className="grid h-full grid-cols-1 overflow-hidden rounded-xl border bg-background shadow-sm lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="hidden border-r bg-muted/20 lg:flex lg:flex-col">
          <div className="border-b bg-background/80 p-4 backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold text-foreground">Видеоконференции</h1>
                <p className="text-xs text-muted-foreground">Запланированные встречи и приглашения</p>
              </div>
              <Button size="icon" className="shrink-0 rounded-full" onClick={() => setCreateOpen(true)} title="Новая встреча">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            <Button className="mb-3 w-full justify-start" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Новая встреча
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск встреч"
                className="h-10 rounded-full border-0 bg-muted pl-10 shadow-none"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2 p-3">
              {filteredMeetings.map((meeting) => {
                const active = meeting.id === selectedMeeting?.id;
                const scheduled = new Date(meeting.scheduledAt);
                return (
                  <button
                    key={meeting.id}
                    onClick={() => selectMeeting(meeting.id)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-all',
                      active ? 'border-primary bg-primary/10 shadow-sm' : 'border-transparent hover:border-border hover:bg-background',
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm font-medium leading-5 text-foreground">{meeting.title}</p>
                      {renderStatusBadge(meeting.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {format(scheduled, 'dd.MM HH:mm')}
                      </span>
                      <span className="flex min-w-0 items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span className="truncate">{meeting.participants.length} участников</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        <main className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between gap-3 border-b p-3 lg:hidden">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Новая встреча
            </Button>
            {selectedMeeting && renderStatusBadge(selectedMeeting.status)}
          </div>
          {inCall ? renderCall() : renderMeetingDetails()}
        </main>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Запланировать конференцию</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="meeting-title">Название встречи</Label>
              <Input
                id="meeting-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Например: Разбор инцидента"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-date">Дата</Label>
              <Input
                id="meeting-date"
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-time">Время начала</Label>
              <Input
                id="meeting-time"
                type="time"
                value={form.time}
                onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-duration">Длительность, минут</Label>
              <Input
                id="meeting-duration"
                type="number"
                min="1"
                value={form.durationMinutes}
                onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-reminder">Напоминание, минут</Label>
              <Input
                id="meeting-reminder"
                type="number"
                min="0"
                value={form.reminderMinutes}
                onChange={(event) => setForm((current) => ({ ...current, reminderMinutes: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="meeting-participants">Участники</Label>
              <Input
                id="meeting-participants"
                value={form.participants}
                onChange={(event) => setForm((current) => ({ ...current, participants: event.target.value }))}
                placeholder="Имена или email через запятую"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="meeting-description">Описание</Label>
              <Textarea
                id="meeting-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Повестка, контекст, ссылки"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Сразу сгенерировать ссылку</p>
                <p className="text-xs text-muted-foreground">Ссылка будет доступна в деталях встречи</p>
              </div>
              <Switch
                checked={form.generateLink}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, generateLink: checked }))}
              />
            </div>
            <Separator className="sm:col-span-2" />
            <Button className="sm:col-span-2" onClick={createMeeting} disabled={!form.title.trim()}>
              Запланировать конференцию
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

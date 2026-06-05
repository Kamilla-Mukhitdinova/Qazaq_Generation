import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCheck,
  FileText,
  Loader2,
  MessageSquare,
  Mic,
  Palette,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  Square,
  User,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const getRoomTime = (room: any) => {
  const dateValue = room.last_message?.created_at || room.last_message?.createdAt || room.created_at || room.createdAt;
  return dateValue ? format(new Date(dateValue), 'HH:mm') : '';
};

const CHAT_BACKGROUNDS = [
  {
    id: 'soft',
    label: 'Soft',
    className: 'bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_28%),linear-gradient(180deg,hsl(var(--muted)/0.25),transparent)]',
    swatch: 'bg-gradient-to-br from-blue-100 via-background to-slate-100',
  },
  {
    id: 'clean',
    label: 'Clean',
    className: 'bg-background',
    swatch: 'bg-background',
  },
  {
    id: 'mint',
    label: 'Mint',
    className: 'bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_30%),linear-gradient(180deg,rgba(236,253,245,0.75),rgba(255,255,255,0.45))] dark:bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_30%),linear-gradient(180deg,rgba(6,78,59,0.18),transparent)]',
    swatch: 'bg-gradient-to-br from-emerald-100 via-teal-50 to-background',
  },
  {
    id: 'sky',
    label: 'Sky',
    className: 'bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_32%),linear-gradient(180deg,rgba(224,242,254,0.78),rgba(255,255,255,0.42))] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.17),transparent_32%),linear-gradient(180deg,rgba(12,74,110,0.18),transparent)]',
    swatch: 'bg-gradient-to-br from-sky-100 via-cyan-50 to-background',
  },
];

const getAvatarUrl = (profile: any) => profile?.avatarUrl || profile?.avatar_url || '';
const getProfileUserId = (profile: any) => profile?.userId || profile?.user_id;
const getMemberUserId = (member: any) => member?.user_id || member?.userId;
const getMessageType = (message: any) => message?.message_type || message?.messageType || 'text';
const getFileName = (message: any) => message?.file_name || message?.fileName || message?.body || 'file';
const getFileSize = (message: any) => message?.file_size || message?.fileSize;
const normalizeText = (value?: string) => (value || '').trim().toLowerCase();
const isLiyaProfile = (profile: any) => {
  const name = normalizeText(profile?.name);
  const email = normalizeText(profile?.email);
  return name.includes('лия') || name.includes('liya') || email.includes('liya');
};
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function InternalChat() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchRooms, setSearchRooms] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatBackground, setChatBackground] = useState(() => localStorage.getItem('qg-chat-background') || 'soft');
  const [isRecording, setIsRecording] = useState(false);
  const [startingDirectId, setStartingDirectId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingStartedAtRef = useRef<number>(0);
  const userId = user?.id;

  const { data: profiles = [] } = useQuery({
    queryKey: ['chat-profiles'],
    queryFn: () => api.getProfiles(),
  });

  const { data: rooms = [], refetch: refetchRooms } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => api.getChatRooms(),
    enabled: !!userId,
    refetchInterval: 5000,
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', selectedRoom],
    queryFn: () => (selectedRoom ? api.getChatMessages(selectedRoom) : Promise.resolve([])),
    enabled: !!selectedRoom,
    refetchInterval: 2500,
  });

  const profileMap = useMemo(() => {
    const map: Record<string, any> = {};
    profiles.forEach((p: any) => {
      const profileUserId = getProfileUserId(p);
      if (profileUserId) map[profileUserId] = p;
    });
    return map;
  }, [profiles]);

  const selectedRoomData = rooms.find((r: any) => r.id === selectedRoom);
  const activeBackground = CHAT_BACKGROUNDS.find((background) => background.id === chatBackground) || CHAT_BACKGROUNDS[0];

  const upsertRoomInCache = (room: any) => {
    if (!room?.id) return;
    queryClient.setQueryData<any[]>(['chat-rooms'], (currentRooms = []) => {
      const withoutCreatedRoom = currentRooms.filter((currentRoom: any) => currentRoom.id !== room.id);
      return [room, ...withoutCreatedRoom];
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedRoom]);

  useEffect(() => {
    if (!profile?.user_id) return;
    queryClient.setQueryData<any[]>(['chat-profiles'], (currentProfiles = []) => {
      const normalizedProfile = {
        ...profile,
        userId: profile.user_id,
        avatarUrl: profile.avatar_url,
      };
      const withoutOwnProfile = currentProfiles.filter((item: any) => getProfileUserId(item) !== profile.user_id);
      return [normalizedProfile, ...withoutOwnProfile];
    });
  }, [profile, queryClient]);

  const getRoomDisplayName = (room: any) => {
    if (room.type === 'group' && room.name) return room.name;
    const otherMembers = room.chat_room_members
      ?.filter((m: any) => getMemberUserId(m) !== userId)
      .map((m: any) => profileMap[getMemberUserId(m)]?.name || t('common.unknownUser'));
    return otherMembers?.join(', ') || t('chat.direct');
  };

  const getRoomSubtitle = (room: any) => {
    const lastMessage = room.last_message;
    if (lastMessage?.body) {
      const senderId = lastMessage.sender_id || lastMessage.senderId;
      const senderName = senderId === userId ? t('chat.you') : profileMap[senderId]?.name;
      const prefix = room.type === 'group' && senderName ? `${senderName}: ` : '';
      return `${prefix}${lastMessage.body}`;
    }
    return room.type === 'group'
      ? `${room.chat_room_members?.length || 0} ${t('chat.members')}`
      : t('chat.direct');
  };

  const filteredRooms = rooms.filter((room: any) => {
    const query = searchRooms.trim().toLowerCase();
    if (!query) return true;
    return `${getRoomDisplayName(room)} ${getRoomSubtitle(room)}`.toLowerCase().includes(query);
  });

  const quickPeople = profiles
    .filter((p: any) => getProfileUserId(p) && getProfileUserId(p) !== userId)
    .filter((p: any) => {
      const query = normalizeText(searchRooms);
      if (!query) return true;
      return `${p.name || ''} ${p.email || ''}`.toLowerCase().includes(query);
    })
    .sort((a: any, b: any) => {
      if (isLiyaProfile(a) && !isLiyaProfile(b)) return -1;
      if (!isLiyaProfile(a) && isLiyaProfile(b)) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });

  const filteredProfiles = profiles.filter(
    (p: any) => getProfileUserId(p) !== userId && (!userSearch || p.name.toLowerCase().includes(userSearch.toLowerCase())),
  );

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!selectedRoom) return;
      await api.sendChatMessage(selectedRoom, body);
    },
    onSuccess: () => {
      setMessage('');
      refetchMessages();
      refetchRooms();
    },
    onError: (err: any) => toast({ title: t('common.error'), description: err.message, variant: 'destructive' }),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, messageType, durationMs, fileName }: { file: File | Blob; messageType: 'file' | 'audio'; durationMs?: number; fileName?: string }) => {
      if (!selectedRoom) return;
      await api.uploadChatMessage(selectedRoom, file, { messageType, durationMs, fileName });
    },
    onSuccess: () => {
      refetchMessages();
      refetchRooms();
    },
    onError: (err: any) => toast({ title: t('common.error'), description: err.message, variant: 'destructive' }),
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const membersWithSelf = [...new Set([...selectedMembers, userId].filter(Boolean))] as string[];
      const isGroup = membersWithSelf.length > 2 || !!newGroupName.trim();
      return api.createChatRoom({
        name: isGroup ? newGroupName.trim() || `Group (${membersWithSelf.length})` : undefined,
        type: isGroup ? 'group' : 'direct',
        memberIds: membersWithSelf,
      });
    },
    onSuccess: (room: any) => {
      upsertRoomInCache(room);
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] });
      setCreateDialogOpen(false);
      setNewGroupName('');
      setSelectedMembers([]);
      setUserSearch('');
      if (room?.id) setSelectedRoom(room.id);
    },
    onError: (err: any) => toast({ title: t('common.error'), description: err.message, variant: 'destructive' }),
  });

  const startDirect = async (otherUserId?: string) => {
    if (!userId || !otherUserId || startingDirectId) return;
    const existingRoom = rooms.find(
      (room: any) =>
        room.type === 'direct' &&
        room.chat_room_members?.length === 2 &&
        room.chat_room_members.some((m: any) => getMemberUserId(m) === userId) &&
        room.chat_room_members.some((m: any) => getMemberUserId(m) === otherUserId),
    );

    if (existingRoom) {
      setSelectedRoom(existingRoom.id);
      return;
    }

    setStartingDirectId(otherUserId);
    try {
      const room: any = await api.createChatRoom({ type: 'direct', memberIds: [otherUserId] });
      upsertRoomInCache(room);
      refetchRooms();
      setSelectedRoom(room.id);
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    } finally {
      setStartingDirectId(null);
    }
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploadMutation.isPending) return;
    uploadMutation.mutate({ file, messageType: 'file' });
  };

  const startRecording = async () => {
    if (!selectedRoom || isRecording || uploadMutation.isPending) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const durationMs = Date.now() - recordingStartedAtRef.current;
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        if (blob.size > 0) {
          uploadMutation.mutate({
            file: blob,
            messageType: 'audio',
            durationMs,
            fileName: `voice-${Date.now()}.webm`,
          });
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: t('common.error'), description: t('chat.microphoneDenied'), variant: 'destructive' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const getMessageDateLabel = (dateValue: string) => {
    const date = new Date(dateValue);
    if (isToday(date)) return t('chat.today');
    if (isYesterday(date)) return t('chat.yesterday');
    return format(date, 'dd.MM.yyyy');
  };

  const setBackground = (backgroundId: string) => {
    setChatBackground(backgroundId);
    localStorage.setItem('qg-chat-background', backgroundId);
  };

  const getDirectRoomProfile = (room: any) => {
    const otherMember = room.chat_room_members?.find((member: any) => getMemberUserId(member) !== userId);
    return otherMember ? profileMap[getMemberUserId(otherMember)] : null;
  };

  const renderRoomAvatar = (room: any, size = 'h-11 w-11') => {
    if (room.type === 'group') {
      return (
        <div className={cn('flex shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-300', size)}>
          <Users className="h-5 w-5" />
        </div>
      );
    }

    const directProfile = getDirectRoomProfile(room);
    return (
      <Avatar className={cn('shrink-0', size)}>
        <AvatarImage src={getAvatarUrl(directProfile)} alt={directProfile?.name || t('chat.direct')} />
        <AvatarFallback className="bg-blue-500/10 text-xs text-blue-600">
          {directProfile?.name ? getInitials(directProfile.name) : <User className="h-5 w-5" />}
        </AvatarFallback>
      </Avatar>
    );
  };

  let previousDate = '';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-112px)] min-h-[620px]">
      <div className="flex h-full overflow-hidden rounded-xl border bg-background shadow-sm">
        <aside className={cn('w-full flex-col border-r bg-muted/20 md:flex md:w-[360px]', selectedRoomData ? 'hidden md:flex' : 'flex')}>
          <div className="border-b bg-background/80 p-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-foreground">{t('chat.title')}</h1>
                <p className="text-xs text-muted-foreground">{rooms.length} {t('chat.chats').toLowerCase()}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setSettingsOpen(true)} title={t('chat.customize')}>
                  <Settings className="h-5 w-5" />
                </Button>
                <Button size="icon" className="rounded-full" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchRooms}
                onChange={(e) => setSearchRooms(e.target.value)}
                placeholder={t('common.search')}
                className="h-10 rounded-full border-0 bg-muted pl-10 shadow-none"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              <p className="px-3 pb-2 text-xs font-medium uppercase text-muted-foreground">{t('chat.people')}</p>
              {quickPeople.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">{t('chat.noPeople')}</div>
              ) : (
                quickPeople.map((person: any) => (
                  <button
                    key={getProfileUserId(person)}
                    onClick={() => startDirect(getProfileUserId(person))}
                    disabled={!!startingDirectId}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={getAvatarUrl(person)} alt={person.name} />
                      <AvatarFallback className="bg-blue-500/10 text-xs text-blue-600">{getInitials(person.name || '?')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{person.name}</p>
                      <p className="text-xs text-muted-foreground">{t('chat.direct')}</p>
                    </div>
                    {startingDirectId === getProfileUserId(person) && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
                  </button>
                ))
              )}
            </div>

            <Separator className="mx-4 my-2" />

            <div className="p-2">
              <p className="px-3 pb-2 text-xs font-medium uppercase text-muted-foreground">{t('chat.chats')}</p>
              {filteredRooms.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('chat.noChats')}</div>
              ) : (
                filteredRooms.map((room: any) => {
                  const active = selectedRoom === room.id;
                  return (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room.id)}
                      className={cn(
                        'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                        active ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted',
                      )}
                    >
                      {renderRoomAvatar(room)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{getRoomDisplayName(room)}</p>
                          {room.type === 'group' && (
                            <Badge variant={active ? 'secondary' : 'outline'} className="h-5 shrink-0 rounded-full px-1.5 text-[10px]">
                              {room.chat_room_members?.length || 0}
                            </Badge>
                          )}
                        </div>
                        <p className={cn('mt-0.5 truncate text-xs', active ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                          {getRoomSubtitle(room)}
                        </p>
                      </div>
                      <span className={cn('shrink-0 self-start pt-0.5 text-[11px]', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {getRoomTime(room)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </aside>

        <main className={cn('min-w-0 flex-1 flex-col', selectedRoomData ? 'flex' : 'hidden md:flex')}>
          {selectedRoomData ? (
            <>
              <div className="flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedRoom(null)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {renderRoomAvatar(selectedRoomData, 'h-10 w-10')}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-foreground">{getRoomDisplayName(selectedRoomData)}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedRoomData.type === 'group'
                      ? `${selectedRoomData.chat_room_members?.length || 0} ${t('chat.members')}`
                      : t('chat.direct')}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSettingsOpen(true)} title={t('chat.customize')}>
                  <Settings className="h-5 w-5" />
                </Button>
              </div>

              <ScrollArea className={cn('flex-1', activeBackground.className)}>
                <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-5">
                  {messages.length === 0 && (
                    <div className="flex min-h-[360px] items-center justify-center text-center text-muted-foreground">
                      <div>
                        <MessageSquare className="mx-auto mb-3 h-12 w-12 opacity-25" />
                        <p className="text-sm">{t('chat.noMessages')}</p>
                      </div>
                    </div>
                  )}

                  {messages.map((msg: any) => {
                    const isOwn = msg.sender_id === userId || msg.senderId === userId;
                    const senderId = msg.sender_id || msg.senderId;
                    const sender = profileMap[senderId];
                    const createdAt = msg.created_at || msg.createdAt;
                    const messageType = getMessageType(msg);
                    const fileUrl = messageType !== 'text' ? api.getChatMessageFileUrl(msg.id) : '';
                    const dateLabel = getMessageDateLabel(createdAt);
                    const showDate = previousDate !== dateLabel;
                    previousDate = dateLabel;

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="my-4 flex justify-center">
                            <span className="rounded-full bg-background/85 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                              {dateLabel}
                            </span>
                          </div>
                        )}
                        <div className={cn('mb-2 flex', isOwn ? 'justify-end' : 'justify-start')}>
                          <div className={cn('flex max-w-[82%] gap-2 sm:max-w-[68%]', isOwn && 'flex-row-reverse')}>
                            {!isOwn && (
                              <Avatar className="mt-1 h-8 w-8">
                                <AvatarImage src={getAvatarUrl(sender)} alt={sender?.name || t('common.unknownUser')} />
                                <AvatarFallback className="bg-background text-xs text-muted-foreground">
                                  {getInitials(sender?.name || '?')}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              {!isOwn && selectedRoomData.type === 'group' && (
                                <p className="mb-1 px-1 text-xs font-medium text-blue-600 dark:text-blue-300">
                                  {sender?.name || t('common.unknownUser')}
                                </p>
                              )}
                              <div
                                className={cn(
                                  'rounded-2xl px-3.5 py-2 shadow-sm',
                                  isOwn
                                    ? 'rounded-br-md bg-primary text-primary-foreground'
                                    : 'rounded-bl-md bg-background text-foreground',
                                )}
                              >
                                {messageType === 'audio' ? (
                                  <audio controls src={fileUrl} className="h-9 w-64 max-w-full" />
                                ) : messageType === 'file' ? (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={cn(
                                      'flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors',
                                      isOwn
                                        ? 'border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15'
                                        : 'border-border bg-muted/50 hover:bg-muted',
                                    )}
                                  >
                                    <FileText className="h-5 w-5 shrink-0" />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate font-medium">{getFileName(msg)}</span>
                                      <span className={cn('block text-xs', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                        {formatFileSize(getFileSize(msg))}
                                      </span>
                                    </span>
                                  </a>
                                ) : (
                                  <p className="whitespace-pre-wrap break-words text-sm leading-5">{msg.body}</p>
                                )}
                                <div className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                  <span>{format(new Date(createdAt), 'HH:mm')}</span>
                                  {isOwn && <CheckCheck className="h-3 w-3" />}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t bg-background p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="mx-auto flex max-w-3xl items-end gap-2"
                >
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-full"
                    disabled={!selectedRoom || uploadMutation.isPending || isRecording}
                    onClick={() => fileInputRef.current?.click()}
                    title={t('chat.attachFile')}
                  >
                    {uploadMutation.isPending && !isRecording ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={t('chat.typePlaceholder')}
                    className="max-h-36 min-h-11 resize-none rounded-2xl border-0 bg-muted px-4 py-3 shadow-none focus-visible:ring-1"
                    rows={1}
                  />
                  <Button
                    type="button"
                    variant={isRecording ? 'destructive' : 'ghost'}
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-full"
                    disabled={!selectedRoom || uploadMutation.isPending}
                    onClick={isRecording ? stopRecording : startRecording}
                    title={isRecording ? t('chat.stopRecording') : t('chat.recordVoice')}
                  >
                    {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={!message.trim() || sendMutation.isPending}>
                    {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-muted/20 text-center">
              <div className="max-w-sm px-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">{t('chat.selectChat')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('chat.startNew')}</p>
              </div>
            </div>
          )}
        </main>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('chat.customize')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                {t('chat.background')}
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {CHAT_BACKGROUNDS.map((background) => (
                  <button
                    key={background.id}
                    type="button"
                    onClick={() => setBackground(background.id)}
                    className={cn(
                      'h-16 rounded-lg border p-1 transition-all hover:scale-[1.02]',
                      chatBackground === background.id ? 'border-primary ring-2 ring-primary/25' : 'border-border',
                    )}
                    title={background.label}
                  >
                    <span className={cn('block h-full rounded-md', background.swatch)} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('chat.newGroup')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('chat.groupName')}</Label>
              <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder={t('chat.groupPlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>
                {t('chat.groupMembers')} ({selectedMembers.length})
              </Label>
              <Input placeholder={t('common.search')} value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
              <ScrollArea className="h-56 rounded-md border">
                <div className="space-y-1 p-2">
                  {filteredProfiles.map((person: any) => (
                    <label key={getProfileUserId(person)} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted">
                      <Checkbox
                        checked={selectedMembers.includes(getProfileUserId(person))}
                        onCheckedChange={(checked) => {
                          setSelectedMembers((prev) =>
                            checked ? [...prev, getProfileUserId(person)] : prev.filter((id) => id !== getProfileUserId(person)),
                          );
                        }}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getAvatarUrl(person)} alt={person.name} />
                        <AvatarFallback className="bg-blue-500/10 text-xs text-blue-600">{getInitials(person.name)}</AvatarFallback>
                      </Avatar>
                      <span className="truncate text-sm">{person.name}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => createGroupMutation.mutate()} disabled={selectedMembers.length === 0 || createGroupMutation.isPending}>
                {createGroupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

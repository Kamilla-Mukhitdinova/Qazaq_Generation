import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Send, Plus, Users, MessageSquare, Search, Hash, User } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export default function InternalChat() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchRooms, setSearchRooms] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = user?.id;

  // Fetch all profiles for member selection
  const { data: profiles = [] } = useQuery({
    queryKey: ['chat-profiles'],
    queryFn: () => api.getProfiles(),
  });

  // Fetch user's chat rooms
  const { data: rooms = [], refetch: refetchRooms } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => api.getChatRooms(),
    enabled: !!userId,
  });

  // Fetch messages for selected room
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', selectedRoom],
    queryFn: () => selectedRoom ? api.getChatMessages(selectedRoom) : Promise.resolve([]),
    enabled: !!selectedRoom,
    refetchInterval: 3000, // Poll every 3s since no realtime
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!selectedRoom || !userId) return;
      await api.sendChatMessage(selectedRoom, body);
    },
    onSuccess: () => {
      setMessage('');
      refetchMessages();
    },
    onError: (err: any) => toast({ title: t('common.error'), description: err.message, variant: 'destructive' }),
  });

  // Create group
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const membersWithSelf = [...new Set([...selectedMembers, userId])];
      const isGroup = membersWithSelf.length > 2 || newGroupName;
      
      const room = await api.createChatRoom({
        name: isGroup ? newGroupName || `Group (${membersWithSelf.length})` : undefined,
        type: isGroup ? 'group' : 'direct',
        memberIds: membersWithSelf,
      });

      return room.id;
    },
    onSuccess: (roomId) => {
      refetchRooms();
      setCreateDialogOpen(false);
      setNewGroupName('');
      setSelectedMembers([]);
      if (roomId) setSelectedRoom(roomId);
    },
    onError: (err: any) => toast({ title: t('common.error'), description: err.message, variant: 'destructive' }),
  });

  // Start direct chat
  const startDirect = async (otherUserId: string) => {
    if (!userId) return;
    // Check if direct room already exists
    const existingRoom = rooms.find((r: any) =>
      r.type === 'direct' &&
      r.chat_room_members?.length === 2 &&
      r.chat_room_members.some((m: any) => m.user_id === userId) &&
      r.chat_room_members.some((m: any) => m.user_id === otherUserId)
    );
    if (existingRoom) {
      setSelectedRoom(existingRoom.id);
      return;
    }
    try {
      const room = await api.createChatRoom({
        type: 'direct',
        memberIds: [userId, otherUserId],
      });
      refetchRooms();
      setSelectedRoom(room.id);
    } catch (err: any) {
      toast({ title: t('common.error'), description: err.message, variant: 'destructive' });
    }
  };

  const profileMap = useMemo(() => {
    const map: Record<string, any> = {};
    profiles.forEach((p: any) => { map[p.user_id] = p; });
    return map;
  }, [profiles]);

  const getRoomDisplayName = (room: any) => {
    if (room.type === 'group' && room.name) return room.name;
    const otherMembers = room.chat_room_members
      ?.filter((m: any) => m.user_id !== userId)
      .map((m: any) => profileMap[m.user_id]?.name || t('common.unknownUser'));
    return otherMembers?.join(', ') || 'Chat';
  };

  const filteredRooms = rooms.filter((r: any) => {
    if (!searchRooms) return true;
    return getRoomDisplayName(r).toLowerCase().includes(searchRooms.toLowerCase());
  });

  const filteredProfiles = profiles.filter((p: any) =>
    p.user_id !== userId && (!userSearch || p.name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const selectedRoomData = rooms.find((r: any) => r.id === selectedRoom);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-120px)]">
      <div className="flex h-full gap-0 border rounded-xl overflow-hidden bg-card">
        {/* Sidebar - Room list */}
        <div className="w-80 border-r flex flex-col bg-muted/30">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground">{t('chat.title')}</h2>
              <Button size="icon" variant="ghost" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchRooms}
                onChange={e => setSearchRooms(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {/* Users section for starting direct chats */}
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                {t('chat.chats')}
              </p>
              {filteredRooms.length === 0 ? (
                <p className="px-3 py-6 text-sm text-muted-foreground text-center">
                  {t('chat.noChats')}
                </p>
              ) : filteredRooms.map((room: any) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selectedRoom === room.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${
                    room.type === 'group' ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    {room.type === 'group' ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getRoomDisplayName(room)}</p>
                    <p className="text-xs text-muted-foreground">
                      {room.type === 'group'
                        ? `${room.chat_room_members?.length || 0} ${t('chat.members')}`
                        : t('chat.direct')}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <Separator className="my-2" />

            {/* Quick start direct chat */}
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                {t('chat.people')}
              </p>
              {profiles.filter((p: any) => p.user_id !== userId).slice(0, 10).map((p: any) => (
                <button
                  key={p.user_id}
                  onClick={() => startDirect(p.user_id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(p.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {selectedRoomData ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  selectedRoomData.type === 'group' ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'
                }`}>
                  {selectedRoomData.type === 'group' ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{getRoomDisplayName(selectedRoomData)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedRoomData.chat_room_members?.length || 0} {t('chat.members')}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>{t('chat.noMessages')}</p>
                    </div>
                  )}
                  {messages.map((msg: any) => {
                    const isOwn = msg.sender_id === userId;
                    const sender = profileMap[msg.sender_id];
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {!isOwn && (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                {getInitials(sender?.name || '?')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            {!isOwn && (
                              <p className="text-xs text-muted-foreground mb-1">{sender?.name || t('common.unknownUser')}</p>
                            )}
                            <div className={`rounded-2xl px-4 py-2 ${
                              isOwn
                                ? 'bg-primary text-primary-foreground rounded-tr-md'
                                : 'bg-muted text-foreground rounded-tl-md'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                            </div>
                            <p className={`text-[10px] text-muted-foreground mt-1 ${isOwn ? 'text-right' : ''}`}>
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message input */}
              <div className="p-4 border-t">
                <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                  <Input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={t('chat.typePlaceholder')}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!message.trim() || sendMutation.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">{t('chat.selectChat')}</p>
                <p className="text-sm mt-1">{t('chat.startNew')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create group dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('chat.newGroup')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('chat.groupName')}</Label>
              <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder={t('chat.groupPlaceholder')} />
            </div>
            <div>
              <Label>{t('chat.groupMembers')} ({selectedMembers.length})</Label>
              <Input
                placeholder={t('common.search')}
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="mt-1"
              />
              <ScrollArea className="h-48 mt-2 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredProfiles.map((p: any) => (
                    <label key={p.user_id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={selectedMembers.includes(p.user_id)}
                        onCheckedChange={checked => {
                          setSelectedMembers(prev =>
                            checked ? [...prev, p.user_id] : prev.filter(id => id !== p.user_id)
                          );
                        }}
                      />
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{getInitials(p.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => createGroupMutation.mutate()}
                disabled={selectedMembers.length === 0 || createGroupMutation.isPending}
              >
                {t('common.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

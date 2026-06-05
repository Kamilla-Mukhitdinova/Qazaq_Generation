import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, X, Send, Loader2, Bot, User, Minimize2, Maximize2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useLocation } from 'react-router-dom';
import aiGirlImg from '@/assets/ai-girl.png';
import { api } from '@/lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AIFloatingChat() {
  const { t, language } = useLanguage();
  const { profile, role } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: '1', role: 'assistant',
        content: t('ai.welcome')
      }]);
    }
  }, [isOpen, language]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const getUserContext = useCallback(() => ({
    name: profile?.name,
    email: profile?.email,
    role: role,
    department: (profile as any)?.department_id || null,
  }), [profile, role]);

  // Auto-suggestions
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (input.trim().length < 3) { setSuggestions([]); return; }
    
    suggestTimer.current = setTimeout(async () => {
      try {
        const resp = await fetch(
          `${API_BASE}/ai-chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${api.getToken()}`,
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: input }],
              suggestMode: true,
              language,
              userContext: getUserContext(),
            }),
          }
        );
        if (resp.ok) {
          const data = await resp.json();
          setSuggestions(data.suggestions || []);
        }
      } catch { /* ignore */ }
    }, 800);

    return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); };
  }, [input, getUserContext, language]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSuggestions([]);
    setIsLoading(true);

    try {
      if (looksLikeAgentCommand(msg)) {
        const result = await api.runAIAgent(msg, { language });
        const ticketId = result.ticket?.id;
        const content = [
          result.message || 'Готово.',
          ticketId ? `\n\nТикет: [${ticketId.slice(0, 8)}](/tickets/${ticketId})` : '',
        ].join('');
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content }]);
        return;
      }

      const response = await fetch(
        `${API_BASE}/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${api.getToken()}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
            language,
            userContext: getUserContext(),
          }),
        }
      );

      if (!response.ok) throw new Error('AI request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      if (reader) {
        let textBuffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m));
              }
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: t('common.error') }]);
    } finally {
      setIsLoading(false);
    }
  };

  const looksLikeAgentCommand = (text: string) => {
    const value = text.toLowerCase();
    return [
      'создай тикет',
      'создать тикет',
      'создай заявку',
      'создать заявку',
      'поменяй статус',
      'измени статус',
      'закрой тикет',
      'назначь тикет',
      'назначить тикет',
      'assign ticket',
      'create ticket',
      'change status',
    ].some((pattern) => value.includes(pattern));
  };

  if (isAuthPage) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow overflow-hidden group"
          >
            <motion.img 
              src={aiGirlImg} 
              alt="AI" 
              className="h-14 w-14 object-cover rounded-full"
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, height: isMinimized ? 'auto' : '500px' }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] rounded-2xl overflow-hidden shadow-2xl bg-background border"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground">
              <div className="flex items-center gap-3">
                <motion.img 
                  src={aiGirlImg} 
                  alt="qazaq_mind" 
                  className="h-10 w-10 rounded-full border-2 border-white/30 object-cover"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                />
                <div>
                  <h3 className="font-semibold text-sm">{t('ai.title')} - qazaq_mind</h3>
                  <p className="text-xs opacity-80">{profile?.name || t('ai.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/20" onClick={() => setIsMinimized(!isMinimized)}>
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/20" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <AnimatePresence>
              {!isMinimized && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <ScrollArea className="h-[360px] p-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          {message.role === 'assistant' ? (
                            <img src={aiGirlImg} alt="AI" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="bg-muted">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`rounded-2xl px-4 py-2 max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {isLoading && messages[messages.length - 1]?.role === 'user' && (
                        <div className="flex gap-3">
                          <img src={aiGirlImg} alt="AI" className="h-8 w-8 rounded-full object-cover" />
                          <div className="bg-muted rounded-2xl px-4 py-3">
                            <div className="flex gap-1">
                              {[0, 0.2, 0.4].map((d, i) => (
                                <motion.span key={i} className="h-2 w-2 bg-foreground/50 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: d }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Suggestions */}
                  <AnimatePresence>
                    {suggestions.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-4 pb-1">
                        <div className="flex flex-wrap gap-1">
                          {suggestions.map((s, i) => (
                            <button key={i} onClick={() => { setInput(s); setSuggestions([]); }}
                              className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />{s.length > 40 ? s.slice(0, 40) + '...' : s}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="p-4 border-t bg-muted/30">
                    <div className="flex gap-2">
                      <Input value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder={t('ai.placeholder')} disabled={isLoading} className="flex-1" />
                      <Button onClick={() => handleSend()} disabled={isLoading || !input.trim()} size="icon">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

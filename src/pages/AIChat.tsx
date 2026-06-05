import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, User, Sparkles, FileText, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import aiGirlImg from '@/assets/ai-girl.png';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function AIChat() {
  const { profile, role } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatType, setChatType] = useState<'general' | 'ticket_analysis' | 'report_generation'>('general');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const userMsg: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(`${API_BASE}/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${api.getToken()}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          type: chatType,
          language,
          userContext: {
            name: profile?.name,
            email: profile?.email,
            role: role,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('common.error'));
      }

      if (!response.body) throw new Error('Stream missing');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

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
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `${t('common.error')}: ${error instanceof Error ? error.message : ''}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    if (looksLikeAgentCommand(text)) runAgentCommand(text);
    else streamChat(text);
  };

  const quickPrompts: Record<string, { icon: typeof FileText; label: string; prompt: string }[]> = {
    kk: [
      { icon: FileText, label: 'Тикет талдау', prompt: 'Соңғы тикеттерді талдап, жиі кездесетін мәселелерді көрсет' },
      { icon: BarChart3, label: 'Апталық есеп', prompt: 'Апталық есеп жаса' },
      { icon: Sparkles, label: 'Ұсыныстар', prompt: 'Қызмет көрсетуді жақсарту бойынша ұсыныстар бер' },
    ],
    ru: [
      { icon: FileText, label: 'Анализ тикетов', prompt: 'Проанализируй последние тикеты и покажи частые проблемы' },
      { icon: BarChart3, label: 'Недельный отчёт', prompt: 'Составь недельный отчёт' },
      { icon: Sparkles, label: 'Рекомендации', prompt: 'Дай рекомендации по улучшению сервиса' },
    ],
    en: [
      { icon: FileText, label: 'Ticket Analysis', prompt: 'Analyze recent tickets and show common issues' },
      { icon: BarChart3, label: 'Weekly Report', prompt: 'Generate a weekly report' },
      { icon: Sparkles, label: 'Suggestions', prompt: 'Give suggestions for service improvement' },
    ],
  };

  const currentPrompts = quickPrompts[language] || quickPrompts.kk;

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

  const runAgentCommand = async (userMessage: string) => {
    const userMsg: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = await api.runAIAgent(userMessage, { language });
      const ticketId = result.ticket?.id;
      const content = [
        result.message || 'Готово.',
        ticketId ? `\n\nТикет: [${ticketId.slice(0, 8)}](/tickets/${ticketId})` : '',
      ].join('');
      setMessages(prev => [...prev, { role: 'assistant', content }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `${t('common.error')}: ${error.message || ''}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const chatTypeLabels: Record<string, Record<string, string>> = {
    general: { kk: 'Жалпы', ru: 'Общий', en: 'General' },
    ticket_analysis: { kk: 'Тикет талдау', ru: 'Анализ тикетов', en: 'Ticket Analysis' },
    report_generation: { kk: 'Есеп құру', ru: 'Генерация отчётов', en: 'Reports' },
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.img 
            src={aiGirlImg} 
             alt="qazaq_mind" 
            className="h-14 w-14 rounded-full border-2 border-primary/30 object-cover shadow-lg"
            animate={{ y: [0, -4, 0], rotate: [0, 3, -3, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {t('ai.title')} - qazaq_mind
            </h1>
            <p className="text-muted-foreground">{t('ai.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['general', 'ticket_analysis', 'report_generation'] as const).map(ct => (
            <Badge
              key={ct}
              variant={chatType === ct ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setChatType(ct)}
            >
              {chatTypeLabels[ct][language]}
            </Badge>
          ))}
        </div>
      </div>

      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('common.chatHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12">
                <motion.img 
                  src={aiGirlImg} 
                  alt="qazaq_mind" 
                  className="h-28 w-28 rounded-full border-4 border-primary/20 object-cover shadow-xl mb-4"
                  animate={{ y: [0, -8, 0], scale: [1, 1.03, 1] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                />
                <p className="text-muted-foreground text-center mb-6">
                  {t('ai.welcome')}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {currentPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => streamChat(prompt.prompt)}
                      disabled={isLoading}
                    >
                      <prompt.icon className="h-4 w-4 mr-2" />
                      {prompt.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <img src={aiGirlImg} alt="AI" className="h-8 w-8 rounded-full object-cover shrink-0" />
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-3">
                    <img src={aiGirlImg} alt="AI" className="h-8 w-8 rounded-full object-cover" />
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('ai.placeholder')}
                className="min-h-[44px] max-h-32 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock3, Loader2, ShieldCheck, Sparkles, Target, Wand2 } from 'lucide-react';
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

const priorityMeta = {
  low: { response: { kk: '8 сағ', ru: '8 ч', en: '8 h' }, resolve: { kk: '5 жұмыс күні', ru: '5 раб. дней', en: '5 business days' }, color: 'bg-slate-500/10 text-slate-600' },
  medium: { response: { kk: '4 сағ', ru: '4 ч', en: '4 h' }, resolve: { kk: '3 жұмыс күні', ru: '3 раб. дня', en: '3 business days' }, color: 'bg-blue-500/10 text-blue-600' },
  high: { response: { kk: '1 сағ', ru: '1 ч', en: '1 h' }, resolve: { kk: '1 жұмыс күні', ru: '1 раб. день', en: '1 business day' }, color: 'bg-amber-500/10 text-amber-700' },
  critical: { response: { kk: '15 мин', ru: '15 мин', en: '15 min' }, resolve: { kk: '4 сағ', ru: '4 ч', en: '4 h' }, color: 'bg-red-500/10 text-red-600' },
} as const;

type TicketPriority = keyof typeof priorityMeta;
type LanguageCode = 'kk' | 'ru' | 'en';

const aiCopy = {
  kk: {
    title: 'AI ұсынысы',
    description: 'Тикет мәтіні, әсері және шұғылдығы бойынша бағалау',
    empty: 'Тақырып пен сипаттаманы толтырыңыз — содан кейін басымдық, SLA және санат бойынша ұсыныстар пайда болады.',
    priority: 'Басымдық',
    confidence: 'Сенімділік',
    reaction: 'Реакция',
    resolution: 'Шешім',
    recommendedCategory: 'Ұсынылатын санат',
    unknownCategory: 'Әзірге анықталмады — санатты қолмен нақтылаңыз',
    draftDescription: 'Сипаттама жобасы',
    apply: 'Қолдану',
    waiting: 'Сипаттаманы күтеміз',
    applied: 'Ұсыныс қолданылды',
    prepared: 'сипаттама дайындалды',
    problem: 'Мәселе',
    whatHappens: 'Не болып жатыр: мәселенің қай жерде пайда болатынын және қандай хабарлама/қате көрсетілетінін сипаттаңыз.',
    affected: 'Кімге әсер етеді: пайдаланушыны, бөлімді немесе пайдаланушылар санын көрсетіңіз.',
    started: 'Қашан басталды: күнін/уақытын және мәселе қайталанатынын көрсетіңіз.',
    urgentLine: 'Шұғылдық: жұмыс бұғатталған немесе жедел шешім қажет.',
    plannedLine: 'Шұғылдық: кеңес немесе жоспарлы шешім қажет.',
    highImpact: 'Бизнеске әсері жоғары',
    normalImpact: 'Әсері қалыпты',
    urgentSignal: 'Шұғыл/авариялық белгілер бар',
    moderateSignal: 'Шұғылдығы орташа',
    manualCategory: 'Санатты қолмен нақтылаған дұрыс',
    recommendations: 'Ұсыныстар',
    categorySignal: (name: string) => `"${name}" санатына ұқсайды`,
  },
  ru: {
    title: 'ИИ-рекомендация',
    description: 'Оценка по тексту заявки, влиянию и срочности',
    empty: 'Заполните тему и описание — после этого появятся рекомендации по приоритету, SLA и категории.',
    priority: 'Приоритет',
    confidence: 'Уверенность',
    reaction: 'Реакция',
    resolution: 'Решение',
    recommendedCategory: 'Рекомендуемая категория',
    unknownCategory: 'Пока не определена — уточните категорию вручную',
    draftDescription: 'Черновик описания',
    apply: 'Применить',
    waiting: 'Ждём описание',
    applied: 'Рекомендация применена',
    prepared: 'описание подготовлено',
    problem: 'Проблема',
    whatHappens: 'Что происходит: опишите, где именно возникает проблема и какое сообщение/ошибка отображается.',
    affected: 'Кого затрагивает: укажите пользователя, отдел или количество пользователей.',
    started: 'Когда началось: укажите дату/время и повторяется ли проблема.',
    urgentLine: 'Срочность: работа заблокирована или требуется оперативное решение.',
    plannedLine: 'Срочность: требуется консультация или плановое решение.',
    highImpact: 'Высокое влияние на бизнес',
    normalImpact: 'Обычное влияние',
    urgentSignal: 'Есть срочные/аварийные признаки',
    moderateSignal: 'Срочность умеренная',
    manualCategory: 'Категорию лучше уточнить вручную',
    recommendations: 'Рекомендации',
    categorySignal: (name: string) => `Похоже на категорию "${name}"`,
  },
  en: {
    title: 'AI recommendation',
    description: 'Assessment based on ticket text, impact, and urgency',
    empty: 'Fill in the title and description, then recommendations for priority, SLA, and category will appear.',
    priority: 'Priority',
    confidence: 'Confidence',
    reaction: 'Response',
    resolution: 'Resolution',
    recommendedCategory: 'Recommended category',
    unknownCategory: 'Not determined yet — choose the category manually',
    draftDescription: 'Description draft',
    apply: 'Apply',
    waiting: 'Waiting for details',
    applied: 'Recommendation applied',
    prepared: 'description prepared',
    problem: 'Problem',
    whatHappens: 'What is happening: describe exactly where the issue occurs and what message/error is shown.',
    affected: 'Who is affected: specify the user, department, or number of users.',
    started: 'When it started: specify the date/time and whether the issue repeats.',
    urgentLine: 'Urgency: work is blocked or a quick resolution is required.',
    plannedLine: 'Urgency: consultation or a planned resolution is required.',
    highImpact: 'High business impact',
    normalImpact: 'Normal impact',
    urgentSignal: 'Urgent/incident signals detected',
    moderateSignal: 'Moderate urgency',
    manualCategory: 'Category is better clarified manually',
    recommendations: 'Recommendations',
    categorySignal: (name: string) => `Looks like "${name}" category`,
  },
} as const;

const getAiCopy = (language: LanguageCode) => aiCopy[language] || aiCopy.en;

const actionRecommendations = {
  kk: {
    hardware: [
      'Құрылғының қосылуын, кабельді немесе Bluetooth байланысын тексеріңіз.',
      'Басқа USB портын немесе басқа құрылғыны қолданып көріңіз.',
      'Мүмкін болса, уақытша ауыстыру құрылғысын беріңіз және жабдықты диагностикаға жіберіңіз.',
    ],
    network: [
      'Wi-Fi/VPN/кабель байланысын тексеріңіз және желіге қайта қосылып көріңіз.',
      'IP мекенжайын, шлюзді және DNS қолжетімділігін тексеріңіз.',
      'Мәселе бірнеше пайдаланушыда болса, желілік жабдық пен провайдерді тексеріңіз.',
    ],
    software: [
      'Қате мәтінін, скриншотты және қолданба нұсқасын жинаңыз.',
      'Қолданбаны қайта іске қосып, кэшті немесе сессияны жаңартып көріңіз.',
      'Қайталанса, логтарды тексеріп, жауапты командаға жіберіңіз.',
    ],
    access: [
      'Пайдаланушы логині мен рөлін тексеріңіз.',
      'Құпиясөзді қалпына келтіру немесе құқықтарды жаңарту қажет пе екенін анықтаңыз.',
      'VPN/пошта/аккаунт қолжетімділігін бөлек тексеріңіз.',
    ],
    general: [
      'Пайдаланушыдан қате скриншотын және қайталану қадамдарын сұраңыз.',
      'Әсер ететін пайдаланушылар санын және басталған уақытын нақтылаңыз.',
      'Санат пен орындаушыны анықтап, SLA бойынша өңдеуге алыңыз.',
    ],
  },
  ru: {
    hardware: [
      'Проверьте подключение устройства, кабель или Bluetooth-соединение.',
      'Попробуйте другой USB-порт или другое устройство.',
      'Если возможно, выдайте временную замену и отправьте устройство на диагностику.',
    ],
    network: [
      'Проверьте Wi-Fi/VPN/кабель и попробуйте переподключиться к сети.',
      'Проверьте IP-адрес, шлюз и доступность DNS.',
      'Если проблема у нескольких пользователей, проверьте сетевое оборудование и провайдера.',
    ],
    software: [
      'Соберите текст ошибки, скриншот и версию приложения.',
      'Попробуйте перезапустить приложение, обновить кэш или сессию.',
      'Если повторяется, проверьте логи и передайте ответственной команде.',
    ],
    access: [
      'Проверьте логин пользователя и назначенные роли.',
      'Уточните, нужен ли сброс пароля или обновление прав.',
      'Отдельно проверьте доступ к VPN, почте или аккаунту.',
    ],
    general: [
      'Попросите пользователя приложить скриншот ошибки и шаги воспроизведения.',
      'Уточните количество затронутых пользователей и время начала проблемы.',
      'Определите категорию и исполнителя, затем обработайте заявку по SLA.',
    ],
  },
  en: {
    hardware: [
      'Check the device connection, cable, or Bluetooth pairing.',
      'Try another USB port or test with another device.',
      'If possible, provide a temporary replacement and send the device for diagnostics.',
    ],
    network: [
      'Check Wi-Fi/VPN/cable connectivity and try reconnecting to the network.',
      'Verify the IP address, gateway, and DNS availability.',
      'If multiple users are affected, check network equipment and the provider.',
    ],
    software: [
      'Collect the error text, screenshot, and application version.',
      'Try restarting the application and refreshing the cache or session.',
      'If it repeats, check logs and escalate to the responsible team.',
    ],
    access: [
      'Verify the user login and assigned roles.',
      'Check whether a password reset or permission update is needed.',
      'Test VPN, email, or account access separately.',
    ],
    general: [
      'Ask the user for an error screenshot and reproduction steps.',
      'Clarify how many users are affected and when the issue started.',
      'Confirm the category and assignee, then handle the ticket according to SLA.',
    ],
  },
} as const;

const categoryTranslations = [
  {
    match: ['желі', 'сеть', 'network'],
    label: { kk: 'Желі', ru: 'Сеть', en: 'Network' },
  },
  {
    match: ['техникалық қолдау', 'техническая поддержка', 'technical support'],
    label: { kk: 'Техникалық қолдау', ru: 'Техническая поддержка', en: 'Technical Support' },
  },
  {
    match: ['аппараттық құралдар', 'оборудование', 'аппарат', 'hardware'],
    label: { kk: 'Аппараттық құралдар', ru: 'Оборудование', en: 'Hardware' },
  },
  {
    match: ['бағдарламалық қамтамасыз ету', 'программное обеспечение', 'по', 'software'],
    label: { kk: 'Бағдарламалық қамтамасыз ету', ru: 'Программное обеспечение', en: 'Software' },
  },
] as const;

const getCategoryLabel = (category: Category, language: LanguageCode) => {
  const normalizedName = category.name.trim().toLowerCase();
  const translation = categoryTranslations.find((item) =>
    item.match.some((alias) => normalizedName === alias || normalizedName.includes(alias)),
  );

  return translation?.label[language] || category.name;
};

const keywordGroups = {
  critical: ['не работает', 'упал', 'авария', 'недоступ', 'простой', 'сбой', 'сломано', 'ошибка 500', 'критич', 'production', 'prod', 'outage', 'down', 'unavailable', 'major incident', 'critical'],
  high: ['срочно', 'важно', 'не могу', 'блокирует', 'deadline', 'оплата', 'клиент', 'руковод', 'безопасность', 'доступ', 'urgent', 'asap', 'important', 'blocked', 'blocking', 'cannot work', "can't work", 'not working', 'does not work', 'stopped working', 'broken', 'breaking', 'broking'],
  low: ['вопрос', 'консультация', 'как', 'подскажите', 'улучшение', 'пожелание', 'когда будет', 'question', 'consultation', 'how to', 'improvement', 'request'],
};

const categoryHints = [
  { keywords: ['нет доступа к сети', 'доступа к сети', 'интернет', 'сеть', 'сети', 'wi-fi', 'wifi', 'сервер', 'роутер', 'коммутатор', 'желі', 'network', 'internet', 'router', 'switch', 'server'], aliases: ['сеть', 'сетев', 'network', 'желі'] },
  { keywords: ['доступ', 'пароль', 'логин', 'учет', 'аккаунт', 'vpn', 'почта', 'access', 'password', 'login', 'account', 'email', 'mail'], aliases: ['доступ', 'учет', 'безопас', 'почт', 'support', 'technical'] },
  { keywords: ['компьютер', 'ноутбук', 'принтер', 'монитор', 'клавиат', 'мыш', 'оборуд', 'техника', 'құрал', 'computer', 'laptop', 'printer', 'monitor', 'keyboard', 'mouse', 'hardware', 'device', 'peripheral', 'scanner'], aliases: ['оборуд', 'аппарат', 'құрал', 'hardware', 'equipment'] },
  { keywords: ['система', 'программа', 'приложение', '1с', 'сайт', 'ошибка', 'база', 'бағдарлама', 'system', 'program', 'application', 'app', 'website', 'site', 'error', 'database', 'software'], aliases: ['по', 'программ', 'software', 'система', 'разработ', 'бағдарлам'] },
];

const inferCategory = (normalized: string, categories: Category[]) => {
  const explicit = categories.find((category) => normalized.includes(category.name.toLowerCase()));
  if (explicit) return explicit;

  const hint = categoryHints.find((group) => group.keywords.some((keyword) => normalized.includes(keyword)));
  if (!hint) return undefined;

  return categories.find((category) => {
    const categoryName = category.name.toLowerCase();
    return hint.aliases.some((alias) => categoryName.includes(alias));
  });
};

const getRecommendationType = (normalized: string) => {
  const hasAny = (items: string[]) => items.some((item) => normalized.includes(item));
  if (hasAny(['компьютер', 'ноутбук', 'принтер', 'монитор', 'клавиат', 'мыш', 'computer', 'laptop', 'printer', 'monitor', 'keyboard', 'mouse', 'hardware', 'device', 'scanner'])) return 'hardware';
  if (hasAny(['нет доступа к сети', 'интернет', 'сеть', 'wi-fi', 'wifi', 'сервер', 'роутер', 'коммутатор', 'network', 'internet', 'router', 'switch', 'server'])) return 'network';
  if (hasAny(['доступ', 'пароль', 'логин', 'аккаунт', 'vpn', 'почта', 'access', 'password', 'login', 'account', 'email', 'mail'])) return 'access';
  if (hasAny(['система', 'программа', 'приложение', 'сайт', 'ошибка', 'база', 'system', 'program', 'application', 'app', 'website', 'site', 'error', 'database', 'software'])) return 'software';
  return 'general';
};

const getActionRecommendations = (normalized: string, language: LanguageCode) =>
  actionRecommendations[language][getRecommendationType(normalized)];

const buildDescriptionSuggestion = (title: string, recommendedPriority: TicketPriority, language: LanguageCode) => {
  const copy = getAiCopy(language);
  const cleanTitle = title.trim();
  const urgencyLine = recommendedPriority === 'critical' || recommendedPriority === 'high'
    ? copy.urgentLine
    : copy.plannedLine;

  return [
    `${copy.problem}: ${cleanTitle}.`,
    copy.whatHappens,
    copy.affected,
    copy.started,
    urgencyLine,
  ].join('\n');
};

const getTicketAiInsight = (title: string, description: string, categories: Category[], language: LanguageCode) => {
  const copy = getAiCopy(language);
  const text = `${title} ${description}`;
  const normalized = text.toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  if (title.trim().length < 5 && words.length < 3) return null;
  const hasKnownSignal = [
    ...keywordGroups.critical,
    ...keywordGroups.high,
    ...keywordGroups.low,
    ...categoryHints.flatMap((group) => group.keywords),
  ].some((keyword) => normalized.includes(keyword));
  const hasReadableWord = /[аеёиоуыэюяәіөүұaeiou]/i.test(title);
  if (!hasKnownSignal && !hasReadableWord) return null;

  const hasAny = (items: string[]) => items.some((item) => normalized.includes(item));
  const impactScore = [
    hasAny(['все', 'массов', 'отдел', 'команда', 'пользователи', 'филиал', 'all users', 'team', 'department', 'branch', 'many users']) ? 2 : 0,
    hasAny(['клиент', 'финанс', 'оплата', 'договор', 'безопасность', 'client', 'customer', 'payment', 'finance', 'contract', 'security']) ? 2 : 0,
    hasAny(['не могу работать', 'блокирует', 'простой', 'недоступ', 'cannot work', "can't work", 'blocked', 'blocking', 'downtime', 'unavailable']) ? 2 : 0,
    words.length > 35 ? 1 : 0,
  ].reduce((sum, score) => sum + score, 0);
  const urgencyScore = [
    hasAny(keywordGroups.critical) ? 4 : 0,
    hasAny(keywordGroups.high) ? 2 : 0,
    hasAny(['сегодня', 'сейчас', 'немедленно', 'asap', 'today', 'now', 'immediately']) ? 2 : 0,
    hasAny(keywordGroups.low) ? -1 : 0,
  ].reduce((sum, score) => sum + score, 0);
  const score = impactScore + urgencyScore;
  const recommendedPriority: TicketPriority = score >= 6 ? 'critical' : score >= 4 ? 'high' : score <= 0 ? 'low' : 'medium';
  const confidence = Math.min(95, Math.max(45, 50 + Math.abs(score) * 8 + Math.min(words.length, 40)));
  const matchedCategory = inferCategory(normalized, categories);
  const descriptionSuggestion = buildDescriptionSuggestion(title, recommendedPriority, language);
  const recommendations = getActionRecommendations(normalized, language);
  const signals = [
    impactScore >= 4 ? copy.highImpact : copy.normalImpact,
    urgencyScore >= 4 ? copy.urgentSignal : copy.moderateSignal,
    matchedCategory ? copy.categorySignal(matchedCategory.name) : copy.manualCategory,
  ];

  return { recommendedPriority, confidence, matchedCategory, descriptionSuggestion, recommendations, signals };
};

export default function NewTicket() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const currentLanguage = language as LanguageCode;
  const copy = getAiCopy(currentLanguage);
  
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
  const localizedCategories = useMemo(
    () => categories.map((category) => ({
      ...category,
      name: getCategoryLabel(category, language),
    })),
    [categories, language],
  );
  const aiInsight = useMemo(
    () => getTicketAiInsight(title, description, localizedCategories, currentLanguage),
    [title, description, localizedCategories, currentLanguage],
  );
  const selectedPriorityMeta = aiInsight ? priorityMeta[aiInsight.recommendedPriority] : null;
  const selectedPriorityLabel = aiInsight ? t(`ticket.priority.${aiInsight.recommendedPriority}`) : '';

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

  const applyAiSuggestion = () => {
    if (!aiInsight) return;

    setPriority(aiInsight.recommendedPriority);
    if (!description.trim()) {
      setDescription(aiInsight.descriptionSuggestion);
    }
    if (aiInsight.matchedCategory) {
      setCategoryId(aiInsight.matchedCategory.id);
    }
    toast({
      title: copy.applied,
      description: aiInsight.matchedCategory
        ? `${copy.priority}: ${selectedPriorityLabel}, ${t('ticket.form.category').toLowerCase()}: ${aiInsight.matchedCategory.name}`
        : `${copy.priority}: ${selectedPriorityLabel}, ${copy.prepared}`,
    });
  };

  return (
    <motion.div className="mx-auto max-w-5xl space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <motion.div className="flex items-center gap-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold">{t('ticket.form.title')}</h1>
          <p className="text-muted-foreground">{t('ticket.form.subtitle')}</p>
        </div>
      </motion.div>

      <motion.div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
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
                      {localizedCategories.map((category) => (
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
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {copy.title}
              </CardTitle>
              <CardDescription>{copy.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!aiInsight || !selectedPriorityMeta ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  {copy.empty}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-muted-foreground">{copy.priority}</div>
                      <Badge variant="secondary" className={selectedPriorityMeta.color}>
                        {selectedPriorityLabel}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{copy.confidence}</div>
                      <div className="font-semibold">{aiInsight.confidence}%</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md border p-3">
                      <div className="flex items-center gap-2 text-muted-foreground"><Clock3 className="h-4 w-4" />{copy.reaction}</div>
                      <div className="mt-1 font-semibold">{selectedPriorityMeta.response[currentLanguage]}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4" />{copy.resolution}</div>
                      <div className="mt-1 font-semibold">{selectedPriorityMeta.resolve[currentLanguage]}</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {aiInsight.signals.map((signal) => (
                      <div key={signal} className="flex gap-2 text-muted-foreground">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{signal}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="font-medium">{copy.recommendedCategory}</div>
                    <div className="text-muted-foreground">
                      {aiInsight.matchedCategory ? aiInsight.matchedCategory.name : copy.unknownCategory}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="font-medium">{copy.draftDescription}</div>
                    <p className="whitespace-pre-line text-muted-foreground">{aiInsight.descriptionSuggestion}</p>
                  </div>

                  <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="font-medium">{copy.recommendations}</div>
                    <ul className="space-y-1 text-muted-foreground">
                      {aiInsight.recommendations.map((recommendation) => (
                        <li key={recommendation} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-2 whitespace-normal break-words text-center leading-snug"
                onClick={applyAiSuggestion}
                disabled={isSubmitting || !aiInsight}
              >
                <Wand2 className="h-4 w-4 shrink-0" />
                <span>{aiInsight ? copy.apply : copy.waiting}</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}

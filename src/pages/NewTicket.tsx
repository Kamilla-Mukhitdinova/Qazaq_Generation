import { useMemo, useRef, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, FileText, Headphones, Loader2, Paperclip, Send, ShieldCheck, Sparkles, Target, UploadCloud, Wand2, X } from 'lucide-react';
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
const NO_END_TIME_VALUE = 'none';

const padTimePart = (value: number) => String(value).padStart(2, '0');

const formatDateInput = (date: Date) => (
  `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())}`
);

const formatTimeInput = (date: Date) => (
  `${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`
);

const roundUpToNextQuarterHour = (date: Date) => {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const minutes = rounded.getMinutes();
  const nextMinutes = Math.ceil(minutes / 15) * 15;
  rounded.setMinutes(nextMinutes);
  if (nextMinutes === 60) {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  }
  return rounded;
};

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hour = Math.floor(index / 4);
  const minute = (index % 4) * 15;
  return `${padTimePart(hour)}:${padTimePart(minute)}`;
});

const buildLocalDateTimeIso = (date: string, time: string) => {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
};

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

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [categoryId, setCategoryId] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [isPlanned, setIsPlanned] = useState(false);
  const [plannedDate, setPlannedDate] = useState('');
  const [plannedStartTime, setPlannedStartTime] = useState('');
  const [plannedEndTime, setPlannedEndTime] = useState('');
  const [planningNote, setPlanningNote] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appliedAiInsight, setAppliedAiInsight] = useState<ReturnType<typeof getTicketAiInsight> | null>(null);
  const canChooseRequester = role === 'agent' || role === 'admin' || role === 'manager';
  const isEmployeeRequestView = role === 'employee';

  const handlePlanningToggle = (checked: boolean) => {
    setIsPlanned(checked);
    if (!checked) return;

    const start = roundUpToNextQuarterHour(new Date());
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setPlannedDate(prev => prev || formatDateInput(start));
    setPlannedStartTime(prev => prev || formatTimeInput(start));
    setPlannedEndTime(prev => prev || formatTimeInput(end));
  };

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
  const displayedAiInsight = appliedAiInsight || aiInsight;
  const selectedPriorityMeta = displayedAiInsight ? priorityMeta[displayedAiInsight.recommendedPriority] : null;
  const selectedPriorityLabel = displayedAiInsight ? t(`ticket.priority.${displayedAiInsight.recommendedPriority}`) : '';

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

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length === 0) return;

    setAttachments((current) => {
      const existingKeys = new Set(current.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const uniqueFiles = selectedFiles.filter((file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`));
      return [...current, ...uniqueFiles];
    });

    event.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: t('common.error'), description: t('auth.login'), variant: 'destructive' });
      return;
    }

    const shouldPlan = canChooseRequester && isPlanned;
    const plannedStartAt = shouldPlan ? buildLocalDateTimeIso(plannedDate, plannedStartTime) : null;
    const plannedEndAt = shouldPlan && plannedEndTime ? buildLocalDateTimeIso(plannedDate, plannedEndTime) : null;

    if (shouldPlan && !plannedStartAt) {
      toast({
        title: t('common.error'),
        description: t('ticket.form.planningRequired'),
        variant: 'destructive',
      });
      return;
    }

    if (plannedStartAt && plannedEndAt && new Date(plannedEndAt) <= new Date(plannedStartAt)) {
      toast({
        title: t('common.error'),
        description: t('ticket.form.planningEndError'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await api.createTicket({
        title, description, priority,
        categoryId: canChooseRequester ? categoryId || null : null,
        requesterId: canChooseRequester ? requesterId || user.id : user.id,
        assigneeId: canChooseRequester && assigneeId ? assigneeId : null,
        isPlanned: shouldPlan,
        plannedStartAt,
        plannedEndAt,
        planningNote: shouldPlan ? planningNote.trim() || null : null,
      });

      if (attachments.length > 0) {
        try {
          await Promise.all(attachments.map((file) => api.uploadAttachment(data.id, file)));
        } catch (uploadError: any) {
          toast({
            title: t('common.error'),
            description: uploadError.message || t('ticket.form.attachmentsUploadError'),
            variant: 'destructive',
          });
        }
      }

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
    setAppliedAiInsight(aiInsight);
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

  if (isEmployeeRequestView) {
    const employeeInsight = displayedAiInsight;
    const requestSteps = [
      { icon: FileText, title: 'Опишите проблему', text: 'Коротко укажите, что случилось' },
      { icon: UploadCloud, title: 'Добавьте файл', text: 'Скриншот или документ ускорит помощь' },
      { icon: Headphones, title: 'Первая линия', text: 'Лия получит заявку автоматически' },
    ];

    return (
      <div className="mx-auto max-w-6xl">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid min-h-[calc(100vh-120px)] items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white/85 px-3 py-2 text-sm font-medium text-blue-800 shadow-sm backdrop-blur"
            >
              <Headphones className="h-4 w-4" />
              Service Desk
            </motion.div>
            <div className="space-y-3">
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="max-w-xl text-4xl font-bold leading-tight text-slate-950 md:text-5xl"
              >
                Отправьте заявку в поддержку
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-xl text-base leading-7 text-slate-600"
              >
                Опишите проблему простыми словами. Заявка сразу попадет инженеру первой линии, а статус можно отслеживать в разделе “Мои заявки”.
              </motion.p>
            </div>

            <div className="grid gap-3">
              {requestSteps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.26 + index * 0.08 }}
                  className="flex items-center gap-4 rounded-md border border-slate-200 bg-white/82 p-4 shadow-sm backdrop-blur"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-slate-900 text-white">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{step.title}</p>
                    <p className="text-sm text-slate-500">{step.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.38 }}
            className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Новая заявка</h2>
                <p className="mt-1 text-sm text-slate-500">Заполните форму, остальное сделает Service Desk.</p>
              </div>
              <motion.span
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-blue-700 text-white shadow-lg shadow-blue-700/20"
              >
                <Send className="h-5 w-5" />
              </motion.span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div className="space-y-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
                <Label htmlFor="title">Тема *</Label>
                <Input
                  id="title"
                  placeholder="Например: не работает принтер"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setAppliedAiInsight(null);
                  }}
                  required
                  disabled={isSubmitting}
                  className="h-12 bg-white"
                />
              </motion.div>

              <motion.div className="space-y-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  placeholder="Что произошло, где именно, когда началось, есть ли сообщение об ошибке..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setAppliedAiInsight(null);
                  }}
                  rows={7}
                  disabled={isSubmitting}
                  className="resize-none bg-white"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38 }}
                className="rounded-md border border-blue-100 bg-blue-50/70 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-700 text-white">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-950">Подсказка помощника</p>
                      {employeeInsight?.matchedCategory && (
                        <Badge variant="secondary" className="bg-white text-blue-800">
                          {employeeInsight.matchedCategory.name}
                        </Badge>
                      )}
                    </div>

                    {!employeeInsight ? (
                      <p className="mt-1 text-sm text-slate-600">
                        Начните с темы заявки, и помощник подскажет, какие детали лучше добавить.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        <div className="grid gap-2">
                          {employeeInsight.signals.slice(0, 2).map((signal) => (
                            <div key={signal} className="flex gap-2 text-sm text-slate-700">
                              <Target className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                              <span>{signal}</span>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-md bg-white/80 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-500">Что стоит уточнить</p>
                          <ul className="mt-2 space-y-1 text-sm text-slate-700">
                            {employeeInsight.recommendations.slice(0, 3).map((recommendation) => (
                              <li key={recommendation} className="flex gap-2">
                                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-blue-700" />
                                <span>{recommendation}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="bg-white"
                          onClick={() => {
                            setDescription(employeeInsight.descriptionSuggestion);
                            setAppliedAiInsight(employeeInsight);
                          }}
                          disabled={isSubmitting}
                        >
                          <Wand2 className="mr-2 h-4 w-4" />
                          Улучшить описание
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              <motion.div className="space-y-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentChange}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex min-h-20 w-full items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 text-sm font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-60"
                >
                  <UploadCloud className="h-5 w-5" />
                  Добавить вложение
                </button>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <motion.div
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-blue-700" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{file.name}</div>
                            <div className="text-xs text-slate-500">{formatFileSize(file.size)}</div>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeAttachment(index)} disabled={isSubmitting}>
                          <X className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              <motion.div className="flex flex-col gap-3 pt-2 sm:flex-row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
                <Button type="button" variant="outline" className="h-11 bg-white sm:w-32" onClick={() => navigate('/tickets')} disabled={isSubmitting}>
                  Мои заявки
                </Button>
                <Button type="submit" className="h-11 flex-1 bg-blue-800 hover:bg-blue-900" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Отправить заявку
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </motion.section>
      </div>
    );
  }

  return (
    <motion.div className="mx-auto max-w-5xl space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <motion.div className="flex items-center gap-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold">{isEmployeeRequestView ? 'Обращение в поддержку' : t('ticket.form.title')}</h1>
          <p className="text-muted-foreground">
            {isEmployeeRequestView ? 'Заявка поступит инженеру первой линии' : t('ticket.form.subtitle')}
          </p>
        </div>
      </motion.div>

      <motion.div className={isEmployeeRequestView ? 'mx-auto max-w-2xl' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass">
          <CardHeader>
            <CardTitle>{isEmployeeRequestView ? 'Опишите проблему' : t('ticket.form.details')}</CardTitle>
            <CardDescription>
              {isEmployeeRequestView ? 'Первая линия поддержки примет обращение и свяжется с вами' : t('ticket.form.detailsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Label htmlFor="title">{t('ticket.form.titleLabel')} *</Label>
                <Input
                  id="title"
                  placeholder={t('ticket.form.titlePlaceholder')}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setAppliedAiInsight(null);
                  }}
                  required
                  disabled={isSubmitting}
                />
              </motion.div>

              <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                <Label htmlFor="description">{t('ticket.form.description')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('ticket.form.descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setAppliedAiInsight(null);
                  }}
                  rows={6}
                  disabled={isSubmitting}
                />
              </motion.div>

              <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.36 }}>
                <div className="flex items-center justify-between gap-3">
                  <Label>{t('ticket.detail.attachments')}</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleAttachmentChange}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    <Paperclip className="h-4 w-4" />
                    {t('ticket.detail.uploadFile')}
                  </Button>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{file.name}</div>
                            <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeAttachment(index)}
                          disabled={isSubmitting}
                          aria-label={t('common.delete')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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

              {canChooseRequester && (
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
              )}

              {canChooseRequester && (
              <motion.div
                className="rounded-lg border border-border bg-muted/20 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.42 }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 rounded-md bg-primary/10 p-2 text-primary">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                    <div>
                      <Label htmlFor="is-planned" className="text-base">{t('ticket.form.planning')}</Label>
                      <p className="text-sm text-muted-foreground">{t('ticket.form.planningDesc')}</p>
                    </div>
                  </div>
                  <Switch
                    id="is-planned"
                    checked={isPlanned}
                    onCheckedChange={handlePlanningToggle}
                    disabled={isSubmitting}
                  />
                </div>

                {isPlanned && (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="planned-date">{t('ticket.form.plannedDate')}</Label>
                        <Input
                          id="planned-date"
                          type="date"
                          value={plannedDate}
                          onChange={(event) => setPlannedDate(event.target.value)}
                          disabled={isSubmitting}
                          required={isPlanned}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="planned-start">{t('ticket.form.plannedStart')}</Label>
                        <Select value={plannedStartTime} onValueChange={setPlannedStartTime} disabled={isSubmitting}>
                          <SelectTrigger id="planned-start">
                            <SelectValue placeholder="09:00" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {TIME_OPTIONS.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="planned-end">{t('ticket.form.plannedEnd')}</Label>
                        <Select
                          value={plannedEndTime || NO_END_TIME_VALUE}
                          onValueChange={(value) => setPlannedEndTime(value === NO_END_TIME_VALUE ? '' : value)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger id="planned-end">
                            <SelectValue placeholder="10:00" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            <SelectItem value={NO_END_TIME_VALUE}>Не указано</SelectItem>
                            {TIME_OPTIONS.map((time) => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="planning-note">{t('ticket.form.planningNote')}</Label>
                      <Textarea
                        id="planning-note"
                        value={planningNote}
                        onChange={(event) => setPlanningNote(event.target.value)}
                        placeholder={t('ticket.form.planningNotePlaceholder')}
                        disabled={isSubmitting}
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
              )}

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
        {!isEmployeeRequestView && (
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
              {!displayedAiInsight || !selectedPriorityMeta ? (
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
                      <div className="font-semibold">{displayedAiInsight.confidence}%</div>
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
                    {displayedAiInsight.signals.map((signal) => (
                      <div key={signal} className="flex gap-2 text-muted-foreground">
                        <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{signal}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="font-medium">{copy.recommendedCategory}</div>
                    <div className="text-muted-foreground">
                      {displayedAiInsight.matchedCategory ? displayedAiInsight.matchedCategory.name : copy.unknownCategory}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="font-medium">{copy.draftDescription}</div>
                    <p className="whitespace-pre-line text-muted-foreground">{displayedAiInsight.descriptionSuggestion}</p>
                  </div>

                  <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="font-medium">{copy.recommendations}</div>
                    <ul className="space-y-1 text-muted-foreground">
                      {displayedAiInsight.recommendations.map((recommendation) => (
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
                disabled={isSubmitting || !displayedAiInsight}
              >
                <Wand2 className="h-4 w-4 shrink-0" />
                <span>{displayedAiInsight ? copy.apply : copy.waiting}</span>
              </Button>
            </CardContent>
          </Card>
        </div>
        )}
      </motion.div>
    </motion.div>
  );
}

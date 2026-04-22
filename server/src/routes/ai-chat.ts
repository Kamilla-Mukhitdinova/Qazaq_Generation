import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { profiles, userRoles, tickets, ticketSla, ticketComments, departments } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

const openaiBaseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const CHAT_COMPLETIONS_URL = `${openaiBaseUrl}/chat/completions`;
/** Свой OSS: Ollama + OPENAI_BASE_URL. */
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

type OpenAiErrJson = { error?: { message?: string; code?: string } };

function userMessageFromOpenAiError(status: number, body: string): string {
  try {
    const j = JSON.parse(body) as OpenAiErrJson;
    const code = j.error?.code;
    const msg = (j.error?.message || '').toLowerCase();
    if (code === 'model_not_found' || (status === 404 && msg.includes('model'))) {
      return 'Модель недоступна для этого ключа OpenAI. В server/.env задайте OPENAI_MODEL (например gpt-4o-mini) или подключите доступ к модели в кабинете.';
    }
    if (code === 'insufficient_quota' || msg.includes('quota')) {
      return 'Квота OpenAI исчерпана или не настроен платёж. Откройте Billing на platform.openai.com и пополните баланс.';
    }
    if (status === 401 || code === 'invalid_api_key') {
      return 'Неверный ключ OPENAI_API_KEY. Создайте новый ключ в кабинете OpenAI.';
    }
    if (code === 'context_length_exceeded') {
      return 'Слишком длинный запрос. Сократите текст или историю сообщений.';
    }
  } catch {
    /* не JSON */
  }
  return 'Ошибка AI сервиса';
}

/** Ollama OpenAI-совместимый API не требует ключа; заголовок всё равно шлём с заглушкой. */
function resolveOpenAiBearer(baseUrl: string): string {
  const fromEnv = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (fromEnv) return fromEnv.trim();
  if (baseUrl.includes(':11434')) return 'ollama';
  return '';
}

/** Демо-аккаунт и любые employee: не передаём в LLM настоящие ФИО / email. */
const ANONYMIZED_EMPLOYEE_NAME = 'Қызметкер';
const DEMO_EMPLOYEE_EMAIL = 'employee@qazaq.gen';

function shouldAnonymizeForAi(email: string | null | undefined, role: string): boolean {
  const r = String(role || 'employee');
  const e = (email || '').trim().toLowerCase();
  if (e === DEMO_EMPLOYEE_EMAIL) return true;
  return r === 'employee';
}

function anonymizedEmailForAi(userId: string): string {
  return `user_${userId.replace(/-/g, '').slice(0, 10)}@internal.local`;
}

function mergeRolesPreferHighest(rows: { userId: string; role: string }[]): Record<string, string> {
  const rank: Record<string, number> = { admin: 4, manager: 3, agent: 2, employee: 1 };
  const map: Record<string, string> = {};
  for (const r of rows) {
    const uid = r.userId;
    const roleStr = String(r.role);
    const prev = map[uid];
    if (!prev || (rank[roleStr] ?? 0) > (rank[prev] ?? 0)) map[uid] = roleStr;
  }
  return map;
}

async function fetchEmployeeAnalytics() {
  const allProfiles = await db.select({
    userId: profiles.userId,
    name: profiles.name,
    email: profiles.email,
    departmentId: profiles.departmentId,
  }).from(profiles);

  const allRoles = await db.select({
    userId: userRoles.userId,
    role: userRoles.role,
  }).from(userRoles);

  const allTickets = await db.select({
    id: tickets.id,
    assigneeId: tickets.assigneeId,
    requesterId: tickets.requesterId,
    status: tickets.status,
    priority: tickets.priority,
    createdAt: tickets.createdAt,
    closedAt: tickets.closedAt,
  }).from(tickets);

  const allSla = await db.select({
    ticketId: ticketSla.ticketId,
    breachedResponse: ticketSla.breachedResponse,
    breachedResolve: ticketSla.breachedResolve,
    responseDue: ticketSla.responseDue,
    respondedAt: ticketSla.respondedAt,
  }).from(ticketSla);

  const allComments = await db.select({
    authorId: ticketComments.authorId,
    ticketId: ticketComments.ticketId,
  }).from(ticketComments);

  const allDepts = await db.select({
    id: departments.id,
    name: departments.name,
  }).from(departments);

  const deptMap: Record<string, string> = {};
  allDepts.forEach(d => { deptMap[d.id] = d.name; });

  const roleMap = mergeRolesPreferHighest(
    allRoles.map(r => ({ userId: r.userId, role: String(r.role) }))
  );

  return allProfiles.map(p => {
    const userId = p.userId;
    const assigned = allTickets.filter(t => t.assigneeId === userId);
    const created = allTickets.filter(t => t.requesterId === userId);
    const closed = assigned.filter(t => t.status === 'closed' || t.status === 'resolved');
    const inProgress = assigned.filter(t => t.status === 'in_progress' || t.status === 'assigned');

    const ticketIds = new Set(assigned.map(t => t.id));
    const relevantSla = allSla.filter(s => ticketIds.has(s.ticketId));
    const slaBreachedResponse = relevantSla.filter(s => s.breachedResponse).length;
    const slaBreachedResolve = relevantSla.filter(s => s.breachedResolve).length;
    const slaTotal = relevantSla.length;

    let avgResolutionHours = 0;
    const resolvedWithTime = closed.filter(t => t.closedAt && t.createdAt);
    if (resolvedWithTime.length > 0) {
      const totalMs = resolvedWithTime.reduce((sum, t) => {
        return sum + (new Date(t.closedAt!).getTime() - new Date(t.createdAt).getTime());
      }, 0);
      avgResolutionHours = Math.round(totalMs / resolvedWithTime.length / 3600000 * 10) / 10;
    }

    const userComments = allComments.filter(c => c.authorId === userId).length;

    const priorityBreakdown = { low: 0, medium: 0, high: 0, critical: 0 };
    assigned.forEach(t => {
      if (t.priority in priorityBreakdown) {
        priorityBreakdown[t.priority as keyof typeof priorityBreakdown]++;
      }
    });

    const userRole = roleMap[userId] || 'employee';
    const hidePii = shouldAnonymizeForAi(p.email, userRole);

    return {
      userRef: userId.replace(/-/g, '').slice(0, 10),
      name: hidePii ? ANONYMIZED_EMPLOYEE_NAME : (p.name || ''),
      email: hidePii ? anonymizedEmailForAi(userId) : (p.email || ''),
      role: userRole,
      department: p.departmentId ? deptMap[p.departmentId] || 'Не указан' : 'Не указан',
      totalAssigned: assigned.length,
      totalCreated: created.length,
      closed: closed.length,
      inProgress: inProgress.length,
      slaTotal,
      slaOk: slaTotal - slaBreachedResponse - slaBreachedResolve,
      slaBreachedResponse,
      slaBreachedResolve,
      avgResolutionHours,
      commentsCount: userComments,
      priorityBreakdown,
    };
  });
}

// POST /api/ai-chat
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { messages, type, ticketData, userContext, suggestMode, language } = req.body;
    const apiKey = resolveOpenAiBearer(openaiBaseUrl);

    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
    }

    const langMap: Record<string, string> = {
      kk: 'Жауапты ТЕК қазақ тілінде бер. Орысша және ағылшынша сөздерді қолданба.',
      ru: 'Отвечай ТОЛЬКО на русском языке.',
      en: 'Reply ONLY in English.',
    };
    const langInstruction = langMap[language] || 'Отвечай на языке пользователя.';
    const outputStyleInstruction =
      language === 'kk'
        ? 'МАҢЫЗДЫ: Жауап қысқа және түсінікті болсын. Кесте қолданба. Тек маркерленген тізім немесе қысқа абзацтар жаз. Дерек жетіспесе: "Дерек жеткіліксіз" деп көрсет.'
        : 'Важный формат: отвечай кратко и понятно. Избегай сложных таблиц, используй списки или короткие абзацы.';
    const strictTemplateInstruction =
      language === 'kk'
        ? `ҚАТАҢ ФОРМАТ (міндетті):
1) "Қысқаша қорытынды" (1-2 сөйлем)
2) "Қызметкер деректері" (аты, email, рөлі, бөлімі)
3) "Тикет статистикасы" (assigned, created, closed, inProgress, SLA)
4) "Басымдықтар" (low, medium, high, critical)
5) "Ұсыныс" (1-2 тармақ)
Ереже: тек қазақ тілі; орысша/ағылшынша сөз қоспа; түсініксіз қысқартуларды қолданба.`
        : 'Структура ответа: краткий вывод, данные сотрудника, статистика тикетов, приоритеты, рекомендации.';

    let userInfo = '';
    if (userContext) {
      userInfo = `\n\nИнформация о текущем пользователе:
- Имя: ${userContext.name || 'Неизвестно'}
- Email: ${userContext.email || 'Неизвестно'}
- Роль: ${userContext.role || 'Неизвестно'}
- Отдел: ${userContext.department || 'Не указан'}
Обращайся к пользователю по имени.`;
    }

    // Auto-suggest mode
    if (suggestMode) {
      const lastMsg = messages[messages.length - 1]?.content || '';
      const suggestResponse = await fetch(CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: `Ты автоподсказчик для ITSM системы Qazaq Generation. ${langInstruction} Предложи 2-3 коротких варианта завершения фразы. Отвечай ТОЛЬКО JSON массивом строк.${userInfo}` },
            { role: 'user', content: `Пользователь начал печатать: "${lastMsg}". Предложи варианты завершения.` },
          ],
        }),
      });

      if (!suggestResponse.ok) {
        return res.json({ suggestions: [] });
      }

      const suggestData = await suggestResponse.json();
      const content = suggestData.choices?.[0]?.message?.content || '[]';
      let suggestions: string[] = [];
      try {
        suggestions = JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, '').trim());
      } catch {
        suggestions = [];
      }
      return res.json({ suggestions });
    }

    // Fetch employee analytics for admin/manager
    let employeeAnalytics = '';
    if (userContext?.role === 'admin' || userContext?.role === 'manager') {
      try {
        const stats = await fetchEmployeeAnalytics();
        employeeAnalytics = `\n\n=== АНАЛИТИКА ПО СОТРУДНИКАМ (актуальные данные из базы) ===
${JSON.stringify(stats, null, 2)}
===
Используй ТОЛЬКО этот JSON. Не выдумывай ФИО и не копируй имена из истории чата.
Если name = «${ANONYMIZED_EMPLOYEE_NAME}», не называй человека иначе и не «восстанавливай» фамилию.
Отвечай кратко и структурно, без сложных markdown-таблиц.`;
      } catch (e) {
        console.error('Failed to fetch employee analytics:', e);
      }
    }

    let systemPrompt = '';
    switch (type) {
      case 'ticket_analysis':
        systemPrompt = `Ты - AI помощник для Helpdesk системы Qazaq Generation. Ты анализируешь тикеты и помогаешь агентам.
${langInstruction} ${outputStyleInstruction} ${strictTemplateInstruction}${userInfo}${employeeAnalytics}
Данные тикета: ${JSON.stringify(ticketData || {})}`;
        break;
      case 'report_generation':
        systemPrompt = `Ты - AI аналитик для Helpdesk системы Qazaq Generation. ${langInstruction} ${outputStyleInstruction} ${strictTemplateInstruction}${userInfo}${employeeAnalytics}
Данные для анализа: ${JSON.stringify(ticketData || {})}`;
        break;
      default:
        systemPrompt = `Ты - AI помощник для ITSM системы Qazaq Generation. Твоё имя - qazq_mind. ${langInstruction} ${outputStyleInstruction} ${strictTemplateInstruction}${userInfo}${employeeAnalytics}
Ты умная, дружелюбная и профессиональная помощница. Помогай с тикетами, отчетами, ППР планами и любыми вопросами по системе.
Когда админ или менеджер спрашивает о сотруднике - дай подробную аналитику.`;
    }

    const response = await fetch(CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.2,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI chat completions error:', response.status, errorText);

      if (response.status === 429) {
        try {
          const j = JSON.parse(errorText) as OpenAiErrJson;
          if (j.error?.code === 'insufficient_quota') {
            return res.status(402).json({ error: userMessageFromOpenAiError(429, errorText) });
          }
        } catch {
          /* ignore */
        }
        return res.status(429).json({ error: 'Лимит запросов превышен, попробуйте позже.' });
      }
      if (response.status === 402) {
        return res.status(402).json({ error: 'Требуется оплата.' });
      }
      return res.status(500).json({ error: userMessageFromOpenAiError(response.status, errorText) });
    }

    // Stream SSE response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: 'No response body' });
    }

    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          break;
        }
        res.write(value);
      }
    };

    req.on('close', () => {
      reader.cancel();
    });

    await pump();
  } catch (error) {
    console.error('AI chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { categories, departments, kbArticles, profiles, reports, ticketHistory, ticketSla, ticketComments, tickets, userRoles, users } from '../db/schema.js';
import { and, desc, eq, ilike, or } from 'drizzle-orm';

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

/** Ollama OpenAI-совместимый API не требует ключа, но формат заголовка совместим с OpenAI SDK. */
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

function canManageTickets(role: string) {
  return ['agent', 'admin', 'manager'].includes(role);
}

function normalizeStatus(value: string | undefined) {
  const v = String(value || '').trim().toLowerCase();
  const map: Record<string, string> = {
    new: 'new',
    новый: 'new',
    assigned: 'assigned',
    назначен: 'assigned',
    назначена: 'assigned',
    in_progress: 'in_progress',
    progress: 'in_progress',
    'в работе': 'in_progress',
    resolved: 'resolved',
    решен: 'resolved',
    решена: 'resolved',
    closed: 'closed',
    закрыт: 'closed',
    закрыта: 'closed',
    reopened: 'reopened',
  };
  return map[v] || v;
}

function normalizePriority(value: string | undefined) {
  const v = String(value || '').trim().toLowerCase();
  const map: Record<string, string> = {
    low: 'low',
    низкий: 'low',
    medium: 'medium',
    средний: 'medium',
    high: 'high',
    высокий: 'high',
    critical: 'critical',
    критический: 'critical',
  };
  return map[v] || 'medium';
}

function latestUserText(messages: any[]): string {
  const last = [...(messages || [])].reverse().find((m) => m?.role === 'user');
  return String(last?.content || '');
}

async function fetchKnowledgeContext(query: string, role: string) {
  const cleaned = query.trim();
  if (!cleaned) return '';

  const words = cleaned
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 4)
    .slice(0, 8);
  const terms = words.length ? words : [cleaned.slice(0, 80)];
  const searchCondition = or(
    ...terms.flatMap((term) => {
      const pattern = `%${term}%`;
      return [
        ilike(kbArticles.title, pattern),
        ilike(kbArticles.shortDescription, pattern),
        ilike(kbArticles.content, pattern),
      ];
    }),
  );
  const visibilityCondition = canManageTickets(role) ? undefined : eq(kbArticles.visibility, 'public');
  const where = visibilityCondition ? and(visibilityCondition, searchCondition) : searchCondition;

  const articles = await db.select({
    id: kbArticles.id,
    title: kbArticles.title,
    shortDescription: kbArticles.shortDescription,
    content: kbArticles.content,
    visibility: kbArticles.visibility,
    updatedAt: kbArticles.updatedAt,
  }).from(kbArticles).where(where).orderBy(desc(kbArticles.updatedAt)).limit(5);

  if (articles.length === 0) return '';

  return `\n\n=== КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ ===
${articles.map((article, index) => {
  const body = String(article.content || '').replace(/\s+/g, ' ').slice(0, 900);
  return `${index + 1}. ${article.title}
ID: ${article.id}
Видимость: ${article.visibility}
Кратко: ${article.shortDescription || '-'}
Фрагмент: ${body}`;
}).join('\n\n')}
===
Используй эти статьи как RAG-контекст. Если статья подходит, упомяни её название. Не выдумывай статьи, которых нет в списке.`;
}

async function callJsonModel(system: string, user: string) {
  const apiKey = resolveOpenAiBearer(openaiBaseUrl);
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const response = await fetch(CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.1,
      stream: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(userMessageFromOpenAiError(response.status, body));
  }

  const data = await response.json();
  const content = String(data.choices?.[0]?.message?.content || '{}')
    .replace(/```json\n?/g, '')
    .replace(/```/g, '')
    .trim();
  return JSON.parse(content);
}

async function callTextModel(system: string, user: string) {
  const apiKey = resolveOpenAiBearer(openaiBaseUrl);
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const response = await fetch(CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.2,
      stream: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(userMessageFromOpenAiError(response.status, body));
  }

  const data = await response.json();
  return String(data.choices?.[0]?.message?.content || '');
}

async function getTicketBundle(ticketId: string) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
  if (!ticket) return null;

  const [requester] = await db.select().from(profiles).where(eq(profiles.userId, ticket.requesterId)).limit(1);
  const assignee = ticket.assigneeId
    ? (await db.select().from(profiles).where(eq(profiles.userId, ticket.assigneeId)).limit(1))[0]
    : null;
  const category = ticket.categoryId
    ? (await db.select().from(categories).where(eq(categories.id, ticket.categoryId)).limit(1))[0]
    : null;
  const comments = await db.select().from(ticketComments).where(eq(ticketComments.ticketId, ticketId)).orderBy(desc(ticketComments.createdAt)).limit(20);
  const history = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, ticketId)).orderBy(desc(ticketHistory.createdAt)).limit(20);
  const [sla] = await db.select().from(ticketSla).where(eq(ticketSla.ticketId, ticketId)).limit(1);

  return { ticket, requester, assignee, category, comments, history, sla };
}

async function findUserByText(text: string) {
  const q = String(text || '').trim();
  if (!q) return null;
  const [byEmail] = await db.select().from(profiles).where(ilike(profiles.email, `%${q}%`)).limit(1);
  if (byEmail) return byEmail;
  const [byName] = await db.select().from(profiles).where(ilike(profiles.name, `%${q}%`)).limit(1);
  return byName || null;
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
    title: tickets.title,
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
    resolveDue: ticketSla.resolveDue,
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
    const detailedTickets = assigned.map(t => {
      const sla = allSla.find(s => s.ticketId === t.id);
      const responseMinutes = sla?.respondedAt
        ? Math.max(0, Math.round((new Date(sla.respondedAt).getTime() - new Date(t.createdAt).getTime()) / 60000))
        : null;
      const resolutionHours = t.closedAt
        ? Math.round((new Date(t.closedAt).getTime() - new Date(t.createdAt).getTime()) / 360000) / 10
        : null;
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        responseMinutes,
        resolutionHours,
        breachedResponse: !!sla?.breachedResponse,
        breachedResolve: !!sla?.breachedResolve,
      };
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
      slaBreachedTotal: slaBreachedResponse + slaBreachedResolve,
      avgResolutionHours,
      commentsCount: userComments,
      priorityBreakdown,
      detailedTickets,
    };
  });
}

function isEmployeeKpiQuestion(text: string) {
  const value = text.toLowerCase();
  return ['kpi', 'кпи', 'sla', 'сла', 'наруш', 'реакц', 'отвечал', 'ответил', 'заявк', 'сотрудник', 'инженер']
    .some(word => value.includes(word));
}

function pickEmployeeAnalyticsRows(stats: Awaited<ReturnType<typeof fetchEmployeeAnalytics>>, text: string) {
  const value = text.toLowerCase();
  const rows = stats.filter(row => ['agent', 'manager'].includes(row.role));
  const matched = rows.filter(row => {
    const haystack = `${row.name} ${row.email}`.toLowerCase();
    return haystack.split(/\s+/).some(part => part.length >= 3 && value.includes(part))
      || value.includes(row.name.toLowerCase())
      || value.includes(row.email.toLowerCase());
  });
  return matched.length ? matched : rows;
}

function formatEmployeeKpiAnswer(stats: Awaited<ReturnType<typeof fetchEmployeeAnalytics>>, text: string) {
  const rows = pickEmployeeAnalyticsRows(stats, text);
  if (!rows.length) return 'По сотрудникам-исполнителям пока нет данных KPI.';

  const wantsDetails = ['подроб', 'сколько', 'какую', 'какие', 'заявк', 'отвечал', 'ответил', 'наруш']
    .some(word => text.toLowerCase().includes(word));

  const summary = rows.map(row => {
    const assigned = row.totalAssigned;
    const resolved = row.closed;
    const active = row.inProgress;
    const avgResponse = row.detailedTickets
      .map(ticket => ticket.responseMinutes)
      .filter((value): value is number => typeof value === 'number');
    const avgResponseMin = avgResponse.length
      ? Math.round(avgResponse.reduce((sum, value) => sum + value, 0) / avgResponse.length)
      : 0;
    const breachedTickets = row.detailedTickets.filter(ticket => ticket.breachedResponse || ticket.breachedResolve);

    const lines = [
      `**${row.name}** (${row.email})`,
      `- Роль: ${row.role}, отдел: ${row.department}`,
      `- Назначено: ${assigned}, решено: ${resolved}, активно: ${active}`,
      `- SLA: всего ${row.slaTotal}, нарушений ${row.slaBreachedTotal}, средняя реакция ${avgResponseMin} мин`,
    ];

    if (wantsDetails) {
      const detailTickets = (breachedTickets.length ? breachedTickets : row.detailedTickets).slice(0, 8);
      if (detailTickets.length) {
        lines.push('- Детали по заявкам:');
        for (const ticket of detailTickets) {
          const breach = ticket.breachedResponse || ticket.breachedResolve
            ? 'SLA нарушено'
            : 'SLA в норме';
          lines.push(`  - ${ticket.title}: реакция ${ticket.responseMinutes ?? '-'} мин, решение ${ticket.resolutionHours ?? '-'} ч, ${breach}`);
        }
      }
    }

    return lines.join('\n');
  });

  return [
    'Кратко по KPI сотрудников:',
    ...summary,
  ].join('\n\n');
}

function writeSseText(res: Response, text: string) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}

router.post('/agent', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { message, ticketId, language } = req.body;
    const text = String(message || '').trim();
    if (!text) return res.status(400).json({ error: 'Message is required' });

    const parsed = await callJsonModel(
      `Ты диспетчер действий ITSM. Верни ТОЛЬКО JSON:
{
  "action": "create_ticket" | "update_status" | "assign_ticket" | "none",
  "title": string,
  "description": string,
  "priority": "low" | "medium" | "high" | "critical",
  "ticketId": string,
  "status": "new" | "assigned" | "in_progress" | "resolved" | "closed" | "reopened",
  "assignee": string
}
Правила: создавай action только если пользователь явно просит создать тикет, поменять статус или назначить исполнителя. Если данных не хватает, action="none".`,
      text,
    );

    const action = String(parsed.action || 'none');

    if (action === 'create_ticket') {
      const title = String(parsed.title || '').trim();
      if (!title) return res.status(400).json({ error: 'Не удалось определить название тикета' });
      const ticketPriority = normalizePriority(parsed.priority);
      const [ticket] = await db.insert(tickets).values({
        title,
        description: String(parsed.description || text).trim(),
        priority: ticketPriority as any,
        requesterId: req.user!.userId,
        status: 'new',
      }).returning();
      return res.status(201).json({
        action,
        ticket,
        message: `Тикет создан: ${ticket.title}`,
      });
    }

    if (action === 'update_status') {
      if (!canManageTickets(req.user!.role)) return res.status(403).json({ error: 'Недостаточно прав для изменения статуса' });
      const targetTicketId = String(parsed.ticketId || ticketId || '').trim();
      const status = normalizeStatus(parsed.status);
      if (!targetTicketId || !status) return res.status(400).json({ error: 'Нужны ID тикета и статус' });
      const [current] = await db.select().from(tickets).where(eq(tickets.id, targetTicketId)).limit(1);
      if (!current) return res.status(404).json({ error: 'Тикет не найден' });
      const [updated] = await db.update(tickets).set({
        status: status as any,
        updatedAt: new Date(),
        ...(status === 'closed' ? { closedAt: new Date() } : {}),
      }).where(eq(tickets.id, targetTicketId)).returning();
      await db.insert(ticketHistory).values({
        ticketId: targetTicketId,
        actorId: req.user!.userId,
        field: 'status',
        oldValue: current.status,
        newValue: status,
      });
      return res.json({ action, ticket: updated, message: `Статус тикета изменён на ${status}` });
    }

    if (action === 'assign_ticket') {
      if (!canManageTickets(req.user!.role)) return res.status(403).json({ error: 'Недостаточно прав для назначения исполнителя' });
      const targetTicketId = String(parsed.ticketId || ticketId || '').trim();
      if (!targetTicketId) return res.status(400).json({ error: 'Нужен ID тикета' });
      const assignee = await findUserByText(String(parsed.assignee || ''));
      if (!assignee) return res.status(400).json({ error: 'Исполнитель не найден' });
      const [current] = await db.select().from(tickets).where(eq(tickets.id, targetTicketId)).limit(1);
      if (!current) return res.status(404).json({ error: 'Тикет не найден' });
      const [updated] = await db.update(tickets).set({
        assigneeId: assignee.userId,
        status: current.status === 'new' ? 'assigned' : current.status,
        updatedAt: new Date(),
      }).where(eq(tickets.id, targetTicketId)).returning();
      await db.insert(ticketHistory).values({
        ticketId: targetTicketId,
        actorId: req.user!.userId,
        field: 'assignee_id',
        oldValue: current.assigneeId,
        newValue: assignee.userId,
      });
      return res.json({ action, ticket: updated, assignee, message: `Тикет назначен: ${assignee.name}` });
    }

    return res.json({
      action: 'none',
      message: language === 'kk'
        ? 'Әрекет анықталмады. Мысалы: "Создай тикет: не работает принтер".'
        : 'Я не увидел явную команду. Например: "Создай тикет: не работает принтер".',
    });
  } catch (error) {
    console.error('AI agent action error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'AI action failed' });
  }
});

router.post('/tickets/:id/analyze', authMiddleware, async (req: Request, res: Response) => {
  try {
    const bundle = await getTicketBundle(String(req.params.id));
    if (!bundle) return res.status(404).json({ error: 'Тикет не найден' });

    const kbContext = await fetchKnowledgeContext(`${bundle.ticket.title} ${bundle.ticket.description || ''}`, req.user!.role);
    const analysis = await callTextModel(
      `Ты AI-аналитик ITSM. Отвечай кратко на русском. Дай: краткое резюме, вероятную причину, риск SLA, следующие шаги, подходящие статьи базы знаний.${kbContext}`,
      JSON.stringify(bundle, null, 2),
    );

    res.json({ analysis });
  } catch (error) {
    console.error('AI ticket analysis error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'AI analysis failed' });
  }
});

router.post('/reports/file', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!canManageTickets(req.user!.role)) return res.status(403).json({ error: 'Недостаточно прав для генерации отчёта' });
    const { periodMonth } = req.body;
    const period = String(periodMonth || new Date().toISOString().slice(0, 7));
    const ticketsRes = await db.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(500);
    const slaRows = await db.select().from(ticketSla);
    const periodTickets = ticketsRes.filter((ticket) => new Date(ticket.createdAt).toISOString().slice(0, 7) === period);
    const content = await callTextModel(
      'Ты AI-аналитик service desk. Сформируй профессиональный месячный отчёт в Markdown на русском: итоги, статусы, приоритеты, SLA, риски, рекомендации.',
      JSON.stringify({
        period,
        tickets: periodTickets,
        sla: slaRows,
      }, null, 2),
    );

    const title = `AI отчет ${period}`;
    const [saved] = await db.insert(reports).values({
      title,
      content,
      periodMonth: period,
      authorId: req.user!.userId,
    }).returning();

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ai-report-${period}.md"`);
    res.setHeader('X-Report-Id', saved.id);
    res.send(content);
  } catch (error) {
    console.error('AI report file error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'AI report failed' });
  }
});

// POST /api/ai-chat
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { messages, type, ticketData, userContext, suggestMode, language } = req.body;
    const apiKey = resolveOpenAiBearer(openaiBaseUrl);
    const currentUserRole = req.user!.role;
    const currentText = latestUserText(messages);

    if (!suggestMode && ['admin', 'manager'].includes(currentUserRole) && isEmployeeKpiQuestion(currentText)) {
      try {
        const stats = await fetchEmployeeAnalytics();
        return writeSseText(res, formatEmployeeKpiAnswer(stats, currentText));
      } catch (e) {
        console.error('Failed to answer employee KPI question:', e);
      }
    }

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

    let knowledgeContext = '';
    try {
      knowledgeContext = await fetchKnowledgeContext(latestUserText(messages), req.user!.role);
    } catch (e) {
      console.error('Failed to fetch KB context for AI:', e);
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
${langInstruction} ${outputStyleInstruction} ${strictTemplateInstruction}${userInfo}${employeeAnalytics}${knowledgeContext}
Данные тикета: ${JSON.stringify(ticketData || {})}`;
        break;
      case 'report_generation':
        systemPrompt = `Ты - AI аналитик для Helpdesk системы Qazaq Generation. ${langInstruction} ${outputStyleInstruction} ${strictTemplateInstruction}${userInfo}${employeeAnalytics}${knowledgeContext}
Данные для анализа: ${JSON.stringify(ticketData || {})}`;
        break;
      default:
        systemPrompt = `Ты - AI помощник для ITSM системы Qazaq Generation. Твоё имя - qazq_mind. ${langInstruction} ${outputStyleInstruction} ${strictTemplateInstruction}${userInfo}${employeeAnalytics}${knowledgeContext}
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

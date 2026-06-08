import { Router } from 'express';
import { eq, desc, sql, and, or, gte, inArray } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import {
  categories, departments, groups, slaPolicies,
  notifications, pprPlans, reports, performanceScores,
  tickets, ticketHistory, ticketSla, userRoles, profiles,
} from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { notifyUsers } from '../services/notificationService.js';

const router = Router();
router.use(authMiddleware);

const pprUploadsDir = path.resolve('uploads/ppr');
fs.mkdirSync(pprUploadsDir, { recursive: true });
const pprUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, pprUploadsDir),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

type PprSigner = {
  userId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  decidedAt?: string | null;
};

const normalizeSignerIds = (value: unknown) => (
  Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : []
);

const normalizeSigners = (value: unknown): PprSigner[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => ({
      userId: String(item?.userId || ''),
      status: ['Approved', 'Rejected'].includes(item?.status) ? item.status : 'Pending',
      decidedAt: item?.decidedAt || null,
    }))
    .filter(signer => signer.userId);
};

const getPlanStatusFromSigners = (signers: PprSigner[]) => {
  if (!signers.length) return 'draft';
  if (signers.some(signer => signer.status === 'Rejected')) return 'rejected';
  if (signers.every(signer => signer.status === 'Approved')) return 'approved';
  return 'pending_approval';
};

// --- Categories ---
router.get('/categories', async (_req, res) => {
  const rows = await db.select().from(categories).orderBy(categories.name);
  res.json(rows);
});
router.post('/categories', requireRole('admin'), async (req, res) => {
  const [row] = await db.insert(categories).values(req.body).returning();
  res.status(201).json(row);
});
router.patch('/categories/:id', requireRole('admin'), async (req, res) => {
  const id = String(req.params.id);
  const [row] = await db.update(categories).set(req.body).where(eq(categories.id, id)).returning();
  res.json(row);
});
router.delete('/categories/:id', requireRole('admin'), async (req, res) => {
  const id = String(req.params.id);
  await db.delete(categories).where(eq(categories.id, id));
  res.json({ success: true });
});

// --- Departments ---
router.get('/departments', async (_req, res) => {
  const rows = await db.select().from(departments).orderBy(departments.name);
  res.json(rows);
});
router.post('/departments', requireRole('admin'), async (req, res) => {
  const [row] = await db.insert(departments).values(req.body).returning();
  res.status(201).json(row);
});
router.patch('/departments/:id', requireRole('admin'), async (req, res) => {
  const id = String(req.params.id);
  const [row] = await db.update(departments).set(req.body).where(eq(departments.id, id)).returning();
  res.json(row);
});
router.delete('/departments/:id', requireRole('admin'), async (req, res) => {
  const id = String(req.params.id);
  await db.delete(departments).where(eq(departments.id, id));
  res.json({ success: true });
});

// --- Groups ---
router.get('/groups', async (_req, res) => {
  const rows = await db.select().from(groups).orderBy(groups.name);
  res.json(rows);
});
router.post('/groups', requireRole('admin'), async (req, res) => {
  const [row] = await db.insert(groups).values(req.body).returning();
  res.status(201).json(row);
});
router.patch('/groups/:id', requireRole('admin'), async (req, res) => {
  const id = String(req.params.id);
  const [row] = await db.update(groups).set(req.body).where(eq(groups.id, id)).returning();
  res.json(row);
});
router.delete('/groups/:id', requireRole('admin'), async (req, res) => {
  const id = String(req.params.id);
  await db.delete(groups).where(eq(groups.id, id));
  res.json({ success: true });
});

// --- SLA Policies ---
router.get('/sla-policies', async (_req, res) => {
  const rows = await db.select().from(slaPolicies);
  res.json(rows);
});
router.post('/sla-policies', requireRole('admin'), async (req, res) => {
  const [row] = await db.insert(slaPolicies).values(req.body).returning();
  res.status(201).json(row);
});
router.patch('/sla-policies/:id', requireRole('admin'), async (req, res) => {
  const id = String(req.params.id);
  const [row] = await db.update(slaPolicies).set(req.body).where(eq(slaPolicies.id, id)).returning();
  res.json(row);
});
router.delete('/sla-policies/:id', requireRole('admin'), async (req, res) => {
  const id = String(req.params.id);
  await db.delete(slaPolicies).where(eq(slaPolicies.id, id));
  res.json({ success: true });
});

// --- Notifications ---
router.get('/notifications', async (req, res) => {
  const rows = await db.select().from(notifications)
    .where(eq(notifications.toUserId, req.user!.userId))
    .orderBy(desc(notifications.createdAt));
  res.json(rows);
});
router.patch('/notifications/:id/read', async (req, res) => {
  const id = String(req.params.id);
  const [row] = await db.update(notifications).set({ isRead: true })
    .where(eq(notifications.id, id)).returning();
  res.json(row);
});

// --- PPR Plans ---
router.get('/ppr-plans', async (_req, res) => {
  const rows = await db.select().from(pprPlans).orderBy(desc(pprPlans.scheduledDate));
  res.json(rows);
});
router.post('/ppr-plans', async (req, res) => {
  const signerIds = normalizeSignerIds(req.body.signerIds);
  const signers = signerIds.map(userId => ({ userId, status: 'Pending' as const, decidedAt: null }));
  const [row] = await db.insert(pprPlans).values({
    title: req.body.title,
    description: req.body.description || null,
    line: req.body.line === '3' ? '3' : '2',
    equipment: req.body.equipment || `Линия ${req.body.line === '3' ? '3' : '2'}`,
    location: req.body.location || null,
    scheduledDate: req.body.scheduledDate,
    frequency: req.body.frequency || 'once',
    assignedTo: req.body.assignedTo || null,
    checklist: Array.isArray(req.body.checklist) ? req.body.checklist : [],
    notes: req.body.notes || null,
    signers,
    status: getPlanStatusFromSigners(signers),
    createdBy: req.user!.userId,
  }).returning();

  if (signerIds.length) {
    await notifyUsers(signerIds, {
      type: 'ppr_signer_added',
      title: 'ППР: требуется решение',
      message: 'Вас добавили в подписанты документа ППР. Необходимо рассмотреть и принять решение.',
      payload: { pprPlanId: row.id },
    });
  }

  res.status(201).json(row);
});
router.patch('/ppr-plans/:id', async (req, res) => {
  const planId = String(req.params.id);
  const updates: any = { updatedAt: new Date() };
  const allowedFields = ['title', 'description', 'line', 'equipment', 'location', 'scheduledDate', 'frequency', 'assignedTo', 'checklist', 'notes'];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (req.body.signerIds !== undefined) {
    const signerIds = normalizeSignerIds(req.body.signerIds);
    const signers = signerIds.map(userId => ({ userId, status: 'Pending' as const, decidedAt: null }));
    updates.signers = signers;
    updates.status = getPlanStatusFromSigners(signers);
    if (signerIds.length) {
      await notifyUsers(signerIds, {
        type: 'ppr_signer_added',
        title: 'ППР: требуется решение',
        message: 'Вас добавили в подписанты документа ППР. Необходимо рассмотреть и принять решение.',
        payload: { pprPlanId: planId },
      });
    }
  } else if (req.body.status !== undefined) {
    updates.status = req.body.status;
  }

  const [row] = await db.update(pprPlans).set(updates).where(eq(pprPlans.id, planId)).returning();
  res.json(row);
});
router.post('/ppr-plans/:id/decision', async (req, res) => {
  const planId = String(req.params.id);
  const decision: 'Approved' | 'Rejected' = req.body.decision === 'Rejected' ? 'Rejected' : 'Approved';
  const [plan] = await db.select().from(pprPlans).where(eq(pprPlans.id, planId)).limit(1);
  if (!plan) return res.status(404).json({ error: 'ППР не найден' });

  const signers = normalizeSigners(plan.signers);
  const signer = signers.find(item => item.userId === req.user!.userId);
  if (!signer) return res.status(403).json({ error: 'Вы не являетесь подписантом этого ППР' });

  const updatedSigners: PprSigner[] = signers.map(item => item.userId === req.user!.userId
    ? { ...item, status: decision, decidedAt: new Date().toISOString() }
    : item);
  const [row] = await db.update(pprPlans)
    .set({ signers: updatedSigners, status: getPlanStatusFromSigners(updatedSigners), updatedAt: new Date() })
    .where(eq(pprPlans.id, planId))
    .returning();

  return res.json(row);
});
router.post('/ppr-plans/:id/attachment', pprUpload.single('file'), async (req, res) => {
  const planId = String(req.params.id);
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
  const attachment = {
    fileName: req.file.originalname,
    filePath: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user!.userId,
    uploadedAt: new Date().toISOString(),
  };
  const [row] = await db.update(pprPlans)
    .set({ attachment, updatedAt: new Date() })
    .where(eq(pprPlans.id, planId))
    .returning();
  res.status(201).json(row);
});
router.get('/ppr-plans/:id/attachment/download', async (req, res) => {
  const planId = String(req.params.id);
  const [plan] = await db.select().from(pprPlans).where(eq(pprPlans.id, planId)).limit(1);
  const attachment = plan?.attachment as any;
  if (!attachment?.filePath) return res.status(404).json({ error: 'Файл не найден' });
  const filePath = path.join(pprUploadsDir, attachment.filePath);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл не найден' });
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName || 'ppr-file')}"`);
  return res.sendFile(filePath);
});
router.delete('/ppr-plans/:id', requireRole('admin'), async (req, res) => {
  await db.delete(pprPlans).where(eq(pprPlans.id, String(req.params.id)));
  res.json({ success: true });
});

// --- Reports ---
router.get('/reports', async (req, res) => {
  const isManager = ['admin', 'manager'].includes(req.user!.role);
  const where = isManager ? undefined : eq(reports.authorId, req.user!.userId);
  const rows = await db.select().from(reports).where(where).orderBy(desc(reports.createdAt));
  res.json(rows);
});
router.post('/reports', async (req, res) => {
  const [row] = await db.insert(reports).values({ ...req.body, authorId: req.user!.userId }).returning();
  res.status(201).json(row);
});
router.patch('/reports/:id', async (req, res) => {
  const [row] = await db.update(reports).set({ ...req.body, updatedAt: new Date() })
    .where(eq(reports.id, req.params.id)).returning();
  res.json(row);
});
router.delete('/reports', async (req, res) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];

  if (ids.length === 0) return res.status(400).json({ error: 'Не выбраны отчёты для удаления' });

  const canDeleteAll = ['admin', 'manager'].includes(req.user!.role);
  const where = canDeleteAll
    ? inArray(reports.id, ids)
    : and(inArray(reports.id, ids), eq(reports.authorId, req.user!.userId));
  const deleted = await db.delete(reports).where(where).returning({ id: reports.id });

  res.json({ success: true, deleted: deleted.length });
});
router.delete('/reports/:id', async (req, res) => {
  const canDeleteAll = ['admin', 'manager'].includes(req.user!.role);
  const where = canDeleteAll
    ? eq(reports.id, req.params.id)
    : and(eq(reports.id, req.params.id), eq(reports.authorId, req.user!.userId));
  const deleted = await db.delete(reports).where(where).returning({ id: reports.id });

  if (deleted.length === 0) return res.status(404).json({ error: 'Отчёт не найден' });
  res.json({ success: true });
});

// --- Performance Scores ---
router.get('/performance-scores', async (req, res) => {
  const isManager = ['admin', 'manager'].includes(req.user!.role);
  const where = isManager ? undefined : eq(performanceScores.userId, req.user!.userId);
  const rows = await db.select().from(performanceScores).where(where).orderBy(desc(performanceScores.createdAt));
  res.json(rows);
});

router.get('/performance-kpi', async (req, res) => {
  try {
    const periodMonth = typeof req.query.periodMonth === 'string'
      ? req.query.periodMonth
      : new Date().toISOString().slice(0, 7);
    const [year, month] = periodMonth.split('-').map(Number);
    if (!year || !month) return res.status(400).json({ error: 'Некорректный период' });

    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 1));
    const canSeeAll = ['admin', 'manager'].includes(req.user!.role);

    const [allProfiles, allRoles, allGroups, allTickets, allSla, allHistory] = await Promise.all([
      db.select().from(profiles),
      db.select().from(userRoles),
      db.select().from(groups),
      db.select().from(tickets),
      db.select().from(ticketSla),
      db.select().from(ticketHistory),
    ]);

    const roleMap = new Map(allRoles.map(role => [role.userId, role.role]));
    const groupMap = new Map(allGroups.map(group => [group.id, group.name]));
    const slaMap = new Map(allSla.map(sla => [sla.ticketId, sla]));
    const resolutionDates = new Map<string, Date>();
    const reopenedCounts = new Map<string, number>();

    for (const item of allHistory) {
      if (item.field !== 'status') continue;
      if (item.newValue === 'resolved' || item.newValue === 'closed') {
        const current = resolutionDates.get(item.ticketId);
        const createdAt = new Date(item.createdAt);
        if (!current || createdAt < current) resolutionDates.set(item.ticketId, createdAt);
      }
      if (item.newValue === 'reopened') {
        reopenedCounts.set(item.ticketId, (reopenedCounts.get(item.ticketId) || 0) + 1);
      }
    }

    const staffProfiles = allProfiles
      .filter(profile => ['agent', 'manager'].includes(roleMap.get(profile.userId) || 'employee'))
      .filter(profile => canSeeAll || profile.userId === req.user!.userId);

    const rows = staffProfiles.map(profile => {
      const assigned = allTickets.filter(ticket => ticket.assigneeId === profile.userId);
      const periodAssigned = assigned.filter(ticket => {
        const createdAt = new Date(ticket.createdAt);
        const resolvedAt = resolutionDates.get(ticket.id);
        return (createdAt >= periodStart && createdAt < periodEnd)
          || (!!resolvedAt && resolvedAt >= periodStart && resolvedAt < periodEnd);
      });
      const resolved = assigned.filter(ticket => {
        const resolvedAt = resolutionDates.get(ticket.id);
        return resolvedAt && resolvedAt >= periodStart && resolvedAt < periodEnd;
      });
      const active = assigned.filter(ticket => !['resolved', 'closed'].includes(ticket.status));
      const slaTickets = periodAssigned
        .map(ticket => slaMap.get(ticket.id))
        .filter(Boolean) as typeof allSla;
      const slaBreached = slaTickets.filter(sla => sla.breachedResponse || sla.breachedResolve).length;
      const slaOk = Math.max(slaTickets.length - slaBreached, 0);
      const slaRate = slaTickets.length ? Math.round((slaOk / slaTickets.length) * 100) : 100;
      const responseMinutes = periodAssigned
        .map(ticket => {
          const sla = slaMap.get(ticket.id);
          if (!sla?.respondedAt) return null;
          return Math.max(0, Math.round((new Date(sla.respondedAt).getTime() - new Date(ticket.createdAt).getTime()) / 60000));
        })
        .filter((value): value is number => value !== null);
      const avgResponseMinutes = responseMinutes.length
        ? Math.round(responseMinutes.reduce((sum, value) => sum + value, 0) / responseMinutes.length)
        : 0;
      const resolutionHours = resolved
        .map(ticket => {
          const resolvedAt = resolutionDates.get(ticket.id);
          if (!resolvedAt) return null;
          return Math.max(0, (resolvedAt.getTime() - new Date(ticket.createdAt).getTime()) / 3600000);
        })
        .filter((value): value is number => value !== null);
      const avgResolutionHours = resolutionHours.length
        ? Number((resolutionHours.reduce((sum, value) => sum + value, 0) / resolutionHours.length).toFixed(1))
        : 0;
      const reopened = assigned.reduce((sum, ticket) => sum + (reopenedCounts.get(ticket.id) || 0), 0);
      const ticketDetails = periodAssigned.map(ticket => {
        const sla = slaMap.get(ticket.id);
        const resolvedAt = resolutionDates.get(ticket.id);
        const responseMinutes = sla?.respondedAt
          ? Math.max(0, Math.round((new Date(sla.respondedAt).getTime() - new Date(ticket.createdAt).getTime()) / 60000))
          : null;
        const resolutionHours = resolvedAt
          ? Number(Math.max(0, (resolvedAt.getTime() - new Date(ticket.createdAt).getTime()) / 3600000).toFixed(1))
          : null;

        return {
          id: ticket.id,
          title: ticket.title,
          priority: ticket.priority,
          status: ticket.status,
          createdAt: ticket.createdAt,
          respondedAt: sla?.respondedAt || null,
          responseMinutes,
          resolvedAt: resolvedAt?.toISOString() || null,
          resolutionHours,
          breachedResponse: !!sla?.breachedResponse,
          breachedResolve: !!sla?.breachedResolve,
        };
      });

      return {
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        role: roleMap.get(profile.userId) || 'employee',
        position: profile.groupId ? groupMap.get(profile.groupId) : undefined,
        assigned: periodAssigned.length,
        resolved: resolved.length,
        active: active.length,
        slaRate,
        slaBreached,
        avgResponseMinutes,
        avgResolutionHours,
        reopened,
        ticketDetails,
      };
    });

    const maxResolved = Math.max(...rows.map(row => row.resolved), 1);
    const scoredRows = rows
      .map(row => {
        const productivity = Math.round((row.resolved / maxResolved) * 100);
        const timeliness = Math.round(Math.max(0, row.slaRate - Math.min(row.avgResponseMinutes / 10, 20)));
        const quality = Math.round(Math.max(0, 100 - row.reopened * 10 - row.slaBreached * 8));
        const score = Math.round(productivity * 0.35 + timeliness * 0.35 + quality * 0.30);
        return { ...row, productivity, timeliness, quality, score };
      })
      .sort((a, b) => b.score - a.score);

    return res.json({ periodMonth, rows: scoredRows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'KPI есебі қатесі' });
  }
});

// --- Dashboard ---
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const isAgent = ['agent', 'admin', 'manager'].includes(role);

    // Base condition for employees: only their tickets
    const myCondition = eq(tickets.requesterId, userId);

    // Total counts by status
    const statusWhere = role === 'employee' ? myCondition : undefined;
    const [totalRow] = await db.select({ count: sql<number>`count(*)` }).from(tickets).where(statusWhere);
    const statusRows = await db.select({
      status: tickets.status,
      count: sql<number>`count(*)`,
    }).from(tickets).where(statusWhere).groupBy(tickets.status);

    const statusMap: Record<string, number> = {};
    for (const r of statusRows) statusMap[r.status] = Number(r.count);

    // Priority breakdown
    const priorityRows = await db.select({
      priority: tickets.priority,
      count: sql<number>`count(*)`,
    }).from(tickets).where(statusWhere).groupBy(tickets.priority);

    const priorityMap: Record<string, number> = {};
    for (const r of priorityRows) priorityMap[r.priority] = Number(r.count);

    // Recent tickets
    const recentTickets = await db.select().from(tickets)
      .where(statusWhere)
      .orderBy(desc(tickets.createdAt))
      .limit(10);

    // SLA breaches
    const slaBreaches = await db.select({ count: sql<number>`count(*)` })
      .from(ticketSla)
      .where(or(eq(ticketSla.breachedResponse, true), eq(ticketSla.breachedResolve, true)));

    // Tickets created last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const [recentCount] = await db.select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(and(statusWhere, gte(tickets.createdAt, weekAgo)));

    // Agent workload (for managers)
    let agentWorkload: any[] = [];
    if (isAgent) {
      const workloadRows = await db.select({
        assigneeId: tickets.assigneeId,
        count: sql<number>`count(*)`,
      }).from(tickets)
        .where(and(
          sql`${tickets.assigneeId} IS NOT NULL`,
          sql`${tickets.status} NOT IN ('closed', 'resolved')`,
        ))
        .groupBy(tickets.assigneeId);

      const allProfiles = await db.select().from(profiles);
      const profileMap = new Map(allProfiles.map(p => [p.userId, p.name]));

      agentWorkload = workloadRows.map(r => ({
        assignee_id: r.assigneeId,
        assignee_name: profileMap.get(r.assigneeId!) || 'Белгісіз',
        open_tickets: Number(r.count),
      }));
    }

    return res.json({
      total: Number(totalRow.count),
      byStatus: statusMap,
      byPriority: priorityMap,
      recentTickets,
      slaBreaches: Number(slaBreaches[0]?.count || 0),
      lastWeekCount: Number(recentCount.count),
      agentWorkload,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Dashboard қатесі' });
  }
});

// --- Ticket History ---
router.get('/ticket-history', async (req, res) => {
  try {
    const { ticketId } = req.query;
    const where = ticketId ? eq(ticketHistory.ticketId, ticketId as string) : undefined;
    const rows = await db.select().from(ticketHistory).where(where).orderBy(desc(ticketHistory.createdAt)).limit(200);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// --- Ticket SLA ---
router.get('/ticket-sla', async (req, res) => {
  try {
    const { ticketId } = req.query;
    const where = ticketId ? eq(ticketSla.ticketId, ticketId as string) : undefined;
    const rows = await db.select().from(ticketSla).where(where);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// --- User Roles ---
router.get('/user-roles', async (_req, res) => {
  try {
    const rows = await db.select().from(userRoles);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

export default router;

import { Router } from 'express';
import { eq, desc, sql, and, or, gte } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  categories, departments, groups, slaPolicies,
  notifications, pprPlans, reports, performanceScores,
  tickets, ticketHistory, ticketSla, userRoles, profiles,
} from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

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
  const [row] = await db.update(categories).set(req.body).where(eq(categories.id, req.params.id)).returning();
  res.json(row);
});
router.delete('/categories/:id', requireRole('admin'), async (req, res) => {
  await db.delete(categories).where(eq(categories.id, req.params.id));
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
  const [row] = await db.update(departments).set(req.body).where(eq(departments.id, req.params.id)).returning();
  res.json(row);
});
router.delete('/departments/:id', requireRole('admin'), async (req, res) => {
  await db.delete(departments).where(eq(departments.id, req.params.id));
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
  const [row] = await db.update(groups).set(req.body).where(eq(groups.id, req.params.id)).returning();
  res.json(row);
});
router.delete('/groups/:id', requireRole('admin'), async (req, res) => {
  await db.delete(groups).where(eq(groups.id, req.params.id));
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
  const [row] = await db.update(slaPolicies).set(req.body).where(eq(slaPolicies.id, req.params.id)).returning();
  res.json(row);
});
router.delete('/sla-policies/:id', requireRole('admin'), async (req, res) => {
  await db.delete(slaPolicies).where(eq(slaPolicies.id, req.params.id));
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
  const [row] = await db.update(notifications).set({ isRead: true })
    .where(eq(notifications.id, req.params.id)).returning();
  res.json(row);
});

// --- PPR Plans ---
router.get('/ppr-plans', async (_req, res) => {
  const rows = await db.select().from(pprPlans).orderBy(desc(pprPlans.scheduledDate));
  res.json(rows);
});
router.post('/ppr-plans', async (req, res) => {
  const [row] = await db.insert(pprPlans).values({ ...req.body, createdBy: req.user!.userId }).returning();
  res.status(201).json(row);
});
router.patch('/ppr-plans/:id', async (req, res) => {
  const [row] = await db.update(pprPlans).set({ ...req.body, updatedAt: new Date() })
    .where(eq(pprPlans.id, req.params.id)).returning();
  res.json(row);
});
router.delete('/ppr-plans/:id', requireRole('admin'), async (req, res) => {
  await db.delete(pprPlans).where(eq(pprPlans.id, req.params.id));
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

// --- Performance Scores ---
router.get('/performance-scores', async (req, res) => {
  const isManager = ['admin', 'manager'].includes(req.user!.role);
  const where = isManager ? undefined : eq(performanceScores.userId, req.user!.userId);
  const rows = await db.select().from(performanceScores).where(where).orderBy(desc(performanceScores.createdAt));
  res.json(rows);
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

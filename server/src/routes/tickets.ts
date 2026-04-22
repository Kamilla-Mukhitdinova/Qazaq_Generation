import { Router } from 'express';
import { eq, desc, sql, and, or, ilike } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db/index.js';
import { tickets, ticketComments, ticketHistory, ticketSla, ticketAttachments, profiles, slaPolicies } from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { notifyUser, notifyUsers } from '../services/notificationService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

const router = Router();
router.use(authMiddleware);

// List tickets
router.get('/', async (req, res) => {
  try {
    const { status, priority, assignee_id, search, limit = '50', offset = '0' } = req.query;
    const conditions: any[] = [];

    // Role-based access
    if (req.user!.role === 'employee') {
      conditions.push(
        or(eq(tickets.requesterId, req.user!.userId), eq(tickets.assigneeId, req.user!.userId))
      );
    }

    if (status) conditions.push(eq(tickets.status, status as any));
    if (priority) conditions.push(eq(tickets.priority, priority as any));
    if (assignee_id) conditions.push(eq(tickets.assigneeId, assignee_id as string));
    if (search) conditions.push(ilike(tickets.title, `%${search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.select().from(tickets).where(where)
      .orderBy(desc(tickets.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(tickets).where(where);

    return res.json({ data: rows, count: Number(count) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Get single ticket
router.get('/:id', async (req, res) => {
  try {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, req.params.id)).limit(1);
    if (!ticket) return res.status(404).json({ error: 'Тикет табылмады' });

    const comments = await db.select().from(ticketComments).where(eq(ticketComments.ticketId, ticket.id)).orderBy(desc(ticketComments.createdAt));
    const history = await db.select().from(ticketHistory).where(eq(ticketHistory.ticketId, ticket.id)).orderBy(desc(ticketHistory.createdAt));
    const [sla] = await db.select().from(ticketSla).where(eq(ticketSla.ticketId, ticket.id)).limit(1);
    const attachments = await db.select().from(ticketAttachments).where(eq(ticketAttachments.ticketId, ticket.id));

    // Get requester and assignee profiles
    const [requester] = await db.select().from(profiles).where(eq(profiles.userId, ticket.requesterId)).limit(1);
    const assignee = ticket.assigneeId
      ? (await db.select().from(profiles).where(eq(profiles.userId, ticket.assigneeId)).limit(1))[0]
      : null;

    return res.json({ ...ticket, comments, history, sla, attachments, requester, assignee });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Create ticket
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, categoryId, groupId } = req.body;
    const ticketPriority = priority || 'medium';

    const [ticket] = await db.insert(tickets).values({
      title,
      description,
      priority: ticketPriority,
      categoryId,
      groupId,
      requesterId: req.user!.userId,
    }).returning();

    // Auto-calculate SLA based on sla_policies
    try {
      // Find matching policy: by category+priority first, then priority-only fallback
      const policies = await db.select().from(slaPolicies)
        .where(eq(slaPolicies.priority, ticketPriority));

      let policy = policies.find(p => p.categoryId === categoryId) 
                || policies.find(p => !p.categoryId)
                || policies[0];

      if (policy) {
        const now = new Date();
        const responseDue = new Date(now.getTime() + policy.responseMinutes * 60 * 1000);
        const resolveDue = new Date(now.getTime() + policy.resolveMinutes * 60 * 1000);

        await db.insert(ticketSla).values({
          ticketId: ticket.id,
          responseDue,
          resolveDue,
        });
      }
    } catch (slaErr) {
      console.error('SLA calculation error (non-fatal):', slaErr);
    }

    return res.status(201).json(ticket);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Update ticket
router.patch('/:id', requireRole('agent', 'admin', 'manager'), async (req, res) => {
  try {
    const { status, priority, assigneeId, groupId, categoryId } = req.body;

    // Fetch current ticket for audit trail
    const [current] = await db.select().from(tickets).where(eq(tickets.id, req.params.id)).limit(1);
    if (!current) return res.status(404).json({ error: 'Тикет табылмады' });

    const updateData: any = { updatedAt: new Date() };
    const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];

    if (status && status !== current.status) {
      updateData.status = status;
      changes.push({ field: 'status', oldValue: current.status, newValue: status });
    }
    if (priority && priority !== current.priority) {
      updateData.priority = priority;
      changes.push({ field: 'priority', oldValue: current.priority, newValue: priority });
    }
    if (assigneeId !== undefined && assigneeId !== current.assigneeId) {
      updateData.assigneeId = assigneeId;
      changes.push({ field: 'assignee_id', oldValue: current.assigneeId, newValue: assigneeId });
    }
    if (groupId !== undefined && groupId !== current.groupId) {
      updateData.groupId = groupId;
      changes.push({ field: 'group_id', oldValue: current.groupId, newValue: groupId });
    }
    if (categoryId !== undefined && categoryId !== current.categoryId) {
      updateData.categoryId = categoryId;
      changes.push({ field: 'category_id', oldValue: current.categoryId, newValue: categoryId });
    }
    if (status === 'closed') updateData.closedAt = new Date();

    // Mark SLA responded_at on first agent action
    if (changes.length > 0) {
      try {
        const [sla] = await db.select().from(ticketSla).where(eq(ticketSla.ticketId, req.params.id)).limit(1);
        if (sla && !sla.respondedAt) {
          const now = new Date();
          const slaUpdate: any = { respondedAt: now };
          if (sla.responseDue && now > new Date(sla.responseDue)) slaUpdate.breachedResponse = true;
          await db.update(ticketSla).set(slaUpdate).where(eq(ticketSla.ticketId, req.params.id));
        }
        if (sla && status === 'resolved' && sla.resolveDue) {
          const now = new Date();
          if (now > new Date(sla.resolveDue)) {
            await db.update(ticketSla).set({ breachedResolve: true }).where(eq(ticketSla.ticketId, req.params.id));
          }
        }
      } catch (slaErr) {
        console.error('SLA update error (non-fatal):', slaErr);
      }
    }

    const [updated] = await db.update(tickets).set(updateData)
      .where(eq(tickets.id, req.params.id)).returning();

    // Write audit trail
    if (changes.length > 0) {
      await db.insert(ticketHistory).values(
        changes.map(c => ({
          ticketId: req.params.id,
          actorId: req.user!.userId,
          field: c.field,
          oldValue: c.oldValue,
          newValue: c.newValue,
        }))
      );
    }

    // --- Send notifications ---
    const statusLabels: Record<string, string> = {
      new: 'Жаңа', assigned: 'Тағайындалған', in_progress: 'Орындалуда',
      resolved: 'Шешілген', closed: 'Жабылған', reopened: 'Қайта ашылған',
    };

    // Status change → notify requester
    const statusChange = changes.find(c => c.field === 'status');
    if (statusChange) {
      notifyUser({
        userId: current.requesterId,
        type: 'ticket_status_changed',
        title: 'Тикет статусы өзгерді',
        message: `"${current.title}" тикетінің статусы "${statusLabels[statusChange.newValue!] || statusChange.newValue}" болып өзгерді`,
        payload: { ticketId: current.id },
      });
    }

    // Assignment → notify new assignee
    const assignChange = changes.find(c => c.field === 'assignee_id');
    if (assignChange && assignChange.newValue) {
      notifyUser({
        userId: assignChange.newValue,
        type: 'ticket_assigned',
        title: 'Жаңа тикет тағайындалды',
        message: `"${current.title}" тикеті сізге тағайындалды`,
        payload: { ticketId: current.id },
      });
    }

    // SLA breach → notify assignee + requester
    if (changes.length > 0) {
      try {
        const [slaAfter] = await db.select().from(ticketSla).where(eq(ticketSla.ticketId, req.params.id)).limit(1);
        if (slaAfter?.breachedResponse || slaAfter?.breachedResolve) {
          const targets = [current.requesterId, current.assigneeId].filter(Boolean) as string[];
          const breachType = slaAfter.breachedResponse ? 'жауап беру' : 'шешу';
          notifyUsers(targets, {
            type: 'sla_breach',
            title: 'SLA мерзімі бұзылды',
            message: `"${current.title}" тикетінің ${breachType} SLA мерзімі бұзылды`,
            payload: { ticketId: current.id },
          });
        }
      } catch (_) { /* non-fatal */ }
    }

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Add comment
router.post('/:id/comments', async (req, res) => {
  try {
    const { body, isInternal } = req.body;
    const [comment] = await db.insert(ticketComments).values({
      ticketId: req.params.id,
      authorId: req.user!.userId,
      body,
      isInternal: isInternal || false,
    }).returning();

    // Notify relevant users about the new comment
    if (!isInternal) {
      try {
        const [ticket] = await db.select().from(tickets).where(eq(tickets.id, req.params.id)).limit(1);
        if (ticket) {
          const targets = [ticket.requesterId, ticket.assigneeId]
            .filter(Boolean)
            .filter(id => id !== req.user!.userId) as string[];

          notifyUsers(targets, {
            type: 'ticket_comment',
            title: 'Жаңа пікір қосылды',
            message: `"${ticket.title}" тикетіне жаңа пікір қосылды`,
            payload: { ticketId: ticket.id },
          });
        }
      } catch (_) { /* non-fatal */ }
    }

    return res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Upload attachment
router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл жүктелмеді' });

    const [attachment] = await db.insert(ticketAttachments).values({
      ticketId: req.params.id,
      uploadedBy: req.user!.userId,
      filePath: req.file.filename,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    }).returning();

    return res.status(201).json(attachment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Файл жүктеу қатесі' });
  }
});

// List attachments
router.get('/:id/attachments', async (req, res) => {
  try {
    const rows = await db.select().from(ticketAttachments)
      .where(eq(ticketAttachments.ticketId, req.params.id))
      .orderBy(desc(ticketAttachments.createdAt));
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Download attachment
router.get('/:id/attachments/:attachmentId/download', async (req, res) => {
  try {
    const [att] = await db.select().from(ticketAttachments)
      .where(eq(ticketAttachments.id, req.params.attachmentId)).limit(1);
    if (!att) return res.status(404).json({ error: 'Файл табылмады' });

    const filePath = path.join(UPLOADS_DIR, att.filePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл табылмады' });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(att.filename)}"`);
    if (att.mimeType) res.setHeader('Content-Type', att.mimeType);
    return res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Delete attachment
router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const [att] = await db.select().from(ticketAttachments)
      .where(eq(ticketAttachments.id, req.params.attachmentId)).limit(1);
    if (!att) return res.status(404).json({ error: 'Файл табылмады' });

    // Only uploader or admin/manager can delete
    if (att.uploadedBy !== req.user!.userId && !['admin', 'manager'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    const filePath = path.join(UPLOADS_DIR, att.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await db.delete(ticketAttachments).where(eq(ticketAttachments.id, req.params.attachmentId));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

export default router;

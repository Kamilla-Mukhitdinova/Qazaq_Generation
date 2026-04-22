import { Router } from 'express';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { pushSubscriptions, notificationPreferences, notifications } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { vapidConfigured } from '../services/notificationService.js';

const router = Router();
router.use(authMiddleware);

// ═══════════════════════════════════════════
//  NOTIFICATIONS CRUD
// ═══════════════════════════════════════════

// GET / - list notifications for current user (with pagination & filter)
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const typeFilter = req.query.type as string | undefined;
    const unreadOnly = req.query.unread === 'true';

    let where = eq(notifications.toUserId, userId);
    if (typeFilter) {
      where = and(where, eq(notifications.type, typeFilter))!;
    }
    if (unreadOnly) {
      where = and(where, eq(notifications.isRead, false))!;
    }

    const [items, countResult] = await Promise.all([
      db.select().from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(notifications).where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    // Unread count (always for current user, no filters)
    const [unreadResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.toUserId, userId), eq(notifications.isRead, false)));

    res.json({
      data: items,
      total,
      unreadCount: unreadResult?.count ?? 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('GET /notifications error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id/read - mark single notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const [notif] = await db.select().from(notifications).where(eq(notifications.id, id));
    if (!notif || notif.toUserId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error('PATCH /notifications/:id/read error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /read-all - mark all notifications as read
router.patch('/read-all', async (req, res) => {
  try {
    const userId = req.user!.userId;
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.toUserId, userId), eq(notifications.isRead, false)));
    res.json({ success: true });
  } catch (err: any) {
    console.error('PATCH /notifications/read-all error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id - delete a notification
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const [notif] = await db.select().from(notifications).where(eq(notifications.id, id));
    if (!notif || notif.toUserId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await db.delete(notifications).where(eq(notifications.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /notifications/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /clear-all - delete all read notifications
router.delete('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    await db.delete(notifications)
      .where(and(eq(notifications.toUserId, userId), eq(notifications.isRead, true)));
    res.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /notifications error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════
//  PUSH SUBSCRIPTIONS
// ═══════════════════════════════════════════

// Get VAPID public key
router.get('/vapid-key', (_req, res) => {
  if (!vapidConfigured) return res.json({ publicKey: null });
  return res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Save push subscription
router.post('/push-subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    const [sub] = await db.insert(pushSubscriptions).values({
      userId: req.user!.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }).returning();
    return res.status(201).json(sub);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Remove push subscription
router.post('/push-unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════
//  NOTIFICATION PREFERENCES
// ═══════════════════════════════════════════

// Get preferences
router.get('/preferences', async (req, res) => {
  try {
    const [prefs] = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, req.user!.userId)).limit(1);

    if (!prefs) {
      return res.json({
        status_change: { in_app: true, email: true, push: true },
        assignment: { in_app: true, email: true, push: true },
        comment: { in_app: true, email: true, push: true },
        sla_breach: { in_app: true, email: true, push: true },
      });
    }

    return res.json({
      status_change: { in_app: prefs.statusChangeInApp, email: prefs.statusChangeEmail, push: prefs.statusChangePush },
      assignment: { in_app: prefs.assignmentInApp, email: prefs.assignmentEmail, push: prefs.assignmentPush },
      comment: { in_app: prefs.commentInApp, email: prefs.commentEmail, push: prefs.commentPush },
      sla_breach: { in_app: prefs.slaBreachInApp, email: prefs.slaBreachEmail, push: prefs.slaBreachPush },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Update preferences
router.patch('/preferences', async (req, res) => {
  try {
    const { status_change, assignment, comment, sla_breach } = req.body;
    const data: any = { updatedAt: new Date() };

    if (status_change) {
      if (status_change.in_app !== undefined) data.statusChangeInApp = status_change.in_app;
      if (status_change.email !== undefined) data.statusChangeEmail = status_change.email;
      if (status_change.push !== undefined) data.statusChangePush = status_change.push;
    }
    if (assignment) {
      if (assignment.in_app !== undefined) data.assignmentInApp = assignment.in_app;
      if (assignment.email !== undefined) data.assignmentEmail = assignment.email;
      if (assignment.push !== undefined) data.assignmentPush = assignment.push;
    }
    if (comment) {
      if (comment.in_app !== undefined) data.commentInApp = comment.in_app;
      if (comment.email !== undefined) data.commentEmail = comment.email;
      if (comment.push !== undefined) data.commentPush = comment.push;
    }
    if (sla_breach) {
      if (sla_breach.in_app !== undefined) data.slaBreachInApp = sla_breach.in_app;
      if (sla_breach.email !== undefined) data.slaBreachEmail = sla_breach.email;
      if (sla_breach.push !== undefined) data.slaBreachPush = sla_breach.push;
    }

    const [existing] = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, req.user!.userId)).limit(1);

    if (existing) {
      await db.update(notificationPreferences).set(data)
        .where(eq(notificationPreferences.userId, req.user!.userId));
    } else {
      await db.insert(notificationPreferences).values({
        userId: req.user!.userId,
        ...data,
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;

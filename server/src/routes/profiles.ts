import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { profiles, userRoles, users } from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Get all profiles (admin/manager)
router.get('/', requireRole('admin', 'manager', 'agent'), async (req, res) => {
  try {
    const allProfiles = await db.select().from(profiles);
    return res.json(allProfiles);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Get profile by user ID
router.get('/:userId', async (req, res) => {
  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.params.userId)).limit(1);
    if (!profile) return res.status(404).json({ error: 'Профиль табылмады' });
    return res.json(profile);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Update own profile
router.patch('/me', async (req, res) => {
  try {
    const { name, avatarUrl, departmentId, groupId } = req.body;
    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (groupId !== undefined) updateData.groupId = groupId;

    const [updated] = await db.update(profiles).set(updateData)
      .where(eq(profiles.userId, req.user!.userId)).returning();
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Admin: update user role
router.patch('/:userId/role', requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const [existing] = await db.select().from(userRoles).where(eq(userRoles.userId, req.params.userId)).limit(1);

    if (existing) {
      const [updated] = await db.update(userRoles).set({ role })
        .where(eq(userRoles.userId, req.params.userId)).returning();
      return res.json(updated);
    } else {
      const [created] = await db.insert(userRoles).values({ userId: req.params.userId, role }).returning();
      return res.json(created);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

export default router;

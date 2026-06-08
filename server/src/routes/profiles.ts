import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { profiles, userRoles, users } from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Get all profiles for chat/user pickers.
router.get('/', async (req, res) => {
  try {
    const [allUsers, allProfiles] = await Promise.all([
      db.select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      }).from(users),
      db.select().from(profiles),
    ]);

    const profileByUserId = new Map(allProfiles.map((profile) => [profile.userId, profile]));
    const mergedProfiles = allUsers.map((user) => {
      const profile = profileByUserId.get(user.id);
      if (profile) return profile;

      return {
        id: user.id,
        userId: user.id,
        email: user.email,
        name: user.email.split('@')[0] || user.email,
        avatarUrl: null,
        departmentId: null,
        groupId: null,
        createdAt: user.createdAt,
        updatedAt: user.createdAt,
      };
    });

    return res.json(mergedProfiles);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Admin: create user without switching current session
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const name = String(req.body.name || '').trim();
    const password = String(req.body.password || '');
    const role = String(req.body.role || 'employee');
    const departmentId = req.body.departmentId || null;
    const groupId = req.body.groupId || null;

    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Укажите корректный email' });
    if (!name) return res.status(400).json({ error: 'Укажите имя пользователя' });
    if (password.length < 6) return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
    if (!['employee', 'agent', 'manager', 'admin'].includes(role)) return res.status(400).json({ error: 'Некорректная роль' });

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({ email, passwordHash }).returning();
    const [profile] = await db.insert(profiles).values({
      userId: user.id,
      email,
      name,
      departmentId,
      groupId,
    }).returning();
    await db.insert(userRoles).values({ userId: user.id, role: role as any });

    return res.status(201).json({ ...profile, role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Get profile by user ID
router.get('/:userId', async (req, res) => {
  try {
    const userId = String(req.params.userId);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
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

// Admin: update any user profile
router.patch('/:userId', requireRole('admin'), async (req, res) => {
  try {
    const userId = String(req.params.userId);
    const { name, avatarUrl, departmentId, groupId } = req.body;
    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (groupId !== undefined) updateData.groupId = groupId;

    const [updated] = await db.update(profiles).set(updateData)
      .where(eq(profiles.userId, userId)).returning();
    if (!updated) return res.status(404).json({ error: 'Профиль табылмады' });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// Admin: delete user account
router.delete('/:userId', requireRole('admin'), async (req, res) => {
  try {
    const userId = String(req.params.userId);
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: 'Нельзя удалить свой текущий аккаунт' });
    }

    const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) return res.status(404).json({ error: 'Пользователь не найден' });

    await db.delete(users).where(eq(users.id, userId));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(409).json({
      error: 'Не удалось удалить пользователя. Возможно, у него есть связанные заявки или документы.',
    });
  }
});

// Admin: update user role
router.patch('/:userId/role', requireRole('admin'), async (req, res) => {
  try {
    const userId = String(req.params.userId);
    const role = String(req.body.role || '');

    if (!['employee', 'agent', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Некорректная роль' });
    }

    const [existing] = await db.select().from(userRoles).where(eq(userRoles.userId, userId)).limit(1);

    if (existing) {
      const [updated] = await db.update(userRoles).set({ role: role as any })
        .where(eq(userRoles.userId, userId)).returning();
      return res.json(updated);
    } else {
      const [created] = await db.insert(userRoles).values({ userId, role: role as any }).returning();
      return res.json(created);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

export default router;

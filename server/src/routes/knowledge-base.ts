import { Router } from 'express';
import { eq, desc, ilike, and, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { kbCategories, kbArticles, ticketKbLinks, profiles } from '../db/schema.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// ==================== KB Categories ====================

router.get('/categories', async (_req, res) => {
  const rows = await db.select().from(kbCategories).orderBy(kbCategories.sortOrder);
  res.json(rows);
});

router.post('/categories', requireRole('admin'), async (req, res) => {
  const [row] = await db.insert(kbCategories).values(req.body).returning();
  res.status(201).json(row);
});

router.patch('/categories/:id', requireRole('admin'), async (req, res) => {
  const id = String(req.params.id);
  const [row] = await db.update(kbCategories).set(req.body)
    .where(eq(kbCategories.id, id)).returning();
  res.json(row);
});

router.delete('/categories/:id', requireRole('admin'), async (req, res) => {
  const id = String(req.params.id);
  await db.delete(kbCategories).where(eq(kbCategories.id, id));
  res.json({ success: true });
});

// ==================== KB Articles ====================

// List articles with search, category filter, visibility filter
router.get('/articles', async (req, res) => {
  const { search, categoryId, visibility } = req.query;
  const userRole = req.user!.role;

  let query = db.select().from(kbArticles);

  const conditions: any[] = [];

  // Non-staff only see public articles
  if (!['agent', 'admin', 'manager'].includes(userRole)) {
    conditions.push(eq(kbArticles.visibility, 'public'));
  } else if (visibility && typeof visibility === 'string') {
    conditions.push(eq(kbArticles.visibility, visibility));
  }

  if (categoryId && typeof categoryId === 'string') {
    conditions.push(eq(kbArticles.categoryId, categoryId));
  }

  if (search && typeof search === 'string') {
    const term = `%${search}%`;
    conditions.push(
      or(
        ilike(kbArticles.title, term),
        ilike(kbArticles.content, term),
        ilike(kbArticles.shortDescription, term),
      )
    );
  }

  const rows = conditions.length > 0
    ? await db.select().from(kbArticles).where(and(...conditions)).orderBy(desc(kbArticles.updatedAt))
    : await db.select().from(kbArticles).orderBy(desc(kbArticles.updatedAt));

  res.json(rows);
});

// Get single article (+ increment view count)
router.get('/articles/:id', async (req, res) => {
  const id = String(req.params.id);
  const [article] = await db.select().from(kbArticles)
    .where(eq(kbArticles.id, id));

  if (!article) return res.status(404).json({ error: 'Мақала табылмады' });

  const userRole = req.user!.role;
  if (article.visibility === 'internal' && !['agent', 'admin', 'manager'].includes(userRole)) {
    return res.status(403).json({ error: 'Рұқсат жоқ' });
  }

  // Increment view count
  await db.update(kbArticles)
    .set({ viewCount: (article.viewCount || 0) + 1 })
    .where(eq(kbArticles.id, id));

  // Get author name
  const [author] = await db.select().from(profiles)
    .where(eq(profiles.userId, article.authorId));

  res.json({ ...article, authorName: author?.name || '-' });
});

// Create article (staff only)
router.post('/articles', requireRole('agent', 'admin', 'manager'), async (req, res) => {
  const [row] = await db.insert(kbArticles).values({
    ...req.body,
    authorId: req.user!.userId,
  }).returning();
  res.status(201).json(row);
});

// Update article (staff only)
router.patch('/articles/:id', requireRole('agent', 'admin', 'manager'), async (req, res) => {
  const id = String(req.params.id);
  const [row] = await db.update(kbArticles).set({
    ...req.body,
    updatedAt: new Date(),
  }).where(eq(kbArticles.id, id)).returning();
  res.json(row);
});

// Delete article (staff only)
router.delete('/articles/:id', requireRole('agent', 'admin', 'manager'), async (req, res) => {
  const id = String(req.params.id);
  // Delete linked ticket references first
  await db.delete(ticketKbLinks).where(eq(ticketKbLinks.articleId, id));
  await db.delete(kbArticles).where(eq(kbArticles.id, id));
  res.json({ success: true });
});

// ==================== Ticket-KB Links ====================

// Get links for a ticket
router.get('/tickets/:ticketId/links', async (req, res) => {
  const ticketId = String(req.params.ticketId);
  const links = await db.select().from(ticketKbLinks)
    .where(eq(ticketKbLinks.ticketId, ticketId));

  // Enrich with article titles
  if (links.length === 0) return res.json([]);

  const articleIds = links.map(l => l.articleId);
  const articles = await db.select().from(kbArticles);
  const articleMap = new Map(articles.map(a => [a.id, a]));

  const enriched = links.map(l => ({
    ...l,
    article: articleMap.get(l.articleId) || null,
  }));

  res.json(enriched);
});

// Link article to ticket (staff only)
router.post('/tickets/:ticketId/links', requireRole('agent', 'admin', 'manager'), async (req, res) => {
  const ticketId = String(req.params.ticketId);
  const [row] = await db.insert(ticketKbLinks).values({
    ticketId,
    articleId: req.body.articleId,
    linkedBy: req.user!.userId,
  }).returning();
  res.status(201).json(row);
});

// Unlink article from ticket (staff only)
router.delete('/ticket-kb-links/:id', requireRole('agent', 'admin', 'manager'), async (req, res) => {
  const id = String(req.params.id);
  await db.delete(ticketKbLinks).where(eq(ticketKbLinks.id, id));
  res.json({ success: true });
});

export default router;

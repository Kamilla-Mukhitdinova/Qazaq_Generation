import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { assets, profiles, userRoles } from '../db/schema.js';
import { eq, and, or, ilike, sql, desc, asc, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Helper: check if user is admin or manager
async function isAdminOrManager(userId: string): Promise<boolean> {
  const roles = await db.select().from(userRoles)
    .where(and(eq(userRoles.userId, userId), or(eq(userRoles.role, 'admin'), eq(userRoles.role, 'manager'))));
  return roles.length > 0;
}

// GET / - list assets with filters, search, pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const typeFilter = req.query.asset_type as string | undefined;
    const statusFilter = req.query.status as string | undefined;
    const departmentFilter = req.query.department_id as string | undefined;

    let conditions: any[] = [];

    if (search) {
      conditions.push(or(
        ilike(assets.name, `%${search}%`),
        ilike(assets.serialNumber, `%${search}%`),
        ilike(assets.inventoryNumber, `%${search}%`),
        ilike(assets.manufacturer, `%${search}%`),
        ilike(assets.model, `%${search}%`),
      ));
    }
    if (typeFilter) conditions.push(eq(assets.assetType, typeFilter as any));
    if (statusFilter) conditions.push(eq(assets.status, statusFilter as any));
    if (departmentFilter) conditions.push(eq(assets.departmentId, departmentFilter));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      db.select().from(assets)
        .where(where)
        .orderBy(desc(assets.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(assets).where(where),
    ]);

    // Enrich with assignee name
    const assigneeIds = items.filter(a => a.assignedTo).map(a => a.assignedTo!);
    let assigneeMap: Record<string, string> = {};
    if (assigneeIds.length > 0) {
      const assigneeProfiles = await db.select({ userId: profiles.userId, name: profiles.name })
        .from(profiles).where(inArray(profiles.userId, assigneeIds));
      assigneeProfiles.forEach(p => { assigneeMap[p.userId] = p.name; });
    }

    const enriched = items.map(item => ({
      ...item,
      assigned_to_name: item.assignedTo ? assigneeMap[item.assignedTo] || null : null,
    }));

    res.json({
      data: enriched,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error('GET /assets error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /:id - single asset
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [asset] = await db.select().from(assets).where(eq(assets.id, req.params.id));
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    let assigneeName = null;
    if (asset.assignedTo) {
      const [p] = await db.select({ name: profiles.name }).from(profiles)
        .where(eq(profiles.userId, asset.assignedTo));
      assigneeName = p?.name || null;
    }

    res.json({ ...asset, assigned_to_name: assigneeName });
  } catch (err: any) {
    console.error('GET /assets/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST / - create asset (admin/manager only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!(await isAdminOrManager(userId))) {
      return res.status(403).json({ error: 'Only admin/manager can create assets' });
    }

    const {
      name, asset_type, status, serial_number, inventory_number,
      manufacturer, model, location, assigned_to, department_id,
      purchase_date, warranty_expiry, purchase_cost, notes
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const [asset] = await db.insert(assets).values({
      name,
      assetType: asset_type || 'hardware',
      status: status || 'in_stock',
      serialNumber: serial_number || null,
      inventoryNumber: inventory_number || null,
      manufacturer: manufacturer || null,
      model: model || null,
      location: location || null,
      assignedTo: assigned_to || null,
      departmentId: department_id || null,
      purchaseDate: purchase_date || null,
      warrantyExpiry: warranty_expiry || null,
      purchaseCost: purchase_cost ? String(purchase_cost) : null,
      notes: notes || null,
    }).returning();

    res.status(201).json(asset);
  } catch (err: any) {
    console.error('POST /assets error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id - update asset (admin/manager only)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!(await isAdminOrManager(userId))) {
      return res.status(403).json({ error: 'Only admin/manager can update assets' });
    }

    const [existing] = await db.select().from(assets).where(eq(assets.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'Asset not found' });

    const updates: any = { updatedAt: new Date() };
    const fieldMap: Record<string, string> = {
      name: 'name', asset_type: 'assetType', status: 'status',
      serial_number: 'serialNumber', inventory_number: 'inventoryNumber',
      manufacturer: 'manufacturer', model: 'model', location: 'location',
      assigned_to: 'assignedTo', department_id: 'departmentId',
      purchase_date: 'purchaseDate', warranty_expiry: 'warrantyExpiry',
      purchase_cost: 'purchaseCost', notes: 'notes',
    };

    for (const [apiKey, dbKey] of Object.entries(fieldMap)) {
      if (req.body[apiKey] !== undefined) {
        updates[dbKey] = req.body[apiKey] === '' ? null : req.body[apiKey];
      }
    }
    if (updates.purchaseCost !== undefined && updates.purchaseCost !== null) {
      updates.purchaseCost = String(updates.purchaseCost);
    }

    const [updated] = await db.update(assets).set(updates)
      .where(eq(assets.id, req.params.id)).returning();

    res.json(updated);
  } catch (err: any) {
    console.error('PATCH /assets/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /:id - delete asset (admin/manager only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!(await isAdminOrManager(userId))) {
      return res.status(403).json({ error: 'Only admin/manager can delete assets' });
    }

    const [existing] = await db.select().from(assets).where(eq(assets.id, req.params.id));
    if (!existing) return res.status(404).json({ error: 'Asset not found' });

    await db.delete(assets).where(eq(assets.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /assets/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

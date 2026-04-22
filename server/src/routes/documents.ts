import { Router } from 'express';
import { eq, desc, or } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { sharedDocuments, profiles, notifications } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Ensure uploads directory exists
const uploadsDir = path.resolve('uploads/documents');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Upload & send document to a recipient
router.post('/send', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Файл қажет' });

    const { recipientId, message, fileType } = req.body;
    if (!recipientId) return res.status(400).json({ error: 'recipientId қажет' });

    const [doc] = await db.insert(sharedDocuments).values({
      senderId: req.user!.userId,
      recipientId,
      fileName: file.originalname,
      filePath: file.filename,
      fileType: fileType || 'docx',
      fileSize: file.size,
      message: message || null,
    }).returning();

    // Create notification for recipient
    await db.insert(notifications).values({
      toUserId: recipientId,
      type: 'document_received',
      title: 'Жаңа құжат алдыңыз',
      message: `"${file.originalname}" құжаты жіберілді`,
      payloadJson: { documentId: doc.id },
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('Document send error:', err);
    res.status(500).json({ error: 'Қате' });
  }
});

// Get received documents
router.get('/received', async (req, res) => {
  const docs = await db.select().from(sharedDocuments)
    .where(eq(sharedDocuments.recipientId, req.user!.userId))
    .orderBy(desc(sharedDocuments.createdAt));

  const enriched = await enrichDocs(docs, 'sender');
  res.json(enriched);
});

// Get sent documents
router.get('/sent', async (req, res) => {
  const docs = await db.select().from(sharedDocuments)
    .where(eq(sharedDocuments.senderId, req.user!.userId))
    .orderBy(desc(sharedDocuments.createdAt));

  const enriched = await enrichDocs(docs, 'recipient');
  res.json(enriched);
});

// Mark as read
router.patch('/:id/read', async (req, res) => {
  const [doc] = await db.update(sharedDocuments)
    .set({ isRead: true })
    .where(eq(sharedDocuments.id, req.params.id))
    .returning();
  res.json(doc);
});

// Download document file
router.get('/:id/download', async (req, res) => {
  const [doc] = await db.select().from(sharedDocuments)
    .where(eq(sharedDocuments.id, req.params.id));

  if (!doc) return res.status(404).json({ error: 'Құжат табылмады' });

  // Only sender or recipient can download
  if (doc.senderId !== req.user!.userId && doc.recipientId !== req.user!.userId) {
    return res.status(403).json({ error: 'Рұқсат жоқ' });
  }

  const filePath = path.join(uploadsDir, doc.filePath);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Файл табылмады' });
  }

  res.download(filePath, doc.fileName);
});

// Delete document
router.delete('/:id', async (req, res) => {
  const [doc] = await db.select().from(sharedDocuments)
    .where(eq(sharedDocuments.id, req.params.id));

  if (!doc) return res.status(404).json({ error: 'Құжат табылмады' });

  if (doc.senderId !== req.user!.userId && doc.recipientId !== req.user!.userId) {
    return res.status(403).json({ error: 'Рұқсат жоқ' });
  }

  // Delete file from disk
  const filePath = path.join(uploadsDir, doc.filePath);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await db.delete(sharedDocuments).where(eq(sharedDocuments.id, req.params.id));
  res.json({ success: true });
});

// Helper: enrich docs with profile names
async function enrichDocs(docs: any[], otherField: 'sender' | 'recipient') {
  if (docs.length === 0) return [];

  const userIds = new Set<string>();
  docs.forEach(d => {
    if (otherField === 'sender') userIds.add(d.senderId);
    else userIds.add(d.recipientId);
  });

  const allProfiles = await db.select().from(profiles);
  const profileMap = new Map(allProfiles.map(p => [p.userId, p]));

  return docs.map(d => {
    const otherId = otherField === 'sender' ? d.senderId : d.recipientId;
    const prof = profileMap.get(otherId);
    return {
      ...d,
      [`${otherField}_name`]: prof?.name || '-',
      [`${otherField}_email`]: prof?.email || '',
    };
  });
}

export default router;

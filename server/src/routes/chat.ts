import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, pool } from '../db/index.js';
import { chatRooms, chatRoomMembers, chatMessages } from '../db/schema.js';
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const chatUploadsDir = path.resolve('uploads/chat');
fs.mkdirSync(chatUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, chatUploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const getRoomSortTime = (room: any) =>
  new Date(room.last_message?.createdAt || room.last_message?.created_at || room.createdAt || room.created_at).getTime();

const getDirectRoomKey = (room: any) =>
  room.chat_room_members
    ?.map((member: any) => member.user_id || member.userId)
    .filter(Boolean)
    .sort()
    .join(':');

const dedupeDirectRooms = (rooms: any[]) => {
  const seenDirectRooms = new Set<string>();
  return rooms.filter((room) => {
    if (room.type !== 'direct') return true;

    const key = getDirectRoomKey(room);
    if (!key) return true;
    if (seenDirectRooms.has(key)) return false;

    seenDirectRooms.add(key);
    return true;
  });
};

// ─── GET /rooms - list rooms the user belongs to ───
router.get('/rooms', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get room IDs user is a member of
    const memberRows = await db.select({ roomId: chatRoomMembers.roomId })
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.userId, userId));

    if (memberRows.length === 0) return res.json([]);

    const roomIds = memberRows.map(r => r.roomId);

    // Get rooms
    const rooms = await db.select().from(chatRooms)
      .where(inArray(chatRooms.id, roomIds))
      .orderBy(desc(chatRooms.createdAt));

    // Get all members for these rooms
    const allMembers = await db.select({
      roomId: chatRoomMembers.roomId,
      userId: chatRoomMembers.userId,
    }).from(chatRoomMembers)
      .where(inArray(chatRoomMembers.roomId, roomIds));

    const roomMessages = await db.select().from(chatMessages)
      .where(inArray(chatMessages.roomId, roomIds))
      .orderBy(desc(chatMessages.createdAt));

    const lastMessageByRoom = new Map<string, typeof roomMessages[number]>();
    for (const message of roomMessages) {
      if (!lastMessageByRoom.has(message.roomId)) {
        lastMessageByRoom.set(message.roomId, message);
      }
    }

    // Attach members to rooms
    const result = rooms.map(room => ({
      ...room,
      last_message: lastMessageByRoom.get(room.id) || null,
      chat_room_members: allMembers
        .filter(m => m.roomId === room.id)
        .map(m => ({ user_id: m.userId })),
    })).sort((a, b) => {
      return getRoomSortTime(b) - getRoomSortTime(a);
    });

    res.json(dedupeDirectRooms(result));
  } catch (err: any) {
    console.error('GET /rooms error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /rooms - create a new room ───
router.post('/rooms', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, type, memberIds } = req.body;
    const uniqueMembers = [...new Set([userId, ...(memberIds || [])])];
    const roomType = type || 'direct';

    if (roomType === 'direct' && uniqueMembers.length === 2) {
      const existingRoomResult = await pool.query(
        `
          select cr.*
          from chat_rooms cr
          join chat_room_members m1 on m1.room_id = cr.id and m1.user_id = $1
          join chat_room_members m2 on m2.room_id = cr.id and m2.user_id = $2
          where cr.type = 'direct'
            and (
              select count(*)
              from chat_room_members cm
              where cm.room_id = cr.id
            ) = 2
          order by cr.created_at desc
          limit 1
        `,
        [uniqueMembers[0], uniqueMembers[1]],
      );

      const existingRoom = existingRoomResult.rows[0];
      if (existingRoom) {
        return res.json({
          id: existingRoom.id,
          name: existingRoom.name,
          type: existingRoom.type,
          createdBy: existingRoom.created_by,
          createdAt: existingRoom.created_at,
          chat_room_members: uniqueMembers.map(uid => ({ user_id: uid })),
        });
      }
    }

    const [room] = await db.insert(chatRooms).values({
      name: name || null,
      type: roomType,
      createdBy: userId,
    }).returning();

    // Add members (always include creator)
    await db.insert(chatRoomMembers).values(
      uniqueMembers.map(uid => ({ roomId: room.id, userId: uid }))
    );

    // Return room with members
    const result = {
      ...room,
      chat_room_members: uniqueMembers.map(uid => ({ user_id: uid })),
    };

    res.status(201).json(result);
  } catch (err: any) {
    console.error('POST /rooms error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /rooms/:roomId/messages - get messages for a room ───
router.get('/rooms/:roomId/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const roomId = String(req.params.roomId);

    // Verify user is a member
    const [membership] = await db.select().from(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)));

    if (!membership) return res.status(403).json({ error: 'Not a member of this room' });

    const msgs = await db.select().from(chatMessages)
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(asc(chatMessages.createdAt));

    res.json(msgs);
  } catch (err: any) {
    console.error('GET /messages error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /rooms/:roomId/messages - send a message ───
router.post('/rooms/:roomId/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const roomId = String(req.params.roomId);
    const { body: msgBody } = req.body;

    if (!msgBody?.trim()) return res.status(400).json({ error: 'Message body required' });

    // Verify membership
    const [membership] = await db.select().from(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)));

    if (!membership) return res.status(403).json({ error: 'Not a member of this room' });

    const [msg] = await db.insert(chatMessages).values({
      roomId,
      senderId: userId,
      body: msgBody.trim(),
    }).returning();

    res.status(201).json(msg);
  } catch (err: any) {
    console.error('POST /message error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /rooms/:roomId/messages/upload - send file or voice message ───
router.post('/rooms/:roomId/messages/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const roomId = String(req.params.roomId);
    const file = req.file;
    const { body, messageType, durationMs } = req.body;

    if (!file) return res.status(400).json({ error: 'File required' });

    const [membership] = await db.select().from(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)));

    if (!membership) return res.status(403).json({ error: 'Not a member of this room' });

    const type = messageType === 'audio' ? 'audio' : 'file';
    const [msg] = await db.insert(chatMessages).values({
      roomId,
      senderId: userId,
      messageType: type,
      body: body?.trim() || file.originalname,
      fileName: file.originalname,
      filePath: file.filename,
      fileMimeType: file.mimetype,
      fileSize: file.size,
      durationMs: durationMs ? Number(durationMs) : null,
    }).returning();

    res.status(201).json(msg);
  } catch (err: any) {
    console.error('POST /message upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /messages/:messageId/file - download chat attachment ───
router.get('/messages/:messageId/file', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const messageId = String(req.params.messageId);

    const [msg] = await db.select().from(chatMessages).where(eq(chatMessages.id, messageId));
    if (!msg || !msg.filePath) return res.status(404).json({ error: 'File not found' });

    const [membership] = await db.select().from(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, msg.roomId), eq(chatRoomMembers.userId, userId)));

    if (!membership) return res.status(403).json({ error: 'Not a member of this room' });

    const filePath = path.join(chatUploadsDir, msg.filePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    res.setHeader('Content-Type', msg.fileMimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${msg.messageType === 'audio' ? 'inline' : 'attachment'}; filename="${encodeURIComponent(msg.fileName || 'file')}"`);
    return res.sendFile(filePath);
  } catch (err: any) {
    console.error('GET /message file error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /rooms/:roomId - delete a room (creator only) ───
router.delete('/rooms/:roomId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const roomId = String(req.params.roomId);

    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId));
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.createdBy !== userId) return res.status(403).json({ error: 'Only creator can delete' });

    await db.delete(chatRooms).where(eq(chatRooms.id, roomId));
    res.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /room error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

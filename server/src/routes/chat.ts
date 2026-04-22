import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { chatRooms, chatRoomMembers, chatMessages, profiles } from '../db/schema.js';
import { eq, and, desc, asc, inArray, sql, ilike } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// ─── GET /rooms - list rooms the user belongs to ───
router.get('/rooms', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

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

    // Attach members to rooms
    const result = rooms.map(room => ({
      ...room,
      chat_room_members: allMembers
        .filter(m => m.roomId === room.id)
        .map(m => ({ user_id: m.userId })),
    }));

    res.json(result);
  } catch (err: any) {
    console.error('GET /rooms error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /rooms - create a new room ───
router.post('/rooms', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, type, memberIds } = req.body;

    const [room] = await db.insert(chatRooms).values({
      name: name || null,
      type: type || 'direct',
      createdBy: userId,
    }).returning();

    // Add members (always include creator)
    const uniqueMembers = [...new Set([userId, ...(memberIds || [])])];
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
    const userId = (req as any).userId;
    const { roomId } = req.params;

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
    const userId = (req as any).userId;
    const { roomId } = req.params;
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

// ─── DELETE /rooms/:roomId - delete a room (creator only) ───
router.delete('/rooms/:roomId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { roomId } = req.params;

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

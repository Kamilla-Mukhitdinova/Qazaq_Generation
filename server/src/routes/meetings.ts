import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { authMiddleware } from '../middleware/auth.js';

type MeetingStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  status: MeetingStatus;
  inviteLink: string;
  createdBy: string;
  participants: string[];
  reminderMinutes: number | null;
  startedAt: string | null;
  endedAt: string | null;
}

const router = Router();
router.use(authMiddleware);

const meetingStore = new Map<string, Meeting>();

function getFrontendOrigin(req: Request) {
  return process.env.FRONTEND_URL?.split(',')[0]?.trim() || `${req.protocol}://${req.get('host')}`;
}

function buildInviteLink(req: Request, id: string) {
  return `${getFrontendOrigin(req)}/meet/${id}`;
}

function seedMeetings(req: Request, userId: string) {
  if (meetingStore.size > 0) return;

  const now = new Date();
  const today10 = new Date(now);
  today10.setHours(10, 0, 0, 0);
  const today15 = new Date(now);
  today15.setHours(15, 30, 0, 0);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(16, 0, 0, 0);

  const seeds: Omit<Meeting, 'inviteLink'>[] = [
    {
      id: 'daily-it-status',
      title: 'Ежедневный статус IT',
      description: 'Короткая синхронизация по заявкам, SLA и блокерам.',
      scheduledAt: today10.toISOString(),
      durationMinutes: 30,
      status: 'scheduled',
      createdBy: userId,
      participants: ['Аружан Сейдахмет', 'Данияр Омаров', 'Айгерим Нурлан'],
      reminderMinutes: 10,
      startedAt: null,
      endedAt: null,
    },
    {
      id: 'incident-review',
      title: 'Разбор инцидентов',
      description: 'Проверка причин крупных инцидентов и договоренности по действиям.',
      scheduledAt: today15.toISOString(),
      durationMinutes: 45,
      status: 'live',
      createdBy: userId,
      participants: ['Служба поддержки', 'Инфраструктура', 'Безопасность'],
      reminderMinutes: 15,
      startedAt: new Date(now.getTime() - 12 * 60 * 1000).toISOString(),
      endedAt: null,
    },
    {
      id: 'change-board',
      title: 'Change Advisory Board',
      description: 'Обсуждение изменений на неделю.',
      scheduledAt: yesterday.toISOString(),
      durationMinutes: 60,
      status: 'ended',
      createdBy: userId,
      participants: ['Менеджеры', 'Агенты', 'Администраторы'],
      reminderMinutes: 30,
      startedAt: yesterday.toISOString(),
      endedAt: new Date(yesterday.getTime() + 54 * 60 * 1000).toISOString(),
    },
  ];

  for (const meeting of seeds) {
    meetingStore.set(meeting.id, { ...meeting, inviteLink: buildInviteLink(req, meeting.id) });
  }
}

function getMeetingOr404(id: string, res: Response) {
  const meeting = meetingStore.get(id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return null;
  }
  return meeting;
}

router.get('/', (req: Request, res: Response) => {
  seedMeetings(req, req.user!.userId);
  const meetings = Array.from(meetingStore.values()).sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  res.json(meetings);
});

router.get('/:id', (req: Request, res: Response) => {
  seedMeetings(req, req.user!.userId);
  const meeting = getMeetingOr404(String(req.params.id), res);
  if (!meeting) return;
  res.json(meeting);
});

router.post('/', (req: Request, res: Response) => {
  const {
    title,
    description = '',
    scheduledAt,
    durationMinutes,
    participants = [],
    reminderMinutes = null,
    generateLink = true,
  } = req.body;

  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
    return res.status(400).json({ error: 'Valid scheduledAt is required' });
  }

  const id = randomUUID();
  const meeting: Meeting = {
    id,
    title: title.trim(),
    description: String(description || '').trim(),
    scheduledAt: new Date(scheduledAt).toISOString(),
    durationMinutes: Math.max(1, Number(durationMinutes) || 30),
    status: 'scheduled',
    inviteLink: generateLink ? buildInviteLink(req, id) : '',
    createdBy: req.user!.userId,
    participants: Array.isArray(participants)
      ? participants.map((participant) => String(participant).trim()).filter(Boolean)
      : [],
    reminderMinutes: reminderMinutes === null || reminderMinutes === '' ? null : Math.max(0, Number(reminderMinutes) || 0),
    startedAt: null,
    endedAt: null,
  };

  meetingStore.set(id, meeting);
  res.status(201).json(meeting);
});

router.patch('/:id/start', (req: Request, res: Response) => {
  const meeting = getMeetingOr404(String(req.params.id), res);
  if (!meeting) return;
  if (meeting.status === 'ended') return res.status(409).json({ error: 'Meeting is already ended' });
  if (meeting.status === 'cancelled') return res.status(409).json({ error: 'Meeting is cancelled' });

  meeting.status = 'live';
  meeting.startedAt = meeting.startedAt || new Date().toISOString();
  meeting.endedAt = null;
  res.json(meeting);
});

router.patch('/:id/end', (req: Request, res: Response) => {
  const meeting = getMeetingOr404(String(req.params.id), res);
  if (!meeting) return;
  if (meeting.status === 'cancelled') return res.status(409).json({ error: 'Meeting is cancelled' });

  meeting.status = 'ended';
  meeting.endedAt = new Date().toISOString();
  res.json(meeting);
});

router.patch('/:id/cancel', (req: Request, res: Response) => {
  const meeting = getMeetingOr404(String(req.params.id), res);
  if (!meeting) return;
  if (meeting.status === 'ended') return res.status(409).json({ error: 'Meeting is already ended' });

  meeting.status = 'cancelled';
  meeting.endedAt = null;
  res.json(meeting);
});

router.delete('/:id', (req: Request, res: Response) => {
  const meeting = getMeetingOr404(String(req.params.id), res);
  if (!meeting) return;

  meetingStore.delete(meeting.id);
  res.status(204).send();
});

export default router;

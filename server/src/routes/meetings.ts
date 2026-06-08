import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { db } from '../db/index.js';
import { profiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { notifyUsers } from '../services/notificationService.js';

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
  recording: MeetingRecording | null;
}

interface MeetingRecording {
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

const router = Router();
router.use(authMiddleware);

const meetingStore = new Map<string, Meeting>();
const meetingUploadsDir = path.resolve('uploads/meetings');
fs.mkdirSync(meetingUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, meetingUploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

function getFrontendOrigin(req: Request) {
  return (
    process.env.FRONTEND_URL?.split(',')[0]?.trim() ||
    (process.env.NODE_ENV === 'production' ? 'https://qazaq-generation.vercel.app' : `${req.protocol}://${req.get('host')}`)
  );
}

function buildInviteLink(req: Request, id: string) {
  return `${getFrontendOrigin(req)}/meet/${id}`;
}

function normalizeParticipant(value: string) {
  return value.trim().toLowerCase();
}

function formatMeetingTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Almaty',
  }).format(new Date(value));
}

async function notifyMeetingParticipants(meeting: Meeting) {
  const participantKeys = [...new Set(meeting.participants.map(normalizeParticipant).filter(Boolean))];
  if (participantKeys.length === 0) return;

  try {
    const rows = (await db.select().from(profiles)).filter((profile) => {
      const name = normalizeParticipant(profile.name);
      const email = normalizeParticipant(profile.email);
      return participantKeys.includes(name) || participantKeys.includes(email);
    });
    const targetIds = rows
      .map((profile) => profile.userId)
      .filter((userId): userId is string => Boolean(userId && userId !== meeting.createdBy));

    if (targetIds.length === 0) return;

    const meetingTime = formatMeetingTime(meeting.scheduledAt);
    const message = `Вы добавлены в конференцию «${meeting.title}» на ${meetingTime}. Ссылка для подключения: ${meeting.inviteLink}`;

    await notifyUsers(targetIds, {
      type: 'meeting_invite',
      title: 'Вы добавлены в конференцию',
      message,
      payload: {
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        scheduledAt: meeting.scheduledAt,
        meetingLink: meeting.inviteLink,
      },
    });
  } catch (err) {
    console.error('Meeting participant notification error:', err);
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
  const meetings = Array.from(meetingStore.values()).sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  res.json(meetings);
});

router.get('/:id', (req: Request, res: Response) => {
  const meeting = getMeetingOr404(String(req.params.id), res);
  if (!meeting) return;
  res.json(meeting);
});

router.post('/', async (req: Request, res: Response) => {
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
    recording: null,
  };

  meetingStore.set(id, meeting);
  await notifyMeetingParticipants(meeting);
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

router.post('/:id/recording', upload.single('file'), (req: Request, res: Response) => {
  const meeting = getMeetingOr404(String(req.params.id), res);
  if (!meeting) return;
  if (!req.file) return res.status(400).json({ error: 'Recording file is required' });

  if (meeting.createdBy !== req.user!.userId) {
    fs.unlink(req.file.path, () => {});
    return res.status(403).json({ error: 'Only meeting organizer can save recording' });
  }

  if (meeting.recording?.filePath) {
    fs.unlink(path.join(meetingUploadsDir, meeting.recording.filePath), () => {});
  }

  meeting.recording = {
    fileName: req.file.originalname || 'meeting-recording.webm',
    filePath: req.file.filename,
    mimeType: req.file.mimetype || 'video/webm',
    size: req.file.size,
    createdAt: new Date().toISOString(),
  };

  res.status(201).json(meeting.recording);
});

router.get('/:id/recording', (req: Request, res: Response) => {
  const meeting = getMeetingOr404(String(req.params.id), res);
  if (!meeting) return;
  if (!meeting.recording?.filePath) return res.status(404).json({ error: 'Recording not found' });

  const filePath = path.join(meetingUploadsDir, meeting.recording.filePath);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Recording file not found' });

  res.setHeader('Content-Type', meeting.recording.mimeType || 'video/webm');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(meeting.recording.fileName)}"`);
  return res.sendFile(filePath);
});

router.delete('/:id', (req: Request, res: Response) => {
  const meeting = getMeetingOr404(String(req.params.id), res);
  if (!meeting) return;

  if (meeting.recording?.filePath) {
    fs.unlink(path.join(meetingUploadsDir, meeting.recording.filePath), () => {});
  }
  meetingStore.delete(meeting.id);
  res.status(204).send();
});

export default router;

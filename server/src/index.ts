import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';

import authRoutes from './routes/auth.js';
import ticketRoutes from './routes/tickets.js';
import profileRoutes from './routes/profiles.js';
import crudRoutes from './routes/crud.js';
import aiChatRoutes from './routes/ai-chat.js';
import pushRoutes from './routes/push.js';
import documentRoutes from './routes/documents.js';
import kbRoutes from './routes/knowledge-base.js';
import chatRoutes from './routes/chat.js';
import assetRoutes from './routes/assets.js';
import meetingRoutes from './routes/meetings.js';
import { ensureChatSchema } from './db/ensureChatSchema.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

function buildAllowedOrigins() {
  const configured = (process.env.FRONTEND_URL || 'http://localhost:8080')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Common local dev origins (localhost + LAN dev)
  const defaults = ['http://localhost:8080', 'http://localhost:8081', 'http://127.0.0.1:8080', 'http://127.0.0.1:8081'];
  return Array.from(new Set([...configured, ...defaults]));
}

const allowedOrigins = buildAllowedOrigins();
const localDevOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d{4,5}$/;
const vercelOriginPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (curl/Postman) and same-origin requests
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (localDevOriginPattern.test(origin)) return callback(null, true);
    if (vercelOriginPattern.test(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api', crudRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/notifications', pushRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/meetings', meetingRoutes);
// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

await ensureChatSchema();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;

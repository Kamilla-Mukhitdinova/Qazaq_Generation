import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, profiles, userRoles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(6).max(128),
});

type Pending2FAPayload = {
  userId: string;
  pending2FA?: boolean;
};

const resetTokens = new Map<string, { userId: string; expiresAt: number }>();
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const LOGIN_TOTP_WINDOW = 2;
const SETUP_TOTP_WINDOW = 10;

function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function signToken(userId: string, email: string, role: string) {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  return jwt.sign({ userId, email, role }, process.env.JWT_SECRET!, {
    expiresIn,
  });
}

// --- Register ---
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Бұл email тіркелген' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({ email, passwordHash }).returning();

    await db.insert(profiles).values({
      userId: user.id,
      email,
      name,
    });

    await db.insert(userRoles).values({
      userId: user.id,
      role: 'employee',
    });

    const token = signToken(user.id, email, 'employee');
    return res.status(201).json({ token, user: { id: user.id, email, name, role: 'employee' } });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// --- Login ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return res.status(401).json({ error: 'Email немесе құпия сөз қате' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Email немесе құпия сөз қате' });
    }

    // Check if 2FA is enabled
    if (user.totpEnabled && user.totpSecret) {
      return res.json({
        requires2FA: true,
        tempToken: jwt.sign({ userId: user.id, pending2FA: true }, process.env.JWT_SECRET!, { expiresIn: '5m' }),
      });
    }

    const [roleRow] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id)).limit(1);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
    const role = roleRow?.role ?? 'employee';

    const token = signToken(user.id, email, role);
    return res.json({ token, user: { id: user.id, email, name: profile?.name, role } });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// --- Forgot Password ---
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = hashResetToken(token);

      resetTokens.set(tokenHash, {
        userId: user.id,
        expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
      });

      console.info(`[password-reset] ${email}: ${token}`);
    }

    return res.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// --- Reset Password ---
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const tokenHash = hashResetToken(token);
    const resetToken = resetTokens.get(tokenHash);

    if (!resetToken || resetToken.expiresAt < Date.now()) {
      resetTokens.delete(tokenHash);
      return res.status(400).json({ error: 'Код восстановления недействителен или истек' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(users).set({ passwordHash }).where(eq(users.id, resetToken.userId));
    resetTokens.delete(tokenHash);

    return res.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// --- Verify 2FA ---
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    const otpCode = String(code || '').replace(/\D/g, '');
    const payload = jwt.verify(tempToken, process.env.JWT_SECRET!) as Pending2FAPayload;

    if (!payload.pending2FA) {
      return res.status(400).json({ error: 'Жарамсыз токен' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user || !user.totpSecret) {
      return res.status(400).json({ error: 'TOTP орнатылмаған' });
    }

    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token: otpCode, window: LOGIN_TOTP_WINDOW });
    if (delta === null) {
      return res.status(400).json({ error: 'OTP коды қате' });
    }

    const [roleRow] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id)).limit(1);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
    const role = roleRow?.role ?? 'employee';

    const token = signToken(user.id, user.email, role);
    return res.json({ token, user: { id: user.id, email: user.email, name: profile?.name, role } });
  } catch {
    return res.status(401).json({ error: 'Тексеру кезінде қате' });
  }
});

// --- Setup 2FA ---
router.post('/setup-2fa', authMiddleware, async (req, res) => {
  try {
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: 'Qazaq Generation',
      label: req.user!.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    const uri = totp.toString();
    const qrCode = await QRCode.toDataURL(uri);

    await db.update(users).set({ totpSecret: secret.base32 }).where(eq(users.id, req.user!.userId));

    return res.json({ secret: secret.base32, qrCode, uri });
  } catch (err) {
    console.error('Setup 2FA error:', err);
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// --- Confirm 2FA ---
router.post('/confirm-2fa', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const otpCode = String(code || '').replace(/\D/g, '');
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);

    if (!user?.totpSecret) {
      return res.status(400).json({ error: 'Алдымен 2FA орнатыңыз' });
    }

    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const delta = totp.validate({ token: otpCode, window: SETUP_TOTP_WINDOW });
    if (delta === null) {
      return res.status(400).json({ error: 'OTP коды қате' });
    }

    await db.update(users).set({ totpEnabled: true }).where(eq(users.id, req.user!.userId));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// --- Disable 2FA ---
router.post('/disable-2fa', authMiddleware, async (req, res) => {
  try {
    await db.update(users)
      .set({ totpEnabled: false, totpSecret: null })
      .where(eq(users.id, req.user!.userId));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

// --- Me ---
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.user!.userId)).limit(1);
    const [roleRow] = await db.select().from(userRoles).where(eq(userRoles.userId, req.user!.userId)).limit(1);
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);

    return res.json({
      user: {
        id: req.user!.userId,
        email: req.user!.email,
        name: profile?.name,
        role: roleRow?.role ?? 'employee',
        totpEnabled: user?.totpEnabled ?? false,
      },
      profile,
    });
  } catch {
    return res.status(500).json({ error: 'Серверде қате' });
  }
});

export default router;

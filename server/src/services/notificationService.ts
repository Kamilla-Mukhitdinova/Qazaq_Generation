import nodemailer from 'nodemailer';
import webpush from 'web-push';
import { db } from '../db/index.js';
import { notifications, pushSubscriptions, profiles, notificationPreferences } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// --- Email transporter (SMTP) ---
const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const FROM_EMAIL = process.env.SMTP_FROM || 'noreply@qazaq-generation.kz';

// --- Web Push ---
const vapidConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@qazaq-generation.kz',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

// --- Types ---
export type NotificationType =
  | 'ticket_status_changed'
  | 'ticket_assigned'
  | 'ticket_comment'
  | 'sla_breach'
  | 'meeting_invite'
  | 'ppr_signer_added';

interface NotifyOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  payload?: Record<string, any>;
}

// Map notification type to preference keys
const typeToPreferenceKey: Record<NotificationType, string> = {
  ticket_status_changed: 'statusChange',
  ticket_assigned: 'assignment',
  ticket_comment: 'comment',
  sla_breach: 'slaBreach',
  meeting_invite: 'assignment',
  ppr_signer_added: 'assignment',
};

// --- Get user channel preferences ---
async function getUserChannelPrefs(userId: string, type: NotificationType): Promise<{ inApp: boolean; email: boolean; push: boolean }> {
  try {
    const [prefs] = await db.select().from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId)).limit(1);

    if (!prefs) {
      // Default: all channels enabled
      return { inApp: true, email: true, push: true };
    }

    const key = typeToPreferenceKey[type];
    return {
      inApp: (prefs as any)[`${key}InApp`] ?? true,
      email: (prefs as any)[`${key}Email`] ?? true,
      push: (prefs as any)[`${key}Push`] ?? true,
    };
  } catch (err) {
    console.error('Error fetching notification preferences:', err);
    return { inApp: true, email: true, push: true };
  }
}

// --- Main function ---
export async function notifyUser(options: NotifyOptions): Promise<void> {
  const { userId, type, title, message, payload } = options;

  const channelPrefs = await getUserChannelPrefs(userId, type);

  // 1. In-app notification
  if (channelPrefs.inApp) {
    try {
      await db.insert(notifications).values({
        toUserId: userId,
        type,
        title,
        message,
        payloadJson: payload || {},
      });
    } catch (err) {
      console.error('In-app notification error:', err);
    }
  }

  // 2. Email notification
  if (channelPrefs.email && transporter) {
    try {
      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
      if (profile?.email) {
        await transporter.sendMail({
          from: FROM_EMAIL,
          to: profile.email,
          subject: title,
          html: buildEmailHtml(title, message, payload),
        });
      }
    } catch (err) {
      console.error('Email notification error:', err);
    }
  }

  // 3. Browser push notification
  if (channelPrefs.push && vapidConfigured) {
    try {
      const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
      const pushPayload = JSON.stringify({ title, body: message, data: payload });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload,
          );
        } catch (pushErr: any) {
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          }
          console.error('Push notification error:', pushErr.message);
        }
      }
    } catch (err) {
      console.error('Push subscription query error:', err);
    }
  }
}

// --- Bulk notify ---
export async function notifyUsers(userIds: string[], options: Omit<NotifyOptions, 'userId'>): Promise<void> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  await Promise.allSettled(uniqueIds.map(userId => notifyUser({ ...options, userId })));
}

// --- Email HTML builder ---
function buildEmailHtml(title: string, message: string, payload?: Record<string, any>): string {
  const ticketLink = payload?.ticketId
    ? `<p style="margin-top:16px"><a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/tickets/${payload.ticketId}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Тикетті ашу</a></p>`
    : '';
  const meetingLink = payload?.meetingLink
    ? `<p style="margin-top:16px"><a href="${payload.meetingLink}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Подключиться к конференции</a></p>`
    : '';

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:20px">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;border:1px solid #e4e4e7">
    <h2 style="margin:0 0 12px;color:#18181b;font-size:18px">${title}</h2>
    <p style="margin:0;color:#52525b;font-size:14px;line-height:1.6">${message}</p>
    ${ticketLink}
    ${meetingLink}
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0">
    <p style="margin:0;color:#a1a1aa;font-size:12px">Qazaq Generation IT Service Desk</p>
  </div>
</body></html>`;
}

export { vapidConfigured };

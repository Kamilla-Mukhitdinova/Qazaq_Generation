import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type PushActionResult = { ok: true } | { ok: false; error: string };

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;
    setIsSupported(supported);
    if ('Notification' in window) setPermission(Notification.permission);
    if (supported) void checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator)) return;
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      } else {
        setIsSubscribed(false);
      }
    } catch (_) {}
  };

  const subscribe = async (): Promise<PushActionResult> => {
    setError(null);
    if (!isSupported) {
      const message = 'Push-уведомления не поддерживаются в этом браузере или на этом адресе.';
      setError(message);
      return { ok: false, error: message };
    }
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== 'granted') {
        const message = 'Браузер не дал разрешение на push-уведомления.';
        setError(message);
        return { ok: false, error: message };
      }

      const { publicKey } = await api.getVapidKey();
      if (!publicKey) {
        const message = 'На сервере не настроен VAPID ключ для push-уведомлений.';
        setError(message);
        return { ok: false, error: message };
      }

      const reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await api.subscribePush(existing);
        setIsSubscribed(true);
        return { ok: true };
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await api.subscribePush(sub);
      setIsSubscribed(true);
      return { ok: true };
    } catch (err) {
      console.error('Push subscription error:', err);
      const message = err instanceof Error ? err.message : 'Не удалось включить push-уведомления.';
      setError(message);
      return { ok: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async (): Promise<PushActionResult> => {
    setError(null);
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.unsubscribePush(sub.endpoint);
          await sub.unsubscribe();
        }
      }
      setIsSubscribed(false);
      return { ok: true };
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      const message = err instanceof Error ? err.message : 'Не удалось отключить push-уведомления.';
      setError(message);
      return { ok: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return { isSupported, isSubscribed, loading, error, permission, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

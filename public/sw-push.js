// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || '',
      icon: '/favicon.png',
      badge: '/favicon.png',
      data: data.data || {},
      tag: data.data?.ticketId || 'notification',
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Хабарландыру', options)
    );
  } catch (err) {
    console.error('Push event error:', err);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const ticketId = event.notification.data?.ticketId;
  const url = ticketId ? `/tickets/${ticketId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

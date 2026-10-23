// Sofia School PWA — Service Worker
const CACHE_VERSION = 'sofia-v1';
const APP_SHELL = [
  '/',
  '/index.html'
];

// التثبيت: cache الملفات الأساسية
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {});
    })
  );
});

// التفعيل: حذف الـ cache القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// الاستراتيجية: Network First مع fallback على الـ cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // تجاهل Supabase (البيانات الحيّة)
  if (req.url.includes('supabase.co') || req.url.includes('/rest/')) return;
  event.respondWith(
    fetch(req).then((res) => {
      // خزّن النسخة الجديدة
      const copy = res.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy).catch(() => {}));
      return res;
    }).catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'مؤسسة صوفيا', body: 'تنبيه جديد', icon: '/icon-192.png' };
  if (event.data) {
    try { data = Object.assign(data, event.data.json()); } catch(e){ data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/manifest.json',
      badge: data.badge || '/manifest.json',
      lang: 'ar',
      dir: 'rtl',
      tag: data.tag || 'sofia-notif',
      renotify: true,
      vibrate: [200, 100, 200],
      requireInteraction: false,
      data: data.data || {}
    })
  );
});

// النقر على الإشعار يفتح التطبيق
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((all) => {
      for (const c of all) {
        if (c.url.includes(url) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// استقبال رسائل من الصفحة (لعرض إشعار محلي)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'show-notification') {
    const n = event.data.notification || {};
    self.registration.showNotification(n.title || 'مؤسسة صوفيا', {
      body: n.body || '',
      icon: n.icon,
      lang: 'ar',
      dir: 'rtl',
      vibrate: [200, 100, 200],
      data: n.data || {}
    });
  }
});

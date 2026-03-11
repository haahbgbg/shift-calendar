const CACHE = 'shift-cal-v4';
const FILES = ['./', './index.html'];

// 後台提醒計時器（SW 比頁面更長壽）
const pendingTimers = {};

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// 接收頁面發來的提醒指令
self.addEventListener('message', e => {
  const data = e.data;
  if(!data) return;

  if(data.type === 'SCHEDULE_NOTIF'){
    // 取消舊的同 id 計時
    if(pendingTimers[data.id]) clearTimeout(pendingTimers[data.id]);
    const ms = data.remTime - Date.now();
    if(ms <= 0) return;
    pendingTimers[data.id] = setTimeout(async () => {
      try {
        await self.registration.showNotification(data.title, {
          body: data.body,
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: String(data.id),
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
      } catch(err) {
        // icon 可能不存在，降級不帶 icon
        await self.registration.showNotification(data.title, {
          body: data.body,
          tag: String(data.id),
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
      }
      delete pendingTimers[data.id];
    }, ms);
  }

  if(data.type === 'CANCEL_NOTIF'){
    if(pendingTimers[data.id]){
      clearTimeout(pendingTimers[data.id]);
      delete pendingTimers[data.id];
    }
  }
});

// 點擊通知時打開/聚焦 App
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
      for(const c of list){ if('focus' in c) return c.focus(); }
      return clients.openWindow('./');
    })
  );
});

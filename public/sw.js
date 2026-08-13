const CACHE_NAME = 'necesito-cache-v14';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/coordinar',
  '/coordinar.html',
  '/app.js',
  '/coordinar.js',
  '/styles.css',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar esquemas no soportados (ej. extensiones de Chrome)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // No interceptar peticiones a la API si hay internet (Network Only / Network First)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // En peticiones POST a /sync, la app maneja la falla,
        // devolvemos un 503 para que el JS sepa que no hay conexión.
        return new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Stale-While-Revalidate para estáticos
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Ignorar fallos de red silenciosamente
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// BACKGROUND SYNC API
async function backgroundSyncReports() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('necesito-db', 3);
    request.onsuccess = async (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('reports') || !db.objectStoreNames.contains('meta')) return resolve();
      
      const tx = db.transaction(['reports', 'meta'], 'readonly');
      const store = tx.objectStore('reports');
      const metaStore = tx.objectStore('meta');
      
      const metaReq = metaStore.get('volunteer');
      metaReq.onsuccess = async () => {
        const meta = metaReq.result;
        if (!meta || !meta.value) return resolve();
        const volunteer = meta.value;

        const getReq = store.getAll();
        getReq.onsuccess = async () => {
          const reports = getReq.result;
          const pending = reports.filter(r => r.syncStatus === 'pending');
          if (pending.length === 0) return resolve();
          
          const payloads = pending.map(r => ({
            local_id: r.localId,
            volunteer_id: volunteer.volunteerId,
            volunteer_name: volunteer.name,
            phone: volunteer.phone,
            created_at: r.createdAt,
            location: {
               lat: r.location?.latitude || null,
               lng: r.location?.longitude || null,
               label: r.location?.description || null
            },
            needs: Array.from(r.needs || []),
            priority: r.priority,
            people_count: r.peopleCount,
            injured: r.injured,
            trapped: r.trapped,
            children: r.children,
            elderly: r.elderly,
            description: r.description,
            photos: r.photoData ? [{ dataUrl: r.photoData, type: "image/jpeg", name: "foto.jpg", size: r.photoData.length }] : []
          }));

          try {
            const res = await fetch("/api/reports/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reports: payloads }),
            });
            
            if (res.ok) {
              const result = await res.json();
              const syncedIds = new Set((result.synced || []).map(item => item.localId || item.local_id));
              
              const tx2 = db.transaction('reports', 'readwrite');
              const store2 = tx2.objectStore('reports');
              for (const report of pending) {
                if (syncedIds.has(report.localId)) {
                  report.syncStatus = 'synced';
                  const syncedRecord = result.synced.find(i => (i.localId || i.local_id) === report.localId);
                  report.serverId = syncedRecord.serverId || syncedRecord.server_id;
                }
                report.syncAttempts = (report.syncAttempts || 0) + 1;
                report.lastSyncAttempt = new Date().toISOString();
                store2.put(report);
              }
              resolve();
            } else {
              reject(new Error("Sync fetch not ok"));
            }
          } catch(err) {
            reject(err);
          }
        };
      };
    };
    request.onerror = () => reject(request.error);
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    event.waitUntil(backgroundSyncReports());
  }
});

// === PUSH NOTIFICATIONS ===
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'Nueva alerta';
      const options = {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: data.url || '/' },
        vibrate: [200, 100, 200, 100, 200, 100, 200]
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch(e) {
      console.error("Error parsing push data", e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * 环球语堂 · Service Worker
 * 缓存策略：
 * - 静态资源：Cache First（CSS/JS/图片/字体）
 * - HTML 页面：Network First（网络优先，离线回退到缓存）
 * - 数据请求：Stale-While-Revalidate
 */

const CACHE_NAME = 'linguavista-v1';
const STATIC_CACHE = 'linguavista-static-v1';
const RUNTIME_CACHE = 'linguavista-runtime-v1';

// 预缓存资源（App Shell）
const PRECACHE_URLS = [
  './',
  './index.html',
  './flashcards.html',
  './chat.html',
  './profile.html',
  './manifest.json',
  './assets/css/theme.css',
  './assets/css/components.css',
  './assets/css/layout.css',
  './assets/css/animations.css',
  './assets/js/theme.js',
  './assets/js/storage.js',
  './assets/js/srs.js',
  './assets/js/ai-chat.js',
  './assets/js/components.js',
  './assets/js/app.js',
  './assets/img/icon.svg',
];

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] 预缓存静态资源');
        return cache.addAll(
          PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }))
        );
      })
      .then(() => {
        console.log('[SW] 预缓存完成');
        return self.skipWaiting(); // 立即激活
      })
      .catch((err) => {
        console.warn('[SW] 预缓存失败:', err);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith('linguavista-') &&
                name !== STATIC_CACHE &&
                name !== RUNTIME_CACHE
            )
            .map((name) => {
              console.log('[SW] 删除旧缓存:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] 激活完成');
        return self.clients.claim(); // 立即接管所有页面
      })
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 只缓存同源请求
  if (url.origin !== self.location.origin) {
    return; // 跨域请求不处理
  }

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过 API 请求（动态内容）
  if (request.url.includes('/api/')) {
    return;
  }

  // 根据资源类型选择缓存策略
  const ext = getFileExtension(url.pathname);

  if (isHTMLPage(request)) {
    // HTML 页面：Network First
    event.respondWith(networkFirst(request));
  } else if (isStaticAsset(ext)) {
    // 静态资源：Cache First
    event.respondWith(cacheFirst(request));
  } else if (isDataFile(url.pathname)) {
    // JSON 数据文件：Cache First（词汇数据等）
    event.respondWith(cacheFirst(request));
  } else {
    // 其他：Stale-While-Revalidate
    event.respondWith(staleWhileRevalidate(request));
  }
});

// ============================================================
// 缓存策略
// ============================================================

/**
 * Cache First - 缓存优先
 * 适用于：静态资源（CSS/JS/图片）
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => {
        cache.put(request, clone);
      });
    }
    return response;
  } catch (err) {
    // 离线时返回离线页面（如果是页面请求）
    if (request.mode === 'navigate') {
      return caches.match('./index.html');
    }
    throw err;
  }
}

/**
 * Network First - 网络优先
 * 适用于：HTML 页面
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => {
        cache.put(request, clone);
      });
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // 返回离线页面
    return caches.match('./index.html');
  }
}

/**
 * Stale-While-Revalidate - 缓存优先，后台更新
 * 适用于：API 请求、动态内容
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, clone);
        });
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// ============================================================
// 工具函数
// ============================================================

function getFileExtension(pathname) {
  const match = pathname.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

function isHTMLPage(request) {
  return (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.url.endsWith('.html') ||
    request.url.endsWith('/')
  );
}

function isStaticAsset(ext) {
  const staticExts = [
    'css',
    'js',
    'mjs',
    'png',
    'jpg',
    'jpeg',
    'gif',
    'svg',
    'webp',
    'ico',
    'woff',
    'woff2',
    'ttf',
    'eot',
    'mp4',
    'webm',
    'mp3',
    'wav',
    'ogg',
  ];
  return staticExts.includes(ext);
}

function isDataFile(pathname) {
  return pathname.endsWith('.json') && pathname.includes('/data/');
}

// ============================================================
// 消息处理
// ============================================================

self.addEventListener('message', (event) => {
  const { type } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'CLEAR_CACHE':
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
      break;
  }
});

// ============================================================
// 推送通知（预留）
// ============================================================

self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || '新的学习提醒',
      icon: 'assets/img/icon-192.png',
      badge: 'assets/img/icon-192.png',
      tag: data.tag || 'linguavista-notification',
      data: data.data || {},
      vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(data.title || '环球语堂', options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data.url || './index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

console.log('[SW] Service Worker 已加载');

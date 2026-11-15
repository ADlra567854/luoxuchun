// 白驹 ccowork · Service Worker（离线缓存）
/* 2026-11-12：正式图形标已换成「隙」，icon.svg / mark.svg / 全套 PNG 字节都变了。
   CACHE 版本必须 +1，否则 activate 不会淘汰老客户端缓存的旧标与旧 brand-one.*，
   手机端会长期停留在旧 LOGO。预缓存清单同时补上正式主标。 */
const CACHE = 'ai-epoch-v7'
const CORE = [
  './index.html',
  './icon.svg',
  './assets/brand/mark.svg',
  './assets/brand/mark-small.svg',
  './brand-one.css',
  './brand-one.js',
  './manifest.webmanifest',
  './agent.html',
  './website/portal.html',
  './website/reader.html',
  './assets/marked.min.js'
]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// 网络优先，失败回退缓存；AI 接口与动态请求只走网络
self.addEventListener('fetch', (e) => {
  const url = e.request.url
  if (e.request.method !== 'GET') return
  if (url.includes('/api/') || url.includes('/proxy')) return

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  )
})

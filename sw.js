// AI 创作纪元 · Service Worker（离线缓存）
const CACHE = 'ai-epoch-v1'
const CORE = [
  './index.html',
  './icon.svg',
  './manifest.webmanifest',
  './website/agent.html',
  './website/chat.html',
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

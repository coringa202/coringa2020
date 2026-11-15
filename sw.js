// Service worker do Corrida Maluca 3D
// Guarda o jogo no celular para abrir rápido e funcionar sem internet depois da primeira vez.
const CACHE = 'corrida-maluca-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const EXTERNOS = ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(CORE);
    for (const u of EXTERNOS) { try { await c.add(new Request(u, { mode: 'cors' })); } catch (err) {} }
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Páginas do jogo: tenta a internet primeiro (pega atualizações), senão usa a cópia guardada
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      const copia = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copia)); return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  // Demais arquivos (motor 3D, fontes, ícones): usa a cópia guardada, e busca se não tiver
  const guardavel = url.origin === location.origin ||
    url.hostname === 'cdnjs.cloudflare.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';
  if (!guardavel) return;

  e.respondWith(caches.match(req).then(achou => achou || fetch(req).then(r => {
    if (r && (r.ok || r.type === 'opaque')) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
    return r;
  })));
});
